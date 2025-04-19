# huerta_views.py

import logging
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.status import (
    HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR
)
from rest_framework.pagination import PageNumberPagination
from django.db import IntegrityError

from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada, Cosecha,
    InversionesHuerta, CategoriaInversion, Venta
)
from gestion_huerta.serializers import (
    PropietarioSerializer, HuertaSerializer, HuertaRentadaSerializer,
    InversionesHuertaSerializer, VentaSerializer,
    CategoriaInversionSerializer, CosechaSerializer
)
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.notification_handler import NotificationHandler

# Permisos
from gestion_huerta.permissions import (
    HasHuertaModulePermission,
    HuertaGranularPermission
)

logger = logging.getLogger(__name__)

# -------------------- PAGINATION HELPER --------------------
class GenericPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# ----------------------------------------------------------------
# PROPIETARIO CRUD
# ----------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def propietario_list(request):
    try:
        propietarios = Propietario.objects.all().order_by('nombre')
        serializer = PropietarioSerializer(propietarios, many=True)
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"propietarios": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[propietario_list] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def propietario_create(request):
    try:
        serializer = PropietarioSerializer(data=request.data)
        if serializer.is_valid():
            propietario = serializer.save()
            registrar_actividad(request.user, f"Creó al propietario: {propietario.nombre}")
            return NotificationHandler.generate_response(
                message_key="propietario_create_success",
                data={"propietario": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except IntegrityError as e:
        logger.error(f"[propietario_create] Error de integridad: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": {"telefono": ["Este teléfono ya está registrado."]}},
            status_code=HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"[propietario_create] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def propietario_update(request, pk):
    try:
        propietario = get_object_or_404(Propietario, pk=pk)
        serializer = PropietarioSerializer(propietario, data=request.data, partial=True)
        if serializer.is_valid():
            propietario = serializer.save()
            registrar_actividad(request.user, f"Actualizó al propietario: {propietario.nombre}")
            return NotificationHandler.generate_response(
                message_key="propietario_update_success",
                data={"propietario": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[propietario_update] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def propietario_delete(request, pk):
    try:
        propietario = get_object_or_404(Propietario, pk=pk)
        nombre_propietario = propietario.nombre
        propietario.delete()
        registrar_actividad(request.user, f"Eliminó al propietario: {nombre_propietario}")
        return NotificationHandler.generate_response(
            message_key="propietario_delete_success",
            data={"info": f"Propietario '{nombre_propietario}' eliminado."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[propietario_delete] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


# ----------------------------------------------------------------
# HUERTA PROPIA CRUD
# ----------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_list(request):
    try:
        huertas = Huerta.objects.all().select_related('propietario').order_by('nombre')
        serializer = HuertaSerializer(huertas, many=True)
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"huertas": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[huerta_list] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_create(request):
    try:
        serializer = HuertaSerializer(data=request.data)
        if serializer.is_valid():
            huerta = serializer.save()
            registrar_actividad(request.user, f"Creó la huerta: {huerta.nombre}")
            return NotificationHandler.generate_response(
                message_key="huerta_create_success",
                data={"huerta": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[huerta_create] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_update(request, pk):
    try:
        huerta = get_object_or_404(Huerta, pk=pk)
        serializer = HuertaSerializer(huerta, data=request.data, partial=True)
        if serializer.is_valid():
            huerta = serializer.save()
            registrar_actividad(request.user, f"Actualizó la huerta: {huerta.nombre}")
            return NotificationHandler.generate_response(
                message_key="huerta_update_success",
                data={"huerta": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[huerta_update] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_delete(request, pk):
    try:
        huerta = get_object_or_404(Huerta, pk=pk)
        nombre = huerta.nombre
        huerta.delete()
        registrar_actividad(request.user, f"Eliminó la huerta: {nombre}")
        return NotificationHandler.generate_response(
            message_key="huerta_delete_success",
            data={"info": f"Huerta '{nombre}' eliminada."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[huerta_delete] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


# ----------------------------------------------------------------
# HUERTA RENTADA CRUD
# ----------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_rentada_list(request):
    try:
        huertas_rentadas = HuertaRentada.objects.all().select_related('propietario').order_by('nombre')
        serializer = HuertaRentadaSerializer(huertas_rentadas, many=True)
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"huertas_rentadas": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[huerta_rentada_list] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_rentada_create(request):
    try:
        serializer = HuertaRentadaSerializer(data=request.data)
        if serializer.is_valid():
            huerta = serializer.save()
            registrar_actividad(request.user, f"Creó la huerta rentada: {huerta.nombre}")
            return NotificationHandler.generate_response(
                message_key="huerta_rentada_create_success",
                data={"huerta_rentada": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[huerta_rentada_create] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_rentada_update(request, pk):
    try:
        huerta = get_object_or_404(HuertaRentada, pk=pk)
        serializer = HuertaRentadaSerializer(huerta, data=request.data, partial=True)
        if serializer.is_valid():
            huerta = serializer.save()
            registrar_actividad(request.user, f"Actualizó la huerta rentada: {huerta.nombre}")
            return NotificationHandler.generate_response(
                message_key="huerta_rentada_update_success",
                data={"huerta_rentada": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[huerta_rentada_update] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def huerta_rentada_delete(request, pk):
    try:
        huerta = get_object_or_404(HuertaRentada, pk=pk)
        nombre = huerta.nombre
        huerta.delete()
        registrar_actividad(request.user, f"Eliminó la huerta rentada: {nombre}")
        return NotificationHandler.generate_response(
            message_key="huerta_rentada_delete_success",
            data={"info": f"Huerta rentada '{nombre}' eliminada."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[huerta_rentada_delete] Error: {str(e)}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


# ----------------------------------------------------------------
# COSECHAS
# ----------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def listar_cosechas_por_huerta(request, huerta_id):
    try:
        huerta = get_object_or_404(Huerta, id=huerta_id)
        cosechas = (
            Cosecha.objects.filter(huerta=huerta)
            .order_by('-fecha_creacion')
            .prefetch_related('inversiones', 'ventas')
        )
        serializer = CosechaSerializer(cosechas, many=True)
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"cosechas": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[listar_cosechas_por_huerta] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def crear_cosecha(request):
    try:
        data = request.data.copy()
        data['fecha_inicio'] = data.get('fecha_inicio') or timezone.now()
        data['fecha_creacion'] = timezone.now()

        serializer = CosechaSerializer(data=data)
        if serializer.is_valid():
            cosecha = serializer.save()
            registrar_actividad(request.user, f"Registró la cosecha: {cosecha.nombre}")
            return NotificationHandler.generate_response(
                message_key="cosecha_create_success",
                data={"cosecha": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[crear_cosecha] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def obtener_cosecha(request, id):
    try:
        cosecha = get_object_or_404(Cosecha, id=id)
        serializer = CosechaSerializer(cosecha)
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"cosecha": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[obtener_cosecha] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_404_NOT_FOUND
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def actualizar_cosecha(request, id):
    try:
        cosecha = get_object_or_404(Cosecha, id=id)
        serializer = CosechaSerializer(cosecha, data=request.data, partial=True)
        if serializer.is_valid():
            cosecha = serializer.save()
            registrar_actividad(request.user, f"Actualizó la cosecha: {cosecha.nombre}")
            return NotificationHandler.generate_response(
                message_key="cosecha_update_success",
                data={"cosecha": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[actualizar_cosecha] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def eliminar_cosecha(request, id):
    try:
        cosecha = get_object_or_404(Cosecha, id=id)
        nombre = cosecha.nombre
        cosecha.delete()
        registrar_actividad(request.user, f"Eliminó la cosecha: {nombre}")
        return NotificationHandler.generate_response(
            message_key="cosecha_delete_success",
            data={"info": f"Cosecha '{nombre}' eliminada con éxito."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[eliminar_cosecha] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def toggle_estado_cosecha(request, id):
    try:
        cosecha = get_object_or_404(Cosecha, id=id)
        cosecha.finalizada = not cosecha.finalizada
        cosecha.fecha_fin = timezone.now() if cosecha.finalizada else None
        cosecha.save()
        registrar_actividad(
            request.user,
            f"Marcó la cosecha '{cosecha.nombre}' como {'finalizada' if cosecha.finalizada else 'en progreso'}"
        )
        serializer = CosechaSerializer(cosecha)
        return NotificationHandler.generate_response(
            message_key="toggle_cosecha_success",
            data={"cosecha": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[toggle_estado_cosecha] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


# ----------------------------------------------------------------
# CATEGORÍAS DE INVERSIÓN
# ----------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def listar_categorias_inversion(request):
    try:
        categorias = CategoriaInversion.objects.all().order_by('nombre')
        serializer = CategoriaInversionSerializer(categorias, many=True)
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"categorias": serializer.data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[listar_categorias_inversion] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def crear_categoria_inversion(request):
    try:
        serializer = CategoriaInversionSerializer(data=request.data)
        if serializer.is_valid():
            categoria = serializer.save()
            registrar_actividad(request.user, f"Creó la categoría de inversión: {categoria.nombre}")
            return NotificationHandler.generate_response(
                message_key="categoria_inversion_create_success",
                data={"categoria": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[crear_categoria_inversion] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def actualizar_categoria_inversion(request, id):
    try:
        categoria = get_object_or_404(CategoriaInversion, id=id)
        serializer = CategoriaInversionSerializer(categoria, data=request.data, partial=True)
        if serializer.is_valid():
            categoria = serializer.save()
            registrar_actividad(request.user, f"Actualizó la categoría de inversión: {categoria.nombre}")
            return NotificationHandler.generate_response(
                message_key="categoria_inversion_update_success",
                data={"categoria": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[actualizar_categoria_inversion] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def eliminar_categoria_inversion(request, id):
    try:
        categoria = get_object_or_404(CategoriaInversion, id=id)
        nombre_categoria = categoria.nombre
        categoria.delete()
        registrar_actividad(request.user, f"Eliminó la categoría de inversión: {nombre_categoria}")
        return NotificationHandler.generate_response(
            message_key="categoria_inversion_delete_success",
            data={"info": f"Categoría '{nombre_categoria}' eliminada."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[eliminar_categoria_inversion] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


# ----------------------------------------------------------------
# INVERSIONES
# ----------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def crear_inversion(request):
    try:
        serializer = InversionesHuertaSerializer(data=request.data)
        if serializer.is_valid():
            inversion = serializer.save()
            registrar_actividad(request.user, f"Registró una inversión: {inversion.nombre}")
            return NotificationHandler.generate_response(
                message_key="inversion_create_success",
                data={"inversion": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[crear_inversion] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def listar_inversiones_por_cosecha(request, cosecha_id):
    try:
        cosecha = get_object_or_404(Cosecha, id=cosecha_id)
        inversiones = (cosecha.inversiones
                       .select_related('categoria', 'huerta')
                       .order_by('fecha'))
        paginator = GenericPagination()
        page = paginator.paginate_queryset(inversiones, request)
        serializer = InversionesHuertaSerializer(page, many=True)
        paginated_data = {
            "count": paginator.page.paginator.count,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
            "results": serializer.data
        }
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"inversiones": paginated_data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[listar_inversiones_por_cosecha] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def actualizar_inversion(request, id):
    try:
        inversion = get_object_or_404(InversionesHuerta, id=id)
        serializer = InversionesHuertaSerializer(inversion, data=request.data, partial=True)
        if serializer.is_valid():
            inversion = serializer.save()
            registrar_actividad(request.user, f"Actualizó la inversión: {inversion.nombre}")
            return NotificationHandler.generate_response(
                message_key="inversion_update_success",
                data={"inversion": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[actualizar_inversion] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def eliminar_inversion(request, id):
    try:
        inversion = get_object_or_404(InversionesHuerta, id=id)
        nombre_inversion = inversion.nombre
        inversion.delete()
        registrar_actividad(request.user, f"Eliminó la inversión: {nombre_inversion}")
        return NotificationHandler.generate_response(
            message_key="inversion_delete_success",
            data={"info": f"Inversión '{nombre_inversion}' eliminada."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[eliminar_inversion] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


# ----------------------------------------------------------------
# VENTAS
# ----------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def listar_ventas_por_cosecha(request, cosecha_id):
    try:
        ventas = Venta.objects.filter(cosecha_id=cosecha_id).order_by('-fecha_venta')
        paginator = GenericPagination()
        page = paginator.paginate_queryset(ventas, request)
        serializer = VentaSerializer(page, many=True)
        paginated_data = {
            "count": paginator.page.paginator.count,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
            "results": serializer.data
        }
        return NotificationHandler.generate_response(
            message_key="data_processed_success",
            data={"ventas": paginated_data},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[listar_ventas_por_cosecha] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def registrar_venta(request):
    try:
        serializer = VentaSerializer(data=request.data)
        if serializer.is_valid():
            venta = serializer.save()
            registrar_actividad(request.user, f"Registró una venta de {venta.num_cajas} cajas")
            return NotificationHandler.generate_response(
                message_key="venta_create_success",
                data={"venta": serializer.data},
                status_code=HTTP_201_CREATED
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[registrar_venta] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def actualizar_venta(request, id):
    try:
        venta = get_object_or_404(Venta, id=id)
        serializer = VentaSerializer(venta, data=request.data, partial=True)
        if serializer.is_valid():
            venta = serializer.save()
            registrar_actividad(request.user, f"Actualizó la venta ID: {venta.id}")
            return NotificationHandler.generate_response(
                message_key="venta_update_success",
                data={"venta": serializer.data},
                status_code=HTTP_200_OK
            )
        return NotificationHandler.generate_response(
            message_key="validation_error",
            data={"errors": serializer.errors},
            status_code=HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[actualizar_venta] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission])
def eliminar_venta(request, id):
    try:
        venta = get_object_or_404(Venta, id=id)
        venta_id = venta.id
        venta.delete()
        registrar_actividad(request.user, f"Eliminó la venta ID: {venta_id}")
        return NotificationHandler.generate_response(
            message_key="venta_delete_success",
            data={"info": "Venta eliminada correctamente."},
            status_code=HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"[eliminar_venta] Error: {e}")
        return NotificationHandler.generate_response(
            message_key="server_error",
            status_code=HTTP_500_INTERNAL_SERVER_ERROR
        )
