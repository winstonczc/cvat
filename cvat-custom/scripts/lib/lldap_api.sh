#!/usr/bin/env bash
# Copyright (C) 2024 SMCB drone platform
#
# SPDX-License-Identifier: MIT
#
# LLDAP HTTP / GraphQL 辅助函数库。
#
# 供 cvat-custom/scripts/init-lldap.sh 与 import-smcb-users.sh 通过 source 复用。
# 只依赖 curl + jq，不依赖 python，也不依赖 LDAP 客户端（ldapadd/ldapmodify）。
#
# 为什么走 HTTP/GraphQL 而不是 ldapadd：
#   LLDAP 对标准 LDAP 的“写”操作支持是子集——它没有可写的自定义 OU，也不能用
#   ldapadd 建组/建用户（DN 由 LLDAP 自己按 cn/uid 规则生成，用户密码走 OPAQUE
#   而非 userPassword 属性）。官方推荐的脚本化方式就是 GraphQL：
#     - 登录：POST /auth/simple/login  → {token}
#     - 调用：POST /api/graphql（Bearer token）
#   只有“设置密码”是例外，GraphQL 不支持，需要 LLDAP 自带的 lldap_set_password 工具。
#
# 需要的环境变量：
#   LLDAP_HTTP_URL          默认 http://127.0.0.1:17170
#   LLDAP_ADMIN_USERNAME    默认 admin
#   LLDAP_ADMIN_PASSWORD    必填（除非调用前已 export LLDAP_TOKEN）
#   LLDAP_TOKEN             可选，已登录的 JWT（设置后跳过登录）

# 防止重复 source。
if [[ -n "${_LLDAP_API_SH_LOADED:-}" ]]; then
    return 0
fi
_LLDAP_API_SH_LOADED=1

LLDAP_HTTP_URL="${LLDAP_HTTP_URL:-http://127.0.0.1:17170}"
LLDAP_ADMIN_USERNAME="${LLDAP_ADMIN_USERNAME:-admin}"

# ---- 基础工具检查 -------------------------------------------------------------
# 这两个脚本都依赖 curl（HTTP）与 jq（解析 GraphQL 响应），缺一不可。
lldap_require_tools() {
    local missing=0
    for tool in curl jq; do
        if ! command -v "${tool}" >/dev/null 2>&1; then
            echo "❌ 缺少命令：${tool}。请先安装（macOS: brew install ${tool}；Debian/Ubuntu: apt install ${tool}）。" >&2
            missing=1
        fi
    done
    [[ "${missing}" -eq 0 ]]
}

# ---- 登录：用管理员账号换 JWT --------------------------------------------------
# 注意：口令通过 stdin（heredoc）传给 curl，不出现在 argv / ps 里。
lldap_login() {
    if [[ -n "${LLDAP_TOKEN:-}" ]]; then
        return 0
    fi
    if [[ -z "${LLDAP_ADMIN_PASSWORD:-}" ]]; then
        echo "❌ 未设置 LLDAP_ADMIN_PASSWORD，无法登录 LLDAP。" >&2
        return 1
    fi

    local response
    response="$(curl -fsS -X POST \
        -H 'Content-Type: application/json' \
        --data @- \
        "${LLDAP_HTTP_URL}/auth/simple/login" <<EOF
{"username":"${LLDAP_ADMIN_USERNAME}","password":"${LLDAP_ADMIN_PASSWORD}"}
EOF
    )" || {
        echo "❌ 登录 LLDAP 失败（${LLDAP_HTTP_URL}）。请确认服务已启动、口令正确。" >&2
        return 1
    }

    LLDAP_TOKEN="$(printf '%s' "${response}" | jq -r '.token // empty')"
    if [[ -z "${LLDAP_TOKEN}" ]]; then
        echo "❌ 登录响应里没有 token：${response}" >&2
        return 1
    fi
    export LLDAP_TOKEN
}

# ---- GraphQL 调用 -------------------------------------------------------------
# 用法：lldap_gql '<query/mutation>' '<variables-json>'
# 把响应原样打印到 stdout；HTTP 失败返回非零。
lldap_gql() {
    local query="$1"
    local variables="${2:-{}}"

    # 组装请求体。query/variables 不是敏感数据，走 jq 的 argv 无妨；
    # 真正的请求体仍通过 stdin 交给 curl，避免出现在 curl 的 argv 中。
    local body
    body="$(jq -cn --arg q "${query}" --argjson v "${variables}" '{query:$q,variables:$v}')"

    curl -fsS -X POST \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${LLDAP_TOKEN}" \
        --data @- \
        "${LLDAP_HTTP_URL}/api/graphql" <<EOF
${body}
EOF
}

# 在 GraphQL 响应里检查 errors，有则打印并返回非零。
lldap_check_errors() {
    local response="$1"
    local err
    err="$(printf '%s' "${response}" | jq -r '.errors // empty')"
    if [[ -n "${err}" && "${err}" != "null" ]]; then
        echo "❌ GraphQL 返回错误：$(printf '%s' "${response}" | jq -c '.errors')" >&2
        return 1
    fi
}

# ---- 查询辅助 -----------------------------------------------------------------

# 打印所有组，每行 "id<TAB>displayName"。
lldap_list_groups() {
    local response
    response="$(lldap_gql 'query { groups { id displayName } }')" || return 1
    lldap_check_errors "${response}" || return 1
    printf '%s' "${response}" | jq -r '.data.groups[]? | "\(.id)\t\(.displayName)"'
}

# 按组名取组 id；不存在则返回空且非零。
lldap_group_id() {
    local name="$1" id
    id="$(lldap_list_groups | awk -F'\t' -v n="${name}" '$2==n {print $1; exit}')"
    [[ -n "${id}" ]] && printf '%s' "${id}"
    [[ -n "${id}" ]]
}

# 用户是否存在。
lldap_user_exists() {
    local uid="$1" response
    response="$(lldap_gql \
        'query($id:String!){user(userId:$id){id}}' \
        "$(jq -cn --arg id "${uid}" '{id:$id}')")" || return 1
    # 用户不存在时 LLDAP 返回 errors 或 data.user=null。
    if printf '%s' "${response}" | jq -e '.data.user.id' >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# 用户当前所属组的 id 列表（每行一个）。
lldap_user_group_ids() {
    local uid="$1" response
    response="$(lldap_gql \
        'query($id:String!){user(userId:$id){groups{id}}}' \
        "$(jq -cn --arg id "${uid}" '{id:$id}')")" || return 1
    printf '%s' "${response}" | jq -r '.data.user.groups[]?.id'
}

# ---- 写操作（幂等）------------------------------------------------------------

# 确保组存在（不存在则创建），打印其 id。
lldap_ensure_group() {
    local name="$1" id
    if id="$(lldap_group_id "${name}")" && [[ -n "${id}" ]]; then
        printf '%s' "${id}"
        return 0
    fi
    local response
    response="$(lldap_gql \
        'mutation($n:String!){createGroup(name:$n){id}}' \
        "$(jq -cn --arg n "${name}" '{n:$n}')")" || return 1
    lldap_check_errors "${response}" || return 1
    printf '%s' "${response}" | jq -r '.data.createGroup.id'
}

# 确保用户存在（不存在则创建）。
# 参数：uid email displayName firstName lastName
# 返回：0=已存在或已创建，非零=失败。
lldap_ensure_user() {
    local uid="$1" email="$2" display_name="$3" first_name="$4" last_name="$5"
    if lldap_user_exists "${uid}"; then
        return 0
    fi
    local response
    response="$(lldap_gql \
        'mutation($u:CreateUserInput!){createUser(user:$u){id}}' \
        "$(jq -cn \
            --arg id "${uid}" \
            --arg email "${email}" \
            --arg dn "${display_name}" \
            --arg fn "${first_name}" \
            --arg ln "${last_name}" \
            '{u:{id:$id,email:$email,displayName:$dn,firstName:$fn,lastName:$ln}}')")" || return 1
    lldap_check_errors "${response}" || return 1
    return 0
}

# 确保用户属于某组（已属于则跳过）。
# 参数：uid groupId
lldap_ensure_membership() {
    local uid="$1" gid="$2"
    if lldap_user_group_ids "${uid}" | grep -qx "${gid}"; then
        return 0
    fi
    local response
    response="$(lldap_gql \
        'mutation($u:String!,$g:Int!){addUserToGroup(userId:$u,groupId:$g){ok}}' \
        "$(jq -cn --arg u "${uid}" --argjson g "${gid}" '{u:$u,g:$g}')")" || return 1
    lldap_check_errors "${response}" || return 1
    return 0
}

# ---- 设置密码（GraphQL 不支持，走 LLDAP 自带的 lldap_set_password）------------
#
# 优先使用宿主机上的 lldap_set_password；找不到则通过 `docker exec` 调用 LLDAP
# 容器内 /app/lldap_set_password。
# 口令通过环境变量 LLDAP_USER_PASSWORD 传递（不落 argv）；且 `docker exec -e VAR`
# 用“透传”写法（不带 =值），避免口令出现在 docker 的 argv 里。
lldap_set_password() {
    local uid="$1" password="$2"
    local bin base_url

    if [[ -n "${LLDAP_SET_PASSWORD_PATH:-}" ]]; then
        bin="${LLDAP_SET_PASSWORD_PATH}"
        base_url="${LLDAP_HTTP_URL}"
        LLDAP_USER_PASSWORD="${password}" "${bin}" \
            --base-url "${base_url}" --token "${LLDAP_TOKEN}" --username "${uid}"
        return $?
    fi

    if command -v lldap_set_password >/dev/null 2>&1; then
        LLDAP_USER_PASSWORD="${password}" lldap_set_password \
            --base-url "${LLDAP_HTTP_URL}" --token "${LLDAP_TOKEN}" --username "${uid}"
        return $?
    fi

    if command -v docker >/dev/null 2>&1 \
        && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'lldap'; then
        # 容器内访问自己，用回环地址即可。
        export LLDAP_USER_PASSWORD="${password}"
        docker exec -e LLDAP_USER_PASSWORD lldap \
            /app/lldap_set_password \
            --base-url "http://localhost:17170" --token "${LLDAP_TOKEN}" --username "${uid}"
        local rc=$?
        unset LLDAP_USER_PASSWORD
        return ${rc}
    fi

    echo "⚠️  找不到 lldap_set_password（宿主 PATH、LLDAP_SET_PASSWORD_PATH、lldap 容器都没有），跳过 ${uid} 的密码设置。" >&2
    return 2
}
