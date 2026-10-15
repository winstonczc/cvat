#!/usr/bin/env bash
# Copyright (C) 2024 SMCB drone platform
#
# SPDX-License-Identifier: MIT
#
# 生成一个用于**浏览器人工验证** iframe 嵌入的本地测试页。
#
# 背景：免登令牌需要平台私钥签名，纯静态页面签不出来，所以本脚本先用私钥签好一个
# 短期 JWT，把它内联进测试页，再告诉你用哪个地址打开。
#
# 用法：
#   bash cvat-custom/scripts/iframe-test.sh [--username NAME] [--cvat-url URL] [--ttl 秒]
#
# 脚本会打印测试页路径（默认 /tmp/cvat-iframe-test.html），用浏览器打开即可。
#
# 注意令牌是**一次性**的：页面被打开的那一刻令牌就被消费，刷新会 400。所以
# 手动验证时建议给个宽裕的 --ttl（默认 300 秒），够你切几个浏览器。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
GEN_TOKEN="${SCRIPT_DIR}/gen-sso-token.py"

USERNAME="ssotest"
CVAT_URL="http://localhost:7000"
OUT_FILE="/tmp/cvat-iframe-test.html"
# 手动验证用，默认给 5 分钟；生产签发仍是 60 秒，这里放宽只是为了让测试不手忙脚乱。
TTL=300

while [[ $# -gt 0 ]]; do
  case "$1" in
    --username)   USERNAME="$2"; shift 2 ;;
    --username=*) USERNAME="${1#*=}"; shift ;;
    --cvat-url)   CVAT_URL="$2"; shift 2 ;;
    --cvat-url=*) CVAT_URL="${1#*=}"; shift ;;
    --ttl)        TTL="$2"; shift 2 ;;
    --ttl=*)      TTL="${1#*=}"; shift ;;
    --out)        OUT_FILE="$2"; shift 2 ;;
    --out=*)      OUT_FILE="${1#*=}"; shift ;;
    -h|--help)    grep '^# ' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "未知参数：$1" >&2; exit 1 ;;
  esac
done

# ---- 选择可用的签发解释器（与 verify-sso.sh 保持一致的策略）-------------------
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
  echo "❌ 找不到可用的签发解释器：宿主 python3 缺 pyjwt，且本地没有 ${CVAT_IMAGE} 镜像。" >&2
  echo "   请任选其一：pip install \"pyjwt[crypto]\"  或  构建 ${CVAT_IMAGE}" >&2
  exit 1
fi

printf '签发解释器 : %s\n' "${GEN_DESC}"

SSO_URL="$("${GEN_CMD[@]}" --username "${USERNAME}" --cvat-url "${CVAT_URL}" --next / --ttl "${TTL}" 2>/dev/null | tail -n1)"
if [[ -z "${SSO_URL}" ]]; then
  echo "❌ 签发免登 URL 失败" >&2
  exit 1
fi

# 令牌每次打开都会被消费（一次性 jti），因此页面里放的是「本次」的 URL。
# 想再开一次会话，重跑本脚本即可。
cat > "${OUT_FILE}" <<HTML
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>CVAT iframe 嵌入验证</title>
<style>
  html, body { margin: 0; height: 100%; font-family: -apple-system, "PingFang SC", sans-serif; }
  #bar { padding: 8px 12px; background: #1f2937; color: #e5e7eb; font-size: 13px;
         display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  #bar b { color: #fff; }
  #bar .ok  { color: #34d399; }
  #bar .bad { color: #f87171; }
  #frame { width: 100%; height: calc(100% - 40px); border: 0; }
</style>
</head>
<body>
  <div id="bar">
    <span>用户 <b>${USERNAME}</b></span>
    <span>CVAT <b>${CVAT_URL}</b></span>
    <span>iframe 加载：<span id="state">…</span></span>
    <span id="hint"></span>
  </div>
  <iframe id="frame" src="${SSO_URL}"
          allow="clipboard-read; clipboard-write; fullscreen"></iframe>
<script>
  const state = document.getElementById('state');
  const hint  = document.getElementById('hint');
  const frame = document.getElementById('frame');
  const t0 = Date.now();

  frame.addEventListener('load', () => {
    state.textContent = '已触发 load（' + (Date.now() - t0) + 'ms）';
    state.className = 'ok';
    // 同源时可以直接读子文档；跨源会被浏览器拦截，属正常。
    try {
      const doc = frame.contentDocument;
      if (doc && doc.body && doc.body.innerText.trim() === '') {
        hint.textContent = '⚠️ 子文档为空 —— 可能被 X-Frame-Options / CSP 拦截，请检查控制台。';
        hint.className = 'bad';
      }
    } catch (e) {
      hint.textContent = '（跨源，无法读取子文档 —— 属正常，请看画面本身）';
    }
  });

  setTimeout(() => {
    if (state.textContent === '…') {
      state.textContent = '10s 内未触发 load';
      state.className = 'bad';
      hint.textContent = '⚠️ 很可能被拒绝嵌入，请打开 DevTools 控制台查看报错。';
      hint.className = 'bad';
    }
  }, 10000);
</script>
</body>
</html>
HTML

printf '\n✅ 测试页已生成：%s\n' "${OUT_FILE}"
printf '   用浏览器打开它，然后确认：\n'
printf '     1) CVAT 标注界面是否正常显示在页面里（而不是空白/报错）\n'
printf '     2) 右上角是否是 %s 已登录状态（无需再输密码）\n' "${USERNAME}"
printf '     3) 打开 DevTools 控制台，确认没有 Refused to display / frame-ancestors 报错\n'
printf '\n   注意：免登令牌是一次性的，页面刷新后需要重跑本脚本重新生成。\n'
printf '   建议分别用 Chrome（正常 + 无痕）、Safari、Firefox 各验一次。\n'
