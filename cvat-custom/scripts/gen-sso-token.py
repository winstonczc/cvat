#!/usr/bin/env python3
# Copyright (C) 2024 SMCB drone platform
#
# SPDX-License-Identifier: MIT
"""本地开发验证用：签发一个短期平台 SSO JWT，并打印完整的免登 URL。

仅用于本地联调，不要在生产环境使用。脚本用私钥（RS256）签一个短期 token，
claims 严格为：iss、aud、sub、email、name、roles、jti、iat、exp。

依赖 PyJWT（带 crypto 扩展）：
    pip install "pyjwt[crypto]"

用法示例：
    python3 cvat-custom/scripts/gen-sso-token.py -u alice --roles admin,worker
"""

import argparse
import datetime
import pathlib
import sys
import urllib.parse
import uuid

try:
    import jwt
except ImportError:  # pragma: no cover - 仅用于友好的错误提示
    sys.stderr.write(
        '缺少依赖 PyJWT，请先安装：pip install "pyjwt[crypto]"\n'
    )
    sys.exit(2)

# scripts/ 的上一级是 cvat-custom/，再上一级是仓库根。
REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_KEY_PATH = REPO_ROOT / "cvat-custom" / "keys" / "cvat_sso_private.pem"


def parse_args():
    parser = argparse.ArgumentParser(
        description="签发一个本地验证用的平台 SSO JWT，并打印免登 URL。",
    )
    parser.add_argument("--username", "-u", required=True, help="平台用户名，作为 JWT 的 sub")
    parser.add_argument("--roles", default="worker", help="逗号分隔的角色列表，默认 worker")
    parser.add_argument("--email", default=None, help="邮箱，默认 <username>@example.com")
    parser.add_argument("--name", default=None, help="显示名，默认取 username")
    parser.add_argument("--next", dest="next_path", default="/", help="登录后跳转的本地路径，默认 /")
    parser.add_argument(
        "--key",
        default=str(DEFAULT_KEY_PATH),
        help="私钥路径，默认 cvat-custom/keys/cvat_sso_private.pem（相对仓库根解析）",
    )
    parser.add_argument("--issuer", default="http://localhost:3000", help="JWT 签发者 iss")
    parser.add_argument("--audience", default="cvat", help="JWT 受众 aud，默认 cvat")
    parser.add_argument("--ttl", type=int, default=60, help="有效期（秒），默认 60")
    parser.add_argument(
        "--cvat-url",
        default="http://localhost:7000",
        help="CVAT 对外地址，用于拼接免登 URL，默认 http://localhost:7000",
    )
    return parser.parse_args()


def build_claims(args):
    now = datetime.datetime.now(datetime.timezone.utc)
    roles = [r.strip() for r in args.roles.split(",") if r.strip()]
    return {
        "iss": args.issuer,
        "aud": args.audience,
        "sub": args.username,
        "email": args.email or f"{args.username}@example.com",
        "name": args.name or args.username,
        "roles": roles,
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(seconds=args.ttl)).timestamp()),
    }


def main():
    args = parse_args()

    key_path = pathlib.Path(args.key)
    if not key_path.is_absolute():
        key_path = REPO_ROOT / key_path
    if not key_path.is_file():
        sys.stderr.write(
            f"找不到私钥文件：{key_path}\n"
            "请先用 openssl 生成一对密钥（见 cvat-custom/README.md），"
            "或通过 --key 指定路径。\n"
        )
        return 1

    private_key = key_path.read_bytes()
    token = jwt.encode(build_claims(args), private_key, algorithm="RS256")
    if isinstance(token, bytes):  # PyJWT < 2.0 返回 bytes
        token = token.decode("ascii")

    next_encoded = urllib.parse.quote(args.next_path, safe="")
    sso_url = (
        f"{args.cvat_url}/api/auth/platform-sso?token={token}&next={next_encoded}"
    )

    # 提示信息走 stderr，最终 URL 单独走 stdout，方便被脚本捕获。
    sys.stderr.write(
        f"iss={args.issuer} aud={args.audience} sub={args.username} "
        f"ttl={args.ttl}s key={key_path}\n"
    )
    print(sso_url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
