from rest_framework.response import Response
from rest_framework import status
from .constants import NOTIFICATION_MESSAGES

class NotificationHandler:
    @staticmethod
    def generate_response(
        message_key: str,
        data=None,
        status_code: int = None,
        extra_data: dict = None
    ):
        notification = NOTIFICATION_MESSAGES.get(message_key, {
            "message": "Operación completada",
            "type": "info"
        })
        
        http_status = status_code or notification.get("code", status.HTTP_200_OK)

        response = {
            "success": http_status < 400,
            "notification": {
                "key": message_key,
                "message": notification["message"],
                "type": notification["type"],
                "action": notification.get("action"),
                "target": notification.get("target"),
            },
            "data": data or {}
        }
        
        if extra_data:
            response.update(extra_data)
        
        return Response(response, status=http_status)
