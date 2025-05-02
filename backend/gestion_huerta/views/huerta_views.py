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
# ---------------------------------------------------------------------------# gestion_huerta/views/huerta_views.py
# gestion_huerta/views/huerta_views.py  ── solo la clase PropietarioViewSet
# ---------------------------------------------------------------------------
#  🏠  PROPIETARIOS
# ---------------------------------------------------------------------------
class PropietarioViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset           = Propietario.objects.all().order_by("nombre")
    serializer_class   = PropietarioSerializer
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ---------- LIST ----------
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={"propietarios": serializer.data},
        )

    # ---------- CREATE ----------
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        obj = serializer.save()
        registrar_actividad(request.user, f"Creó al propietario: {obj.nombre}")
        return self.notify(
            key="propietario_create_success",
            data={"propietario": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------- UPDATE ----------
    def update(self, request, *args, **kwargs):
        partial    = kwargs.pop("partial", False)
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
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
        )

    # ---------- DELETE ----------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # 🚫 Bloqueo duro: aún tiene huertas vinculadas
        if instance.huertas.exists():
            return self.notify(
                key="propietario_con_dependencias",
                data={"info": "No se puede eliminar un propietario con huertas registradas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        nombre = str(instance)
        instance.delete()
        registrar_actividad(request.user, f"Eliminó al propietario: {nombre}")
        return self.notify(
            key="propietario_delete_success",
            data={"info": f"Propietario '{nombre}' eliminado."},
        )

    # ---------- ARCHIVAR ----------
    @action(detail=True, methods=["patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        propietario = self.get_object()

        if propietario.archivado_en:
            return self.notify(
                key="propietario_ya_archivado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        propietario.archivar()
        registrar_actividad(request.user, f"Archivó al propietario: {propietario.nombre}")
        return self.notify(
            key="propietario_archivado",
            data={"propietario": self.get_serializer(propietario).data},
        )

    # ---------- RESTAURAR ----------
    @action(detail=True, methods=["patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        propietario = self.get_object()

        if propietario.is_active:
            return self.notify(
                key="propietario_no_archivado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        propietario.desarchivar()
        registrar_actividad(request.user, f"Restauró al propietario: {propietario.nombre}")
        return self.notify(
            key="propietario_restaurado",
            data={"propietario": self.get_serializer(propietario).data},
        )


# ---------------------------------------------------------------------------
#  🌳  HUERTAS PROPIAS
# ---------------------------------------------------------------------------
class HuertaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de huertas + acciones custom (archivar / restaurar).
    Utiliza NotificationMixin para que **todas** las respuestas
    lleguen al frontend con la misma estructura:
        {
          "success": true|false,
          "notification": { title, message, level },
          "data": { … }
        }
    """
    queryset           = Huerta.objects.select_related("propietario").order_by("nombre")
    serializer_class   = HuertaSerializer
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # -------------------------------------------------- LIST
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={"huertas": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------------------------- CREATE
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        huerta = ser.save()
        registrar_actividad(request.user, f"Creó la huerta: {huerta.nombre}")

        return self.notify(
            key="huerta_create_success",
            data={"huerta": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------------------------- UPDATE
    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        ser      = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        huerta = ser.save()
        registrar_actividad(request.user, f"Actualizó la huerta: {huerta.nombre}")

        return self.notify(
            key="huerta_update_success",
            data={"huerta": ser.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------------------------- DELETE
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.is_active:
            return self.notify(
                key="huerta_debe_estar_archivada",
                data={"error": "Debes archivar la huerta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # ✔️  usamos el related_name definido en el modelo
        if instance.cosechas.exists():
            return self.notify(
                key="huerta_con_dependencias",
                data={"error": "No se puede eliminar. Tiene cosechas registradas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        nombre = instance.nombre
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la huerta: {nombre}")

        return self.notify(
            key="huerta_delete_success",
            data={"info": f"Huerta '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------------------------- CUSTOM ACTIONS
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()

        if not instance.is_active:
            return self.notify(key="ya_esta_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        instance.is_active   = False
        instance.archivado_en = timezone.now()
        instance.save()

        registrar_actividad(request.user, f"Archivó la huerta: {instance.nombre}")

        return self.notify(
            key="huerta_archivada",
            data={"huerta_id": instance.id},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()

        if instance.is_active:
            return self.notify(key="ya_esta_activa", status_code=status.HTTP_400_BAD_REQUEST)

        instance.is_active   = True
        instance.archivado_en = None
        instance.save()

        registrar_actividad(request.user, f"Restauró la huerta: {instance.nombre}")

        return self.notify(
            key="huerta_restaurada",
            data={"huerta_id": instance.id},
            status_code=status.HTTP_200_OK,
        )
# ---------------------------------------------------------------------------
#  🏡  HUERTAS RENTADAS
# ---------------------------------------------------------------------------
class HuertaRentadaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD + archivar/restaurar para Huerta Rentada
    """
    serializer_class   = HuertaRentadaSerializer
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ————————————————————————————————
    # Filtros dinámicos
    def get_queryset(self):
        qs = (
            HuertaRentada.objects
            .select_related("propietario")
            .order_by("nombre")
        )
        params = self.request.query_params

        if propietario_id := params.get("propietario"):
            qs = qs.filter(propietario_id=propietario_id)

        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)

        if (arch := params.get("archivado")) is not None:
            qs = qs.exclude(archivado_en__isnull=(arch.lower() == "false"))

        return qs

    # ————————————————————————————————
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={"huertas_rentadas": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        huerta = ser.save()
        registrar_actividad(request.user, f"Creó la huerta rentada: {huerta.nombre}")
        return self.notify(
            key="huerta_rentada_create_success",
            data={"huerta_rentada": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        ser      = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        huerta = ser.save()
        registrar_actividad(request.user, f"Actualizó la huerta rentada: {huerta.nombre}")
        return self.notify(
            key="huerta_rentada_update_success",
            data={"huerta_rentada": ser.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.is_active:
            return self.notify(
                key="huerta_debe_estar_archivada",
                data={"error": "Debes archivar la huerta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )



        nombre = instance.nombre
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la huerta rentada: {nombre}")
        return self.notify(
            key="huerta_rentada_delete_success",
            data={"info": f"Huerta rentada '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ——— Acciones personalizadas (archivar / restaurar) ———
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(key="ya_esta_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        instance.is_active    = False
        instance.archivado_en = timezone.now()
        instance.save()

        registrar_actividad(request.user, f"Archivó la huerta rentada: {instance.nombre}")
        return self.notify(
            key="huerta_archivada",
            data={"huerta_rentada_id": instance.id},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(key="ya_esta_activa", status_code=status.HTTP_400_BAD_REQUEST)

        instance.is_active    = True
        instance.archivado_en = None
        instance.save()

        registrar_actividad(request.user, f"Restauró la huerta rentada: {instance.nombre}")
        return self.notify(
            key="huerta_restaurada",
            data={"huerta_rentada_id": instance.id},
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
