# File: backend/gestion_huerta/views/huertas.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR
from django.shortcuts import get_object_or_404
import logging

from gestion_huerta.models import Huerta, HuertaRentada
from gestion_huerta.serializers import HuertaSerializer, HuertaRentadaSerializer
from gestion_huerta.utils import registrar_actividad
from ..utils.notification_handler import NotificationHandler
from ..utils.constants import NOTIFICATION_MESSAGES

from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR, HTTP_404_NOT_FOUND

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def huerta_list(request):
    try:
        huertas = Huerta.objects.all().order_by('id')
        paginator = PageNumberPagination()
        paginator.page_size = 10
        paginated_huertas = paginator.paginate_queryset(huertas, request)
        serializer = HuertaSerializer(paginated_huertas, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"[huerta_list] Error: {str(e)}")
        return Response({"error": "Error interno al listar huertas."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def huerta_create(request):
    try:
        serializer = HuertaSerializer(data=request.data)
        if serializer.is_valid():
            huerta = serializer.save()
            registrar_actividad(request.user, f"Creó la huerta: {huerta.nombre}")
            return NotificationHandler.generate_response(
                success=True,
                message_key="registration_success",
                data={"huerta": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            success=False,
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[huerta_create] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def huerta_update(request, pk):
    try:
        huerta = get_object_or_404(Huerta, pk=pk)
        serializer = HuertaSerializer(huerta, data=request.data, partial=True)
        if serializer.is_valid():
            huerta = serializer.save()
            registrar_actividad(request.user, f"Actualizó la huerta: {huerta.nombre}")
            return NotificationHandler.generate_response(
                success=True,
                message_key="update_success",
                data={"huerta": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            success=False,
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[huerta_update] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def huerta_delete(request, pk):
    try:
        huerta = get_object_or_404(Huerta, pk=pk)
        nombre = huerta.nombre
        huerta.delete()
        registrar_actividad(request.user, f"Eliminó la huerta: {nombre}")
        return NotificationHandler.generate_response(
            success=True,
            message_key="deletion_success",
            data={"info": f"Huerta '{nombre}' eliminada."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[huerta_delete] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def huertas_general(request, pk=None):
    try:
        if pk:
            try:
                huerta = Huerta.objects.get(pk=pk)
                serializer = HuertaSerializer(huerta)
                return Response(serializer.data, status=HTTP_200_OK)
            except Huerta.DoesNotExist:
                try:
                    huerta_rentada = HuertaRentada.objects.get(pk=pk)
                    serializer = HuertaRentadaSerializer(huerta_rentada)
                    return Response(serializer.data, status=HTTP_200_OK)
                except HuertaRentada.DoesNotExist:
                    return Response({"error": "Huerta no encontrada."}, status=HTTP_404_NOT_FOUND)
        else:
            huertas_propias = Huerta.objects.all()
            huertas_rentadas = HuertaRentada.objects.all()
            huertas_propias_serializer = HuertaSerializer(huertas_propias, many=True)
            huertas_rentadas_serializer = HuertaRentadaSerializer(huertas_rentadas, many=True)
            data = {
                "propias": huertas_propias_serializer.data,
                "rentadas": huertas_rentadas_serializer.data,
            }
            return Response(data, status=HTTP_200_OK)
    except Exception as e:
        logger.error(f"[huertas_general] Error: {str(e)}")
        return Response({"error": "Error interno al procesar la solicitud."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buscar_huertas(request):
    try:
        term = request.GET.get('term', '').strip()
        huertas = Huerta.objects.filter(nombre__icontains=term).order_by('id').values_list('nombre', flat=True)[:10]
        return Response(
            {
                "success": True,
                "message": "Resultados de la búsqueda.",
                "data": list(huertas)
            },
            status=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[buscar_huertas] Error: {str(e)}")
        return Response(
            {
                "success": False,
                "message": "Error interno al buscar huertas.",
                "errors": {"general": "Error en la conexión con el servidor."}
            },
            status=HTTP_500_INTERNAL_SERVER_ERROR
        )
