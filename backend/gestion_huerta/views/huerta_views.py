# gestion_huerta/views/viewsets.py
# ---------------------------------------------------------------------------
#  ██████╗ ██╗   ██╗██████╗ ███████╗████████╗ █████╗     ██████╗ ██╗   ██╗
#  ██╔══██╗██║   ██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗    ██╔══██╗██║   ██║
#  ██████╔╝██║   ██║██║  ██║█████╗     ██║   ███████║    ██████╔╝██║   ██║
#  ██╔══██╗██║   ██║██║  ██║██╔══╝     ██║   ██╔══██║    ██╔══██╗██║   ██║
#  ██████╔╝╚██████╔╝██████╔╝███████╗   ██║   ██║  ██║    ██████╔╝╚██████╔╝
#  ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝    ╚═════╝  ╚═════╝
#
#  Vista unificada (ModelViewSet) para todo el módulo de huertas.
#  Cada método devuelve el mismo JSON que ya usa tu frontend
#  (NotificationHandler.generate_response), por lo que NO tendrás
#  que cambiar nada en React/Redux.
# ---------------------------------------------------------------------------

import logging
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Modelos
from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada, Cosecha,
    InversionesHuerta, CategoriaInversion, Venta
)

# Serializadores
from gestion_huerta.serializers import (
    PropietarioSerializer, HuertaSerializer, HuertaRentadaSerializer,
    CosechaSerializer, InversionesHuertaSerializer,
    CategoriaInversionSerializer, VentaSerializer
)

# Permisos
from gestion_huerta.permissions import (
    HasHuertaModulePermission, HuertaGranularPermission
)

# Utilidades
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.notification_handler import NotificationHandler

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Paginar 100 → máximo y permitir ?page_size=
# ---------------------------------------------------------------------------
class GenericPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Mix-in que centraliza las respuestas uniformes
# ---------------------------------------------------------------------------
class NotificationMixin:
    """
    Injecta el método notify() para que todos los ViewSets devuelvan el
    mismo formato de respuesta sin repetir código.
    """

    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        """
        Simple wrapper para mantener la compatibilidad con tu
        NotificationHandler.
        """
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )


# ---------------------------------------------------------------------------
#  🏠  PROPIETARIOS
# ---------------------------------------------------------------------------
class PropietarioViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Propietario.objects.all().order_by("nombre")
    serializer_class = PropietarioSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={"propietarios": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        # 1) Validación pura desde el serializer
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # 2) Guardado (si el serializer detectó duplicados en validate_telefono
        #    aquí ya no llega IntegrityError)
        obj = serializer.save()
        registrar_actividad(request.user, f"Creó al propietario: {obj.nombre}")
        return self.notify(
            key="propietario_create_success",
            data={"propietario": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        inst = self.get_object()
        serializer = self.get_serializer(inst, data=request.data, partial=partial)

        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó al propietario: {obj.nombre}")
        return self.notify(
            key="propietario_update_success",
            data={"propietario": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        inst = self.get_object()
        nombre = str(inst)
        inst.delete()
        registrar_actividad(request.user, f"Eliminó al propietario: {nombre}")
        return self.notify(
            key="propietario_delete_success",
            data={"info": f"Propietario '{nombre}' eliminado."},
            status_code=status.HTTP_200_OK,
        )
# ---------------------------------------------------------------------------
#  🌳  HUERTAS PROPIAS
# ---------------------------------------------------------------------------
class HuertaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Huerta.objects.select_related("propietario").order_by("nombre")
    serializer_class = HuertaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={"huertas": serializer.data},
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        # 1) validación pura desde el serializer
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        # 2) guardado
        obj = serializer.save()
        registrar_actividad(request.user, f"Creó la huerta: {obj.nombre}")
        return self.notify(
            key="huerta_create_success",
            data={"huerta": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        inst = self.get_object()
        serializer = self.get_serializer(inst, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la huerta: {obj.nombre}")
        return self.notify(
            key="huerta_update_success",
            data={"huerta": serializer.data},
        )

    def destroy(self, request, *args, **kwargs):
        inst = self.get_object()
        nombre = inst.nombre
        inst.delete()
        registrar_actividad(request.user, f"Eliminó la huerta: {nombre}")
        return self.notify(
            key="huerta_delete_success",
            data={"info": f"Huerta '{nombre}' eliminada."},
        )
# ---------------------------------------------------------------------------
#  🏡  HUERTAS RENTADAS
# ---------------------------------------------------------------------------
class HuertaRentadaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = HuertaRentada.objects.select_related("propietario").order_by("nombre")
    serializer_class = HuertaRentadaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={"huertas_rentadas": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Creó la huerta rentada: {obj.nombre}")
        return self.notify(
            key="huerta_rentada_create_success",
            data={"huerta_rentada": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la huerta rentada: {obj.nombre}")
        return self.notify(
            key="huerta_rentada_update_success",
            data={"huerta_rentada": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la huerta rentada: {nombre}")
        return self.notify(
            key="huerta_rentada_delete_success",
            data={"info": f"Huerta rentada '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
#  🌾  COSECHAS
# ---------------------------------------------------------------------------
class CosechaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Cosecha.objects.select_related("huerta").prefetch_related(
        "inversiones", "ventas"
    ).order_by("-fecha_creacion")
    serializer_class = CosechaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # --- CREATE ---
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data.setdefault("fecha_inicio", timezone.now())
        data["fecha_creacion"] = timezone.now()
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Registró la cosecha: {obj.nombre}")
        return self.notify(
            key="cosecha_create_success",
            data={"cosecha": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    # --- UPDATE ---
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la cosecha: {obj.nombre}")
        return self.notify(
            key="cosecha_update_success",
            data={"cosecha": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    # --- DESTROY ---
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la cosecha: {nombre}")
        return self.notify(
            key="cosecha_delete_success",
            data={"info": f"Cosecha '{nombre}' eliminada con éxito."},
            status_code=status.HTTP_200_OK,
        )

    # --- ACCIÓN EXTRA: TOGGLE ESTADO ---
    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle_estado(self, request, pk=None):
        cosecha = self.get_object()
        cosecha.finalizada = not cosecha.finalizada
        cosecha.fecha_fin = timezone.now() if cosecha.finalizada else None
        cosecha.save()
        estado = "finalizada" if cosecha.finalizada else "en progreso"
        registrar_actividad(
            request.user, f"Marcó la cosecha '{cosecha.nombre}' como {estado}"
        )
        serializer = self.get_serializer(cosecha)
        return self.notify(
            key="toggle_cosecha_success",
            data={"cosecha": serializer.data},
            status_code=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
#  💰  CATEGORÍAS DE INVERSIÓN
# ---------------------------------------------------------------------------
class CategoriaInversionViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = CategoriaInversion.objects.all().order_by("nombre")
    serializer_class = CategoriaInversionSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return self.notify(
            key="data_processed_success",
            data={"categorias": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(
            request.user, f"Creó la categoría de inversión: {obj.nombre}"
        )
        return self.notify(
            key="categoria_inversion_create_success",
            data={"categoria": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(
            request.user, f"Actualizó la categoría de inversión: {obj.nombre}"
        )
        return self.notify(
            key="categoria_inversion_update_success",
            data={"categoria": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre
        instance.delete()
        registrar_actividad(
            request.user, f"Eliminó la categoría de inversión: {nombre}"
        )
        return self.notify(
            key="categoria_inversion_delete_success",
            data={"info": f"Categoría '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
#  🪙  INVERSIONES
# ---------------------------------------------------------------------------
class InversionViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = InversionesHuerta.objects.select_related(
        "categoria", "huerta"
    ).order_by("-fecha")
    serializer_class = InversionesHuertaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # -------- FILTRO POR COSECHA --------
    def get_queryset(self):
        qs = super().get_queryset()
        cosecha_id = self.request.query_params.get("cosecha")
        if cosecha_id:
            qs = qs.filter(cosecha_id=cosecha_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Registró una inversión: {obj.nombre}")
        return self.notify(
            key="inversion_create_success",
            data={"inversion": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la inversión: {obj.nombre}")
        return self.notify(
            key="inversion_update_success",
            data={"inversion": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la inversión: {nombre}")
        return self.notify(
            key="inversion_delete_success",
            data={"info": f"Inversión '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
#  💵  VENTAS
# ---------------------------------------------------------------------------
class VentaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Venta.objects.select_related("cosecha", "huerta").order_by("-fecha_venta")
    serializer_class = VentaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ----- FILTRO POR COSECHA -----
    def get_queryset(self):
        qs = super().get_queryset()
        cosecha_id = self.request.query_params.get("cosecha")
        if cosecha_id:
            qs = qs.filter(cosecha_id=cosecha_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(
            request.user, f"Registró una venta de {obj.num_cajas} cajas"
        )
        return self.notify(
            key="venta_create_success",
            data={"venta": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la venta ID: {obj.id}")
        return self.notify(
            key="venta_update_success",
            data={"venta": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        venta_id = instance.id
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la venta ID: {venta_id}")
        return self.notify(
            key="venta_delete_success",
            data={"info": "Venta eliminada correctamente."},
            status_code=status.HTTP_200_OK,
        )
