# Copyright (C) 2024 SMCB drone platform
#
# SPDX-License-Identifier: MIT

"""Passwordless single sign-on for the embedded CVAT deployment.

The SMCB platform embeds CVAT in an iframe and mints a short-lived, platform
signed RS256 JWT. This middleware intercepts ``GET /api/auth/platform-sso``
before URL resolution, verifies the token, upserts the local user, maps the
platform roles onto CVAT groups and finally creates a Django session before
redirecting the browser to the requested page.

It intentionally depends only on ``django.contrib.auth`` and ``django.conf``
so that no CVAT internal module has to be touched.
"""

import logging

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model, login
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.http import HttpResponseBadRequest, HttpResponseForbidden, HttpResponseRedirect

# CVAT swaps in its own user model (AUTH_USER_MODEL = "iam.User"), so the model
# must always be resolved through get_user_model() rather than imported directly.
User = get_user_model()

logger = logging.getLogger(__name__)

# Path handled by this middleware. Exact match, the query string is ignored.
SSO_PATH = "/api/auth/platform-sso"

# Lifetime (seconds) of the anti-replay marker kept for every consumed JWT id.
JTI_CACHE_TIMEOUT = 120

# CVAT's User.first_name / last_name columns are limited to 150 characters.
NAME_MAX_LENGTH = 150

# Roles carried by the platform JWT and the CVAT group each one maps to.
ADMIN_ROLE = "admin"
WORKER_ROLE = "worker"
REVIEWER_ROLE = "reviewer"
DEFAULT_ROLE = "user"


class PlatformSsoMiddleware:
    """Intercept the platform SSO entry point and establish a CVAT session."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "GET" and request.path == SSO_PATH:
            try:
                return self._handle(request)
            except Exception:
                # A broken SSO request must never surface as a 500.
                logger.exception("platform-sso: unexpected failure while handling SSO request")
                return HttpResponseBadRequest("sso failure")

        return self.get_response(request)

    def _handle(self, request):
        """Verify the token, sync the user, open a session and redirect."""
        next_path = self._safe_next(request.GET.get("next", "/"))
        token = request.GET.get("token")

        if not token:
            logger.warning("platform-sso: rejected, missing token")
            return HttpResponseBadRequest("missing token")

        claims = self._decode(token)
        if claims is None:
            return HttpResponseBadRequest("invalid or expired token")

        jti = claims["jti"]
        if self._is_replayed(jti):
            logger.warning("platform-sso: rejected, token already used (jti=%s)", jti)
            return HttpResponseBadRequest("token already used")

        user = self._sync_user(claims)
        if user is None:
            logger.warning("platform-sso: rejected, disabled user (sub=%s)", claims["sub"])
            return HttpResponseForbidden("user is disabled")

        self._apply_roles(user, claims.get("roles") or [])

        login(request, user, backend="django.contrib.auth.backends.ModelBackend")

        logger.info(
            "platform-sso: login ok username=%s jti=%s next=%s",
            user.username,
            jti,
            next_path,
        )
        return HttpResponseRedirect(next_path)

    @staticmethod
    def _safe_next(next_path):
        """Return a local-only redirect target, guarding against open redirects."""
        if not next_path or not next_path.startswith("/"):
            return "/"
        if next_path.startswith("//") or "\\" in next_path:
            return "/"
        return next_path

    @staticmethod
    def _decode(token):
        """Verify the JWT signature and claims; return claims or ``None``."""
        try:
            with open(settings.PLATFORM_SSO_PUBLIC_KEY_PATH, "rb") as key_file:
                public_key = key_file.read()
        except OSError:
            logger.exception("platform-sso: cannot read the public key file")
            return None

        try:
            return jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=settings.PLATFORM_SSO_AUDIENCE,
                issuer=settings.PLATFORM_SSO_ISSUER,
                options={"require": ["exp", "iat", "sub", "jti"]},
            )
        except jwt.PyJWTError as exc:
            logger.warning("platform-sso: token verification failed: %s", exc)
            return None

    @staticmethod
    def _is_replayed(jti):
        """Consume the token id once; fail open if the cache is unavailable."""
        try:
            return not cache.add(f"sso:jti:{jti}", 1, timeout=JTI_CACHE_TIMEOUT)
        except Exception:
            logger.warning(
                "platform-sso: cache unavailable, skipping replay check (jti=%s)", jti
            )
            return False

    @staticmethod
    def _sync_user(claims):
        """Upsert the local user from the token claims; ``None`` if disabled."""
        username = claims["sub"]
        defaults = {"email": claims.get("email", "")}
        # CVAT's User model records how the account was first established.
        if any(f.name == "created_via" for f in User._meta.get_fields()):
            defaults["created_via"] = "sso"

        user, _ = User.objects.get_or_create(username=username, defaults=defaults)

        if not user.is_active:
            return None

        if claims.get("email"):
            user.email = claims["email"]
        if claims.get("name"):
            user.first_name = str(claims["name"])[:NAME_MAX_LENGTH]
        last_name = claims.get("family_name") or claims.get("last_name")
        if last_name:
            user.last_name = str(last_name)[:NAME_MAX_LENGTH]

        user.save()
        return user

    @staticmethod
    def _apply_roles(user, roles):
        """Map the platform roles onto CVAT groups and admin flags."""
        if ADMIN_ROLE in roles:
            user.is_staff = user.is_superuser = True
            group_names = [ADMIN_ROLE]
        elif WORKER_ROLE in roles or REVIEWER_ROLE in roles:
            group_names = [WORKER_ROLE]
        else:
            group_names = [DEFAULT_ROLE]

        # A user demoted on the platform side must not keep superuser rights.
        if user.is_superuser and ADMIN_ROLE not in roles:
            user.is_staff = user.is_superuser = False

        user.save()

        groups = [Group.objects.get_or_create(name=name)[0] for name in group_names]
        user.groups.set(groups)
