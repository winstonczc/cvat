#!/usr/bin/env bash
# Copyright (C) 2024 SMCB drone platform
#
# SPDX-License-Identifier: MIT
#
# 端到端免登（SSO）验证脚本 —— 不需要 UI。
#
# 依次验证：
#   1. cvat_server 容器在运行；
#   2. 生成的免登 URL 返回 302（登录成功、建立会话）；
#   3. 拿会话 cookie 访问 /api/users/self 返回 200 且 username 匹配；
#   4. 重放同一个 URL 返回 400（jti 已被消费，重放防护生效）；
#   5. /api/users/self 响应里没有 X-Frame-Options（或不是 deny），说明已允许 iframe 嵌入。
#
# 用法：
#   bash cvat-custom/scripts/verify-sso.sh [--username NAME] [--cvat-url URL] [--issuer URL]
#
# --issuer 默认取环境变量 PLATFORM_ORIGIN，未设置时为 http://localhost:3000；
# 生产环境必须与 CVAT 的 PLATFORM_ORIGIN / PLATFORM_SSO_ISSUER 一致。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
GEN_TOKEN="${SCRIPT_DIR}/gen-sso-token.py"

USERNAME="ssotest"
CVAT_URL="http://localhost:7000"
ISSUER="${PLATFORM_ORIGIN:-http://localhost:3000}"

RESP_FILE="/tmp/sso_resp.txt"
SELF_FILE="/tmp/sso_self.json"
REPLAY_FILE="/tmp/sso_replay.txt"

FAILURES=0

ok()  { printf '✅ %s\n' "$1"; }
bad() { printf '❌ %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
die() { printf '❌ %s\n' "$1"; exit 1; }

# ---- 解析参数 ----------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --username)  USERNAME="$2"; shift 2 ;;
    --username=*) USERNAME="${1#*=}"; shift ;;
    --cvat-url)  CVAT_URL="$2"; shift 2 ;;
    --cvat-url=*) CVAT_URL="${1#*=}"; shift ;;
    --issuer)    ISSUER="$2"; shift 2 ;;
    --issuer=*)  ISSUER="${1#*=}"; shift ;;
    -h|--help)
      grep '^# ' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "未知参数：$1（可用：--username、--cvat-url、--issuer）" ;;
  esac
done

HAS_JQ=0
command -v jq >/dev/null 2>&1 && HAS_JQ=1

# 宿主机通常没有装 pyjwt。优先用宿主 python3 签发；不可用时自动回退到 cvat/server
# 镜像自带的解释器（镜像里已有 pyjwt[crypto]）。回退模式下仓库以只读方式挂进一个
# 一次性容器，用完即销毁。
CVAT_IMAGE="cvat/server:${CVAT_VERSION:-dev}"
GEN_CMD=()

if python3 -c 'import jwt' >/dev/null 2>&1; then
  GEN_CMD=(python3 "${GEN_TOKEN}")
  GEN_DESC="宿主 python3"
elif docker image inspect "${CVAT_IMAGE}" >/dev/null 2>&1; then
  GEN_CMD=(docker run --rm -v "${REPO_ROOT}:/repo:ro" -w /repo
           --entrypoint /opt/venv/bin/python3 "${CVAT_IMAGE}"
           /repo/cvat-custom/scripts/gen-sso-token.py)
  GEN_DESC="${CVAT_IMAGE}（宿主缺 pyjwt，已自动回退）"
else
  GEN_DESC=""
fi

printf '== 免登（SSO）端到端验证 ==\n'
printf '   仓库根目录 : %s\n' "${REPO_ROOT}"
printf '   CVAT 地址  : %s\n' "${CVAT_URL}"
printf '   测试用户名 : %s\n' "${USERNAME}"
printf '   签发解释器 : %s\n\n' "${GEN_DESC:-<不可用>}"

if [[ ${#GEN_CMD[@]} -eq 0 ]]; then
  die "找不到可用的签发解释器：宿主 python3 缺 pyjwt，且本地没有 ${CVAT_IMAGE} 镜像。
   请任选其一：pip install \"pyjwt[crypto]\"  或  构建 ${CVAT_IMAGE}"
fi

# ---- 步骤 1：容器在运行 -------------------------------------------------------
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'cvat_server'; then
  ok "步骤 1：cvat_server 容器正在运行"
else
  die "步骤 1：找不到正在运行的 cvat_server 容器，请先启动：docker compose -f docker-compose.yml -f cvat-custom/docker-compose.platform.yml up -d"
fi

# ---- 步骤 2：生成免登 URL -----------------------------------------------------
if [[ ! -f "${GEN_TOKEN}" ]]; then
  die "步骤 2：找不到 token 生成脚本：${GEN_TOKEN}"
fi

set +e
SSO_URL="$("${GEN_CMD[@]}" --username "${USERNAME}" --cvat-url "${CVAT_URL}" --issuer "${ISSUER}" 2>/tmp/sso_gen.err | tail -n1)"
GEN_RC=$?
set -e
if [[ ${GEN_RC} -ne 0 || -z "${SSO_URL}" ]]; then
  cat /tmp/sso_gen.err >&2 || true
  die "步骤 2：生成免登 URL 失败（见上方 stderr）"
fi
ok "步骤 2：已生成免登 URL（token 为短期 JWT，不再回显）"

# ---- 步骤 3：请求免登 URL，期望 302 ------------------------------------------
HTTP_CODE="$(curl -s -i -o "${RESP_FILE}" -w '%{http_code}' "${SSO_URL}")"
if [[ "${HTTP_CODE}" == "302" ]]; then
  ok "步骤 3：免登 URL 返回 302（登录成功）"
else
  printf '❌ 步骤 3：期望 302，实际 %s。响应内容：\n' "${HTTP_CODE}"
  cat "${RESP_FILE}"
  printf '\n'
  exit 1
fi

# ---- 步骤 4：提取会话 cookie --------------------------------------------------
SESSION_COOKIE="$(grep -i '^set-cookie:' "${RESP_FILE}" \
  | grep -i 'cvat_sessionid=' \
  | head -n1 \
  | sed -E 's/^[Ss]et-[Cc]ookie:[[:space:]]*//; s/;.*$//' || true)"
if [[ -z "${SESSION_COOKIE}" ]]; then
  printf '❌ 步骤 4：响应里没有 cvat_sessionid 会话 cookie。响应头：\n'
  grep -i '^set-cookie:' "${RESP_FILE}" || true
  exit 1
fi
ok "步骤 4：已取得会话 cookie（cvat_sessionid）"

# ---- 步骤 5：带 cookie 访问 /api/users/self，期望 200 且 username 匹配 --------
SELF_CODE="$(curl -s -o "${SELF_FILE}" -w '%{http_code}' \
  -H "Cookie: ${SESSION_COOKIE}" "${CVAT_URL}/api/users/self")"
if [[ "${SELF_CODE}" != "200" ]]; then
  printf '❌ 步骤 5：期望 /api/users/self 返回 200，实际 %s。响应：\n' "${SELF_CODE}"
  cat "${SELF_FILE}"
  printf '\n'
  exit 1
fi

if [[ "${HAS_JQ}" -eq 1 ]]; then
  SELF_USERNAME="$(jq -r '.username // empty' "${SELF_FILE}" 2>/dev/null || true)"
else
  SELF_USERNAME="$(grep -o '"username"[[:space:]]*:[[:space:]]*"[^"]*"' "${SELF_FILE}" \
    | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)".*/\1/' || true)"
fi

if [[ "${SELF_USERNAME}" == "${USERNAME}" ]]; then
  ok "步骤 5：/api/users/self 返回 200，username=${SELF_USERNAME} 与请求一致"
else
  bad "步骤 5：/api/users/self 返回的 username='${SELF_USERNAME}' 与期望 '${USERNAME}' 不一致"
fi

# ---- 步骤 6：重放同一个 URL，期望 400（jti 已消费）---------------------------
REPLAY_CODE="$(curl -s -o "${REPLAY_FILE}" -w '%{http_code}' "${SSO_URL}")"
if [[ "${REPLAY_CODE}" == "400" ]]; then
  ok "步骤 6：重放同一 URL 返回 400（jti 已被消费，重放防护生效）"
else
  bad "步骤 6：重放同一 URL 期望 400，实际 ${REPLAY_CODE}（重放防护未生效？）"
fi

# ---- 步骤 7：确认没有 X-Frame-Options: deny ---------------------------------
XF_HEADERS="$(curl -s -I "${CVAT_URL}/api/users/self")"
XF_VALUE="$(printf '%s\n' "${XF_HEADERS}" | grep -i '^x-frame-options:' || true)"
if [[ -z "${XF_VALUE}" ]]; then
  ok "步骤 7：响应头里没有 X-Frame-Options（允许 iframe 嵌入）"
elif [[ "${XF_VALUE}" != *deny* ]]; then
  ok "步骤 7：X-Frame-Options 存在但非 deny（${XF_VALUE}），可嵌入"
else
  bad "步骤 7：响应头仍是 '${XF_VALUE}'，iframe 嵌入会被浏览器拦截"
fi

# ---- 结论 ---------------------------------------------------------------------
printf '\n'
if [[ "${FAILURES}" -eq 0 ]]; then
  printf '✅ 结论：全部通过 —— 免登 SSO 可用，且已允许 iframe 嵌入。\n'
  exit 0
else
  printf '❌ 结论：%d 项失败，请检查上方输出。\n' "${FAILURES}"
  exit 1
fi
