# File: backend/gestion_huerta/views/permisos.py

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..utils.notification_handler import NotificationHandler
from ..utils.constants import NOTIFICATION_MESSAGES
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR, HTTP_404_NOT_FOUND
from django.contrib.auth.models import Permission
import logging

from gestion_huerta.serializers import UserPermissionsSerializer
from gestion_usuarios.models import Users
from gestion_huerta.utils import registrar_actividad

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_permissions(request, user_id):
    try:
        user = get_object_or_404(Users, id=user_id)
        permissions = user.user_permissions.all()
        serializer = UserPermissionsSerializer(permissions, many=True)
        return NotificationHandler.generate_response(
            success=True,
            message_key="data_processed_success",
            data={"permissions": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[list_user_permissions] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_permissions(request):
    try:
        permissions = Permission.objects.all()
        serializer = UserPermissionsSerializer(permissions, many=True)
        return NotificationHandler.generate_response(
            success=True,
            message_key="data_processed_success",
            data={"permissions": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[list_all_permissions] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_permissions(request, user_id):
    try:
        user = get_object_or_404(Users, id=user_id)
        permissions_ids = request.data.get('permissions', [])
        permissions = Permission.objects.filter(id__in=permissions_ids)
        if len(permissions) != len(permissions_ids):
            return NotificationHandler.generate_response(
                success=False,
                message_key="validation_error",
                data={"errors": "Algunos permisos no son válidos."},
                status_code=HTTP_400_BAD_REQUEST
            )
        user.user_permissions.set(permissions)
        registrar_actividad(request.user, f"Actualizó permisos del usuario {user.nombre}")
        return NotificationHandler.generate_response(
            success=True,
            message_key="update_success",
            data={"info": "Permisos actualizados exitosamente."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[update_user_permissions] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )
