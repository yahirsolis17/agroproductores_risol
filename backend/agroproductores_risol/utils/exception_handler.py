from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from agroproductores_risol.utils.notification_handler import NOTIFICATION_MESSAGES


CANONICAL_KEYS_BY_STATUS: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "validation_error",
    status.HTTP_401_UNAUTHORIZED: "authentication_required",
    status.HTTP_403_FORBIDDEN: "permission_denied",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_429_TOO_MANY_REQUESTS: "too_many_requests",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "server_error",
}


def _is_canonical_payload(data: Any) -> bool:
    return isinstance(data, dict) and "success" in data and "message_key" in data and "message" in data


def _normalize_errors_payload(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, list):
        return {"non_field_errors": payload}
    if payload in (None, ""):
        return {}
    return {"non_field_errors": [str(payload)]}


def _resolve_message_key(exc: Exception, status_code: int) -> str:
    if isinstance(exc, ValidationError):
        return "validation_error"
    if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return "authentication_required"
    if isinstance(exc, PermissionDenied):
        return "permission_denied"
    if isinstance(exc, NotFound):
        return "not_found"
    if isinstance(exc, Throttled):
        return "too_many_requests"
    return CANONICAL_KEYS_BY_STATUS.get(status_code, "server_error")


def canonical_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if _is_canonical_payload(response.data):
        return response

    status_code = response.status_code
    message_key = _resolve_message_key(exc, status_code)
    notification = NOTIFICATION_MESSAGES.get(message_key, {})
    message = notification.get("message") or "Ha ocurrido un error inesperado al procesar la solicitud."
    errors = _normalize_errors_payload(response.data)

    payload = {
        "success": False,
        "message_key": message_key,
        "message": message,
        "data": {"errors": errors} if errors else {},
        "notification": {
            "key": message_key,
            "message": message,
            "type": notification.get("type", "error"),
            "action": notification.get("action"),
            "target": notification.get("target"),
        },
    }

    return Response(payload, status=status_code)
