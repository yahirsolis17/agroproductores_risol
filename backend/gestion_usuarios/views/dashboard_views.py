from django.core.cache import cache
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from agroproductores_risol.utils.notification_handler import NotificationHandler
from gestion_usuarios.services.dashboard_service import (
    build_dashboard_overview,
    build_dashboard_search,
)
from gestion_usuarios.utils.throttles import PermissionsThrottle

OVERVIEW_CACHE_TTL = 20
SEARCH_CACHE_TTL = 45


def _cache_key(scope: str, user, *parts: object) -> str:
    perm_epoch = cache.get(f"user:{user.id}:perm_epoch") or 1
    base = [
        "dashboard",
        scope,
        str(user.id),
        str(perm_epoch),
        getattr(user, "role", ""),
        str(int(bool(getattr(user, "must_change_password", False)))),
        timezone.localdate().isoformat(),
    ]
    base.extend(str(part) for part in parts if part not in (None, ""))
    return ":".join(base)


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PermissionsThrottle]

    def get(self, request):
        cache_key = _cache_key("overview", request.user)
        payload = cache.get(cache_key)
        if payload is None:
            payload = build_dashboard_overview(request.user)
            cache.set(cache_key, payload, OVERVIEW_CACHE_TTL)
        return NotificationHandler.generate_response(
            message_key="fetch_success",
            data=payload,
        )


class DashboardSearchView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PermissionsThrottle]

    def get(self, request):
        query = (request.query_params.get("q", "") or "").strip().lower()
        cache_key = _cache_key("search", request.user, query)
        payload = cache.get(cache_key)
        if payload is None:
            payload = build_dashboard_search(request.user, query)
            cache.set(cache_key, payload, SEARCH_CACHE_TTL)
        return NotificationHandler.generate_response(
            message_key="fetch_success",
            data=payload,
        )
