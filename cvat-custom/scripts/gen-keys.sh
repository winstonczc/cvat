#!/usr/bin/env bash
#
# 生成平台免密登录用的 RS256 密钥对。
#
# 私钥（cvat_sso_private.pem）属于**平台侧**，用于签发 SSO 令牌，绝不能进入
# CVAT 容器，也绝不能被提交到仓库（cvat-custom/keys/.gitignore 已忽略 *.pem）。
# 公钥（cvat_sso_public.pem）挂载给 CVAT 容器用于验签。
#
# 用法：
#   bash cvat-custom/scripts/gen-keys.sh [输出目录]
#
# 默认输出目录为 <仓库根>/cvat-custom/keys 。已存在密钥时不会覆盖，需先手动删除。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
KEY_DIR="${1:-${REPO_ROOT}/cvat-custom/keys}"

PRIVATE_KEY="${KEY_DIR}/cvat_sso_private.pem"
PUBLIC_KEY="${KEY_DIR}/cvat_sso_public.pem"

if ! command -v openssl >/dev/null 2>&1; then
    echo "❌ 找不到 openssl，请先安装" >&2
    exit 1
fi

mkdir -p "${KEY_DIR}"

if [[ -f "${PRIVATE_KEY}" || -f "${PUBLIC_KEY}" ]]; then
    echo "⚠️  密钥已存在，未做任何修改："
    [[ -f "${PRIVATE_KEY}" ]] && echo "   ${PRIVATE_KEY}"
    [[ -f "${PUBLIC_KEY}" ]] && echo "   ${PUBLIC_KEY}"
    echo "   如需重新生成，请先删除上述文件。"
    exit 0
fi

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "${PRIVATE_KEY}"
openssl rsa -pubout -in "${PRIVATE_KEY}" -out "${PUBLIC_KEY}" 2>/dev/null

chmod 600 "${PRIVATE_KEY}"
chmod 644 "${PUBLIC_KEY}"

echo "✅ 密钥对已生成："
echo "   私钥（平台侧保管，勿外传）: ${PRIVATE_KEY}"
echo "   公钥（挂载给 CVAT 验签）  : ${PUBLIC_KEY}"
