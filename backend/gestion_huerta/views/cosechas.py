# File: backend/gestion_huerta/views/cosechas.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR, HTTP_404_NOT_FOUND

from django.shortcuts import get_object_or_404
from django.utils import timezone
import logging
from django.db.models import Sum, F, ExpressionWrapper, Value, DecimalField
from django.db.models.functions import Coalesce
from django.db.models import OuterRef, Subquery

# Importamos los modelos de la nueva app
from gestion_huerta.models import (
    Huerta, Cosecha, CategoriaInversion,
    InversionesHuerta, Venta, HuertaRentada
)
# Importamos los serializadores de la nueva app
from gestion_huerta.serializers import (
    CosechaSerializer, CategoriaInversionSerializer,
    InversionesHuertaSerializer, VentaSerializer
)
# Importamos la utilidad de actividad
from gestion_huerta.utils import registrar_actividad
# IMPORTANTE: Aquí asumimos que NotificationHandler y constantes se han migrado a una carpeta compartida.
from ..utils.notification_handler import NotificationHandler
from ..utils.constants import NOTIFICATION_MESSAGES

logger = logging.getLogger(__name__)

# Paginador personalizado para Cosechas
class CosechaPagination(PageNumberPagination):
    page_size = 3
    page_size_query_param = 'page_size'
    max_page_size = 10

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cosechas_info(request, huerta_id):
    try:
        huerta = None
        huerta_rentada = None

        try:
            huerta = Huerta.objects.get(id=huerta_id)
        except Huerta.DoesNotExist:
            try:
                huerta_rentada = HuertaRentada.objects.get(id=huerta_id)
            except HuertaRentada.DoesNotExist:
                return NotificationHandler.generate_response(
                    success=False,
                    message_key="resource_not_found",
                    data={"errors": "No se encontró ninguna Huerta o HuertaRentada con el ID proporcionado."},
                    status_code=HTTP_404_NOT_FOUND
                )

        year_filter = request.GET.get('year', None)

        if huerta:
            cosechas = huerta.cosechas_huerta.all().order_by('fecha_inicio')
        else:
            cosechas = huerta_rentada.cosechas_rentada.all().order_by('fecha_inicio')

        if year_filter:
            cosechas = cosechas.filter(fecha_inicio__year=year_filter)

        ventas_subquery = Venta.objects.filter(cosecha=OuterRef('pk')).values('cosecha').annotate(
            total_venta=Sum(
                ExpressionWrapper(
                    F('num_cajas') * F('precio_por_caja') - Coalesce(F('gasto'), 0),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
        ).values('total_venta')

        gastos_subquery = InversionesHuerta.objects.filter(cosecha=OuterRef('pk')).values('cosecha').annotate(
            total_gasto=Sum(
                ExpressionWrapper(
                    F('gastos_insumos') + F('gastos_mano_obra'),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
        ).values('total_gasto')

        cosechas = cosechas.annotate(
            ventas_totales=Coalesce(Subquery(ventas_subquery, output_field=DecimalField()), Value(0, output_field=DecimalField())),
            gastos_totales=Coalesce(Subquery(gastos_subquery, output_field=DecimalField()), Value(0, output_field=DecimalField()))
        ).annotate(
            margen_ganancia=ExpressionWrapper(
                F('ventas_totales') - F('gastos_totales'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        )

        paginator = CosechaPagination()
        paginated_cosechas = paginator.paginate_queryset(cosechas, request)
        cosechas_serializer = CosechaSerializer(paginated_cosechas, many=True)

        total_ventas_generales = cosechas.aggregate(total=Sum('ventas_totales'))['total'] or 0
        total_gastos_generales = cosechas.aggregate(total=Sum('gastos_totales'))['total'] or 0
        total_ganancia_general = total_ventas_generales - total_gastos_generales

        response_data = {
            "huerta": {
                "id": huerta.id if huerta else huerta_rentada.id,
                "nombre": huerta.nombre if huerta else huerta_rentada.nombre
            },
            "cosechas_info": paginator.get_paginated_response(cosechas_serializer.data).data,
            "total_ventas_generales": float(total_ventas_generales),
            "total_gastos_generales": float(total_gastos_generales),
            "total_ganancia_general": float(total_ganancia_general),
            "year_filter": year_filter or None
        }

        return NotificationHandler.generate_response(
            success=True,
            message_key="data_processed_success",
            data=response_data,
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[cosechas_info] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            data={"errors": str(e)},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_status_cosecha(request, huerta_id, cosecha_id):
    try:
        huerta = None
        huerta_rentada = None

        try:
            huerta = Huerta.objects.get(id=huerta_id)
        except Huerta.DoesNotExist:
            try:
                huerta_rentada = HuertaRentada.objects.get(id=huerta_id)
            except HuertaRentada.DoesNotExist:
                return NotificationHandler.generate_response(
                    success=False,
                    message_key="resource_not_found",
                    data={"errors": "No se encontró ninguna Huerta o HuertaRentada con el ID proporcionado."},
                    status_code=HTTP_404_NOT_FOUND
                )

        if huerta:
            cosecha = get_object_or_404(Cosecha, id=cosecha_id, huerta=huerta)
        else:
            cosecha = get_object_or_404(Cosecha, id=cosecha_id, huerta_rentada=huerta_rentada)

        cosecha.finalizada = not cosecha.finalizada
        cosecha.fecha_fin = timezone.now() if cosecha.finalizada else None
        cosecha.save()

        serializer = CosechaSerializer(cosecha)
        registrar_actividad(request.user, f"Actualizó el estado de la cosecha: {cosecha.nombre}")

        return NotificationHandler.generate_response(
            success=True,
            message_key="update_success",
            data={"cosecha": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[toggle_status_cosecha] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            data={"errors": str(e)},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_cosechas(request, huerta_id):
    try:
        huerta = get_object_or_404(Huerta, id=huerta_id)
        year_filter = request.GET.get('year', None)

        cosechas = huerta.cosechas_huerta.all()
        if year_filter:
            cosechas = cosechas.filter(fecha_creacion__year=year_filter)

        paginator = PageNumberPagination()
        paginator.page_size = 10
        paginated_cosechas = paginator.paginate_queryset(cosechas, request)
        serializer = CosechaSerializer(paginated_cosechas, many=True)
        return paginator.get_paginated_response(serializer.data)

    except Exception as e:
        logger.error(f"[list_cosechas] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            data={"errors": str(e)},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_cosecha(request, huerta_id):
    try:
        huerta = None
        huerta_rentada = None

        try:
            huerta = Huerta.objects.get(id=huerta_id)
        except Huerta.DoesNotExist:
            try:
                huerta_rentada = HuertaRentada.objects.get(id=huerta_id)
            except HuertaRentada.DoesNotExist:
                return NotificationHandler.generate_response(
                    success=False,
                    message_key="resource_not_found",
                    data={"errors": "No se encontró ninguna Huerta o HuertaRentada con el ID proporcionado."},
                    status_code=HTTP_404_NOT_FOUND
                )

        if huerta:
            cosecha_count = huerta.cosechas_huerta.count()
        else:
            cosecha_count = huerta_rentada.cosechas_rentada.count()

        nombres_ordinales = [
            "Primera Cosecha", "Segunda Cosecha", "Tercera Cosecha",
            "Cuarta Cosecha", "Quinta Cosecha", "Sexta Cosecha",
            "Séptima Cosecha", "Octava Cosecha", "Novena Cosecha", "Décima Cosecha"
        ]
        nombre_cosecha = (
            nombres_ordinales[cosecha_count]
            if cosecha_count < len(nombres_ordinales)
            else f"Cosecha {cosecha_count + 1}"
        )

        if huerta:
            nueva_cosecha = Cosecha.objects.create(
                nombre=nombre_cosecha,
                huerta=huerta,
                fecha_inicio=timezone.now()
            )
            registrar_actividad(request.user, f"Creó la cosecha: {nueva_cosecha.nombre} en la huerta: {huerta.nombre}")
        else:
            nueva_cosecha = Cosecha.objects.create(
                nombre=nombre_cosecha,
                huerta_rentada=huerta_rentada,
                fecha_inicio=timezone.now()
            )
            registrar_actividad(request.user, f"Creó la cosecha: {nueva_cosecha.nombre} en la huerta rentada: {huerta_rentada.nombre}")

        serializer = CosechaSerializer(nueva_cosecha)
        return NotificationHandler.generate_response(
            success=True,
            message_key="registration_success",
            data={"cosecha": serializer.data},
            status_code=HTTP_201_CREATED
        )
    except Exception as e:
        logger.error(f"[create_cosecha] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            data={"errors": str(e)},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def editar_cosecha(request, huerta_id, cosecha_id):
    try:
        huerta = None
        huerta_rentada = None

        try:
            huerta = Huerta.objects.get(id=huerta_id)
        except Huerta.DoesNotExist:
            try:
                huerta_rentada = HuertaRentada.objects.get(id=huerta_id)
            except HuertaRentada.DoesNotExist:
                return NotificationHandler.generate_response(
                    success=False,
                    message_key="resource_not_found",
                    data={"errors": "No se encontró ninguna Huerta o HuertaRentada con el ID proporcionado."},
                    status_code=HTTP_404_NOT_FOUND
                )

        if huerta:
            cosecha = get_object_or_404(Cosecha, id=cosecha_id, huerta=huerta)
        else:
            cosecha = get_object_or_404(Cosecha, id=cosecha_id, huerta_rentada=huerta_rentada)

        serializer = CosechaSerializer(cosecha, data=request.data, partial=True)
        if serializer.is_valid():
            cosecha = serializer.save()
            if huerta:
                registrar_actividad(request.user, f"Actualizó la cosecha: {cosecha.nombre} en la huerta: {huerta.nombre}")
            else:
                registrar_actividad(request.user, f"Actualizó la cosecha: {cosecha.nombre} en la huerta rentada: {huerta_rentada.nombre}")
            return NotificationHandler.generate_response(
                success=True,
                message_key="update_success",
                data={"cosecha": serializer.data},
                status_code=HTTP_200_OK
            )
        else:
            logger.error(f"[editar_cosecha] Errores de validación: {serializer.errors}")
            return NotificationHandler.generate_response(
                success=False,
                message_key="validation_error",
                data={"errors": serializer.errors},
                status_code=HTTP_400_BAD_REQUEST
            )
    except Exception as e:
        logger.error(f"[editar_cosecha] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            data={"errors": str(e)},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_cosecha(request, cosecha_id):
    try:
        cosecha = get_object_or_404(Cosecha, id=cosecha_id)
        nombre_cosecha = cosecha.nombre
        cosecha.delete()
        registrar_actividad(request.user, f"Eliminó la cosecha: {nombre_cosecha}")
        return NotificationHandler.generate_response(
            success=True,
            message_key="deletion_success",
            data={"info": f"Cosecha '{nombre_cosecha}' eliminada exitosamente."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[eliminar_cosecha] Error: {str(e)}")
        return NotificationHandler.generate_response(
            success=False,
            message_key="server_error",
            data={"errors": str(e)},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )
