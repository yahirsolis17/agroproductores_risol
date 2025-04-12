# File: backend/gestion_huerta/views/propietarios.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..utils.notification_handler import NotificationHandler
from ..utils.constants import NOTIFICATION_MESSAGES
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR, HTTP_404_NOT_FOUND
from django.shortcuts import get_object_or_404
import logging

from gestion_huerta.models import Propietario
from gestion_huerta.serializers import PropietarioSerializer
from gestion_huerta.utils import registrar_actividad

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def propietario_list(request):
    try:
        propietarios = Propietario.objects.all()
        serializer = PropietarioSerializer(propietarios, many=True)
        return NotificationHandler.generate_response(
            success=True,
            message_key="data_processed_success",
            data={"propietarios": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[propietario_list] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def propietario_create(request):
    try:
        serializer = PropietarioSerializer(data=request.data)
        if serializer.is_valid():
            propietario = serializer.save()
            registrar_actividad(request.user, f"Creó al propietario: {propietario.nombre}")
            return NotificationHandler.generate_response(
                success=True,
                message_key="registration_success",
                data={"propietario": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            success=False,
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[propietario_create] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def propietario_update(request, pk):
    try:
        propietario = get_object_or_404(Propietario, pk=pk)
        serializer = PropietarioSerializer(propietario, data=request.data, partial=True)
        if serializer.is_valid():
            propietario = serializer.save()
            registrar_actividad(request.user, f"Actualizó al propietario: {propietario.nombre}")
            return NotificationHandler.generate_response(
                success=True,
                message_key="update_success",
                data={"propietario": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            success=False,
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[propietario_update] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def propietario_delete(request, pk):
    try:
        propietario = get_object_or_404(Propietario, pk=pk)
        nombre_propietario = propietario.nombre
        propietario.delete()
        registrar_actividad(request.user, f"Eliminó al propietario: {nombre_propietario}")
        return NotificationHandler.generate_response(
            success=True,
            message_key="deletion_success",
            data={"info": f"Propietario '{nombre_propietario}' eliminado."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[propietario_delete] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )
