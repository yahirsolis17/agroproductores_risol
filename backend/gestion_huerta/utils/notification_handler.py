# backend/utilsn/notification_handler.py

from rest_framework.response import Response
from rest_framework import status
from .constants import NOTIFICATION_MESSAGES

class NotificationHandler:
    @staticmethod
    def generate_response(success: bool, message_key: str, data=None, status_code: int = 200):
        """
        Genera una respuesta estándar en formato JSON para notificaciones.
        
        :param success: True si la operación fue exitosa, False en caso contrario.
        :param message_key: Clave del mensaje en NOTIFICATION_MESSAGES.
        :param data: Información adicional a incluir (opcional).
        :param status_code: Código HTTP de la respuesta.
        :return: Response de DRF.
        """
        message = NOTIFICATION_MESSAGES.get(message_key, "Operación realizada.")
        response = {
            "success": success,
            "message": message,
            "message_key": message_key,
            "data": data or {},
        }
        return Response(response, status=status_code)
