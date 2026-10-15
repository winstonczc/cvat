#!/usr/bin/env bash
# Copyright (C) 2024 SMCB drone platform
#
# SPDX-License-Identifier: MIT
#
# LLDAP 一次性初始化脚本（P1-2）。
#
# 职责（对齐设计方案 v1.2 §8：职责缩减后只有服务账号与管理员组，不导入普通用户）：
#   1. 确保仓库根 .env 中存在强随机的 LLDAP_ADMIN_PASSWORD / LLDAP_JWT_SECRET /
#      LLDAP_BIND_PASSWORD / LLDAP_SVC_SMCB_PASSWORD（缺什么补什么，绝不覆盖已有值；
#      admin 从第一次启动起就是强随机口令，不存在“默认口令 password”的时间窗）。
#   2. 确保 lldap 容器已启动（未启动则按四文件 compose 拉起）。
#   3. 等待 LLDAP 就绪并用 .env 中的 admin 口令登录（登录成功即证明 admin 口令与
#      .env 一致；若不一致会明确报错并给出处置办法，不静默跳过）。
#   4. 幂等创建组：admins / annotators / reviewers（对应 settings.py 的
#      DJANGO_AUTH_LDAP_GROUPS 映射）。
#   5. 幂等创建服务账号：
#      - svc-smcb：平台服务账号（调 CVAT API 用），加入 admins 组；
#      - svc-bind：LDAP 只读绑定账号（settings.py 的 AUTH_LDAP_BIND_DN 默认值），
#        加入 LLDAP 内置的 lldap_strict_readonly 组。
#      两者口令都来自 .env（svc-bind → LLDAP_BIND_PASSWORD；svc-smcb →
#      LLDAP_SVC_SMCB_PASSWORD），重复执行会重置为 .env 中的值，保证可恢复。
#
# 用法（在仓库根或任意目录执行均可）：
#   bash cvat-custom/scripts/init-lldap.sh
#
# ⚠️ 所有口令只写入仓库根的 .env（已被根 .gitignore 的 `/.*env*` 规则忽略），
#    本脚本不回显任何口令，也不把口令写进任何 git 跟踪的文件。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

# shellcheck source=lib/lldap_api.sh
source "${SCRIPT_DIR}/lib/lldap_api.sh"

cd "${REPO_ROOT}"

COMPOSE_CMD=(
    docker compose
    -f docker-compose.yml
    -f docker-compose.override.yml
    -f cvat-custom/docker-compose.platform.yml
    -f cvat-custom/ldap/docker-compose.lldap.yml
)

echo "== LLDAP 初始化 =="
echo "   仓库根 : ${REPO_ROOT}"
echo "   .env   : ${ENV_FILE}"

# 依赖检查（jq 缺失时自动生成 python3 兜底 shim）
lldap_require_tools

# ---- .env 读写辅助 -------------------------------------------------------------

get_env_value() {
    # 取 .env 中某个 KEY 的值（取最后一次出现的行，与 compose 的行为一致）。
    # 找不到时输出空且返回 0（不能非零，否则 set -e 会在赋值处静默退出）。
    { grep -E "^$1=" "${ENV_FILE}" 2>/dev/null || true; } | tail -n 1 | cut -d= -f2-
}

set_env_value() {
    # 写入/替换 .env 中的 KEY=VALUE。
    local key="$1" value="$2" tmp
    if grep -qE "^${key}=" "${ENV_FILE}" 2>/dev/null; then
        tmp="$(mktemp)"
        sed "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}" > "${tmp}"
        mv "${tmp}" "${ENV_FILE}"
    else
        printf '%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
    fi
}

ensure_secret() {
    # 若 .env 中该 KEY 缺失或为空，则生成 32 位强随机口令并写入。
    local key="$1" current
    current="$(get_env_value "${key}")"
    if [[ -z "${current}" ]]; then
        # 用 openssl 生成（不用 tr|head：pipefail 下 tr 会吃到 SIGPIPE 让脚本静默退出）
        local value
        value="$(openssl rand -hex 16)"
        set_env_value "${key}" "${value}"
        echo "✅ 已生成 ${key}（强随机，写入 .env，不回显）"
    else
        echo "   ${key} 已存在，保持不变"
    fi
}

# ---- 步骤 1：准备 .env 中的密钥 -------------------------------------------------

echo
echo "— 步骤 1：检查 .env 中的 LLDAP 密钥 —"
[[ -f "${ENV_FILE}" ]] || : > "${ENV_FILE}"
ensure_secret LLDAP_ADMIN_PASSWORD     # LLDAP admin（Web UI / GraphQL 管理）
ensure_secret LLDAP_JWT_SECRET         # LLDAP 会话 JWT 签名密钥
ensure_secret LLDAP_BIND_PASSWORD      # svc-bind 只读绑定账号口令（CVAT 用）
ensure_secret LLDAP_SVC_SMCB_PASSWORD  # svc-smcb 平台服务账号口令（SMCB 后端用）

export LLDAP_ADMIN_USERNAME="${LLDAP_ADMIN_USERNAME:-admin}"
export LLDAP_ADMIN_PASSWORD="$(get_env_value LLDAP_ADMIN_PASSWORD)"
export LLDAP_HTTP_URL="${LLDAP_HTTP_URL:-http://127.0.0.1:17170}"
LLDAP_BASE_DN="$(get_env_value LLDAP_BASE_DN)"
export LLDAP_BASE_DN="${LLDAP_BASE_DN:-dc=drone-platform,dc=com}"

# ---- 步骤 2：确保 lldap 容器在运行 ----------------------------------------------

echo
echo "— 步骤 2：启动 lldap 容器 —"
if docker ps --format '{{.Names}}' | grep -qx 'lldap'; then
    echo "   lldap 已在运行，跳过启动"
else
    "${COMPOSE_CMD[@]}" up -d lldap
fi

# ---- 步骤 3：等待就绪并登录（同时验证 admin 口令）--------------------------------

echo
echo "— 步骤 3：等待 LLDAP 就绪并用 admin 登录 —"
attempts=0
until lldap_login 2>/dev/null; do
    attempts=$((attempts + 1))
    if [[ "${attempts}" -ge 30 ]]; then
        cat >&2 <<'EOF'
❌ 60 秒内无法用 .env 中的 LLDAP_ADMIN_PASSWORD 登录 LLDAP。
   可能原因：
   a) lldap_data 卷里已有旧数据，旧 admin 口令与 .env 不一致
      —— 处置：把旧口令填回 .env 的 LLDAP_ADMIN_PASSWORD 后重跑本脚本；
              或确认数据可丢弃后 `docker volume rm cvat_lldap_data` 再重跑。
   b) LLDAP 尚未完成初始化 —— 查看日志：docker logs lldap
EOF
        exit 1
    fi
    sleep 2
done
echo "✅ admin 登录成功（口令与 .env 一致，无默认口令时间窗）"

# ---- 步骤 4：创建组（幂等）------------------------------------------------------

echo
echo "— 步骤 4：创建组 admins / annotators / reviewers —"
GID_ADMINS="$(lldap_ensure_group admins)"
echo "✅ 组 admins（id=${GID_ADMINS}）"
GID_ANNOTATORS="$(lldap_ensure_group annotators)"
echo "✅ 组 annotators（id=${GID_ANNOTATORS}）"
GID_REVIEWERS="$(lldap_ensure_group reviewers)"
echo "✅ 组 reviewers（id=${GID_REVIEWERS}）"
# LLDAP 内置只读组（v0.6 起内置：lldap_admin / lldap_password_manager / lldap_strict_readonly）。
GID_STRICT_RO="$(lldap_group_id lldap_strict_readonly)" || {
    echo "❌ 找不到 LLDAP 内置组 lldap_strict_readonly，请确认 LLDAP 版本 ≥ v0.6。" >&2
    exit 1
}
echo "   内置组 lldap_strict_readonly（id=${GID_STRICT_RO}）"

# ---- 步骤 5：创建服务账号（幂等）------------------------------------------------

echo
echo "— 步骤 5：创建服务账号 svc-smcb / svc-bind —"

lldap_ensure_user svc-smcb "svc-smcb@drone-platform.com" "SMCB Service Account" "SMCB" "Service"
lldap_set_password svc-smcb "$(get_env_value LLDAP_SVC_SMCB_PASSWORD)" >/dev/null
lldap_ensure_membership svc-smcb "${GID_ADMINS}"
echo "✅ svc-smcb（admins 组；口令=.env 的 LLDAP_SVC_SMCB_PASSWORD）"

lldap_ensure_user svc-bind "svc-bind@drone-platform.com" "CVAT LDAP Bind" "LDAP" "Bind"
lldap_set_password svc-bind "$(get_env_value LLDAP_BIND_PASSWORD)" >/dev/null
lldap_ensure_membership svc-bind "${GID_STRICT_RO}"
echo "✅ svc-bind（lldap_strict_readonly 组；口令=.env 的 LLDAP_BIND_PASSWORD）"

# ---- 汇总 ----------------------------------------------------------------------

echo
echo "== 初始化完成 =="
echo "   BASE_DN        : ${LLDAP_BASE_DN}"
echo "   绑定 DN（CVAT）: uid=svc-bind,ou=people,${LLDAP_BASE_DN}"
echo "   组             : admins / annotators / reviewers（+ 内置 lldap_strict_readonly）"
echo "   账号           : svc-smcb（admins）、svc-bind（strict_readonly）"
echo "   Web UI         : ${LLDAP_HTTP_URL}（admin 登录，口令见 .env）"
echo "   下一步         : 在 .env 设置 LLDAP_URI=ldap://lldap:3890 后重启 cvat_server"
