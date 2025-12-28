from rest_framework.response import Response
from rest_framework import status
from .constants import NOTIFICATION_MESSAGES


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
