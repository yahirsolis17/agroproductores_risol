from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from gestion_bodega.utils.constants import NOTIFICATION_MESSAGES as BODEGA_MESSAGES
from gestion_huerta.utils.constants import NOTIFICATION_MESSAGES as HUERTA_MESSAGES
from gestion_usuarios.utils.constants import NOTIFICATION_MESSAGES as USUARIOS_MESSAGES

# Registro unificado de mensajes para mantener un solo NotificationHandler.
NOTIFICATION_MESSAGES = {
    **BODEGA_MESSAGES,
    **HUERTA_MESSAGES,
    **USUARIOS_MESSAGES,
}


class NotificationHandler:
    @staticmethod
    def generate_response(
        message_key: str,
        data=None,
        status_code: int | None = None,
        extra_data: dict | None = None,
    ):
        """
        Envelope canónico con compatibilidad temporal:
        - success
        - message_key
        - message
        - data
        - notification (deprecated, se mantendrá mientras el FE migra)
        """
        notification = NOTIFICATION_MESSAGES.get(
            message_key,
            {
                "message": "Operación completada",
                "type": "info",
            },
        )

        http_status = status_code or notification.get("code", status.HTTP_200_OK)
        message = notification.get("message", "")

        response = {
            "success": http_status < 400,
            "message_key": message_key,
            "message": message,
            "data": data or {},
            # Compat temporal mientras el FE deja de depender de notification.
            "notification": {
                "key": message_key,
                "message": message,
                "type": notification.get("type"),
                "action": notification.get("action"),
                "target": notification.get("target"),
            },
        }

        if extra_data:
            response.update(extra_data)

        return Response(response, status=http_status)


__all__ = ["NotificationHandler"]
