# File: backend/gestion_huerta/views/informes.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR, HTTP_404_NOT_FOUND

from django.shortcuts import get_object_or_404
import logging

from gestion_huerta.models import InformeProduccion, InversionesHuerta
from gestion_huerta.serializers import InformeProduccionSerializer, InversionesHuertaSerializer
from gestion_huerta.utils import registrar_actividad
from ..utils.notification_handler import NotificationHandler
from ..utils.constants import NOTIFICATION_MESSAGES

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def informeproduccion_list(request):
    try:
        informes = InformeProduccion.objects.all()
        serializer = InformeProduccionSerializer(informes, many=True)
        return NotificationHandler.generate_response(
            success=True,
            message_key="data_processed_success",
            data={"informes": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[informeproduccion_list] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def informeproduccion_create(request):
    try:
        serializer = InformeProduccionSerializer(data=request.data)
        if serializer.is_valid():
            informe = serializer.save()
            informe.recalcular_gastos()
            registrar_actividad(request.user, f"Creó el informe de producción para huerta ID: {informe.huerta.id}")
            return NotificationHandler.generate_response(
                success=True,
                message_key="registration_success",
                data={"informe": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            success=False,
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[informeproduccion_create] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def informeproduccion_detalle(request, pk):
    try:
        informe = get_object_or_404(InformeProduccion, pk=pk)
        inversiones_huerta = InversionesHuerta.objects.filter(
            huerta=informe.huerta,
            fecha__lte=informe.fecha
        )
        inversiones_serializer = InversionesHuertaSerializer(inversiones_huerta, many=True)
        return NotificationHandler.generate_response(
            success=True,
            message_key="data_processed_success",
            data={
                "informe": InformeProduccionSerializer(informe).data,
                "inversiones_huerta": inversiones_serializer.data
            },
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[informeproduccion_detalle] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def informeproduccion_update(request, pk):
    try:
        informe = get_object_or_404(InformeProduccion, pk=pk)
        serializer = InformeProduccionSerializer(informe, data=request.data, partial=True)
        if serializer.is_valid():
            informe = serializer.save()
            if informe.estado == 'finalizado':
                informe.bloqueado = True
                informe.save()
            registrar_actividad(request.user, f"Actualizó el informe de producción: {informe.id}")
            return NotificationHandler.generate_response(
                success=True,
                message_key="update_success",
                data={"informe": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            success=False,
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[informeproduccion_update] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def informeproduccion_delete(request, pk):
    try:
        informe = get_object_or_404(InformeProduccion, pk=pk)
        informe_id = informe.id
        informe.delete()
        registrar_actividad(request.user, f"Eliminó el informe de producción: {informe_id}")
        return NotificationHandler.generate_response(
            success=True,
            message_key="deletion_success",
            data={"info": f"Informe de producción {informe_id} eliminado."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[informeproduccion_delete] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )
