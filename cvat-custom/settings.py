# Copyright (C) 2024 SMCB drone platform
#
# SPDX-License-Identifier: MIT

"""CVAT settings overlay for the SMCB platform integration.

Loaded instead of the stock ``settings`` module (``DJANGO_SETTINGS_MODULE``).
It inherits the production configuration and adds everything needed to embed
CVAT in the platform: iframe framing, cross-origin/CSRF trust, isolated cookie
names and the passwordless SSO middleware.
"""

import os

from cvat.settings.production import *  # pylint: disable=wildcard-import

# ---------- 平台集成：平台侧 origin ----------
PLATFORM_ORIGIN = os.environ.get("PLATFORM_ORIGIN", "http://localhost:5173")
CVAT_ORIGIN = os.environ.get("CVAT_ORIGIN", "http://localhost:7000")

# ---------- 允许 iframe 嵌入 ----------
# 这个 Django 版本的 XFrameOptionsMiddleware 不支持 "ALLOWALL" 哨兵值：它会把
# settings.X_FRAME_OPTIONS 直接大写后写进响应头（见 django/middleware/clickjacking.py
# 的 get_xframe_options_value），所以设成 "ALLOWALL" 反而会发出
# `X-Frame-Options: ALLOWALL` 这种非法值。唯一干净的做法是把中间件整个摘掉，
# 改由 nginx 下发 CSP frame-ancestors 精确控制允许的父级来源。
# 注意：CVAT 的 nginx 在 $upstream_http_x_frame_options 为空时会兜底补 deny，
# 因此 cvat-custom/nginx.conf 也必须同步修改（已包含在本定制中）。
MIDDLEWARE = [
    m for m in MIDDLEWARE
    if m != "django.middleware.clickjacking.XFrameOptionsMiddleware"
]

# ---------- 跨域 / CSRF ----------
CSRF_TRUSTED_ORIGINS = [o for o in {PLATFORM_ORIGIN, CVAT_ORIGIN} if o]
CORS_ORIGIN_WHITELIST = [PLATFORM_ORIGIN]  # django-cors-headers==3.5.0 用旧名，不要写成 CORS_ALLOWED_ORIGINS
CORS_ALLOW_CREDENTIALS = True

# ---------- Cookie（与平台隔离，避免重名）----------
SESSION_COOKIE_NAME = "cvat_sessionid"
CSRF_COOKIE_NAME = "cvat_csrftoken"
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
_cookie_domain = os.environ.get("COOKIE_DOMAIN")
if _cookie_domain:
    SESSION_COOKIE_DOMAIN = _cookie_domain
    CSRF_COOKIE_DOMAIN = _cookie_domain

# ---------- 免登 SSO ----------
MIDDLEWARE = MIDDLEWARE + ["platform_sso.middleware.PlatformSsoMiddleware"]
PLATFORM_SSO_PUBLIC_KEY_PATH = os.environ.get(
    "PLATFORM_SSO_PUBLIC_KEY_PATH", "/opt/cvat/keys/cvat_sso_public.pem"
)
PLATFORM_SSO_ISSUER = os.environ.get("PLATFORM_SSO_ISSUER", PLATFORM_ORIGIN)
PLATFORM_SSO_AUDIENCE = os.environ.get("PLATFORM_SSO_AUDIENCE", "cvat")

# ---------- LDAP（仅当配置了 LLDAP_URI 才启用，否则保持 BASIC，便于无 LLDAP 时本地验证 SSO）----------
if os.environ.get("LLDAP_URI"):
    import ldap
    from django_auth_ldap.config import GroupOfNamesType, LDAPSearch

    _BASE_DN = os.environ.get("LLDAP_BASE_DN", "dc=drone-platform,dc=com")

    IAM_TYPE = "LDAP"
    AUTHENTICATION_BACKENDS += ["django_auth_ldap.backend.LDAPBackend"]

    AUTH_LDAP_SERVER_URI = os.environ["LLDAP_URI"]
    ldap.set_option(ldap.OPT_REFERRALS, 0)
    AUTH_LDAP_BIND_DN = os.environ.get("LLDAP_BIND_DN", f"uid=admin,ou=people,{_BASE_DN}")
    AUTH_LDAP_BIND_PASSWORD = os.environ["LLDAP_ADMIN_PASSWORD"]  # 必须读环境变量，不能写成 "${VAR}" 字面量
    AUTH_LDAP_USER_SEARCH = LDAPSearch(
        f"ou=people,{_BASE_DN}", ldap.SCOPE_SUBTREE, "(uid=%(user)s)"
    )
    AUTH_LDAP_GROUP_SEARCH = LDAPSearch(
        f"ou=groups,{_BASE_DN}", ldap.SCOPE_SUBTREE, "(objectClass=groupOfNames)"
    )
    AUTH_LDAP_GROUP_TYPE = GroupOfNamesType()
    AUTH_LDAP_USER_ATTR_MAP = {
        "user_name": "uid",
        "first_name": "givenName",
        "last_name": "sn",
        "email": "mail",
    }
    # CVAT 只读这一个设置（cvat/apps/iam/signals.py:51）
    DJANGO_AUTH_LDAP_GROUPS = {
        "admin": [f"cn=admins,ou=groups,{_BASE_DN}"],
        "worker": [
            f"cn=annotators,ou=groups,{_BASE_DN}",
            f"cn=reviewers,ou=groups,{_BASE_DN}",
        ],
        "user": [],
    }
