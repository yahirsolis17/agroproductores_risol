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
from django.utils import timezone
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

# Modelos
from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada
)

# Serializadores
from gestion_huerta.serializers import (
    PropietarioSerializer, HuertaSerializer, HuertaRentadaSerializer,
)

# Permisos
from gestion_huerta.permissions import (
    HasHuertaModulePermission, HuertaGranularPermission
)

# Utilidades
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.audit import ViewSetAuditMixin        # ⬅️ auditoría

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
    """Shortcut para devolver respuestas con el formato del frontend."""

    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )


# ---------------------------------------------------------------------------
#  🏠  PROPIETARIOS
# ---------------------------------------------------------------------------
class PropietarioViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
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
            data={
                "propietarios": serializer.data,
                "meta": {
                    "count":    self.paginator.page.paginator.count,
                    "next":     self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            }
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

        self.perform_create(serializer)   # ⬅️ auditoría automática

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

        self.perform_update(serializer)   # ⬅️ auditoría

        return self.notify(
            key="propietario_update_success",
            data={"propietario": serializer.data}
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

        self.perform_destroy(instance)    # ⬅️ auditoría

        return self.notify(
            key="propietario_delete_success",
            data={"info": "Propietario eliminado."}
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
class HuertaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de huertas + acciones custom (archivar / restaurar).
    """
    queryset           = Huerta.objects.select_related("propietario").order_by("nombre")
    serializer_class   = HuertaSerializer
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ------------- filtros dinámicos -------------
    def get_queryset(self):
        qs     = Huerta.objects.select_related("propietario").order_by("nombre")
        params = self.request.query_params

        if propietario_id := params.get("propietario"):
            qs = qs.filter(propietario_id=propietario_id)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)
        if (arch := params.get("archivado")) is not None:
            qs = qs.exclude(archivado_en__isnull=(arch.lower() == "false"))

        return qs

    # ---------------- LIST ----------------
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "huertas": serializer.data,
                "meta": {
                    "count":    self.paginator.page.paginator.count,
                    "next":     self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            },
            status_code=status.HTTP_200_OK
        )


    # ---------------- CREATE ----------------
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

        self.perform_create(ser)          # ⬅️ auditoría

        return self.notify(
            key="huerta_create_success",
            data={"huerta": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------- UPDATE ----------------
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

        self.perform_update(ser)          # ⬅️ auditoría

        return self.notify(
            key="huerta_update_success",
            data={"huerta": ser.data}
        )

    # ---------------- DELETE ----------------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="huerta_debe_estar_archivada",
                data={"error": "Debes archivar la huerta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if instance.cosechas.exists():
            return self.notify(
                key="huerta_con_dependencias",
                data={"error": "No se puede eliminar. Tiene cosechas registradas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_destroy(instance)    # ⬅️ auditoría

        return self.notify(
            key="huerta_delete_success",
            data={"info": "Huerta eliminada."}
        )

    # ---------------- CUSTOM ACTIONS ----------------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(
                key="ya_esta_archivada",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        instance.is_active    = False
        instance.archivado_en = timezone.now()
        instance.save()
        registrar_actividad(request.user, f"Archivó la huerta: {instance.nombre}")

        return self.notify(
            key="huerta_archivada",
            data={"huerta_id": instance.id}
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="ya_esta_activa",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        instance.is_active    = True
        instance.archivado_en = None
        instance.save()
        registrar_actividad(request.user, f"Restauró la huerta: {instance.nombre}")

        return self.notify(
            key="huerta_restaurada",
            data={"huerta_id": instance.id}
        )


# ---------------------------------------------------------------------------
#  🏡  HUERTAS RENTADAS
# ---------------------------------------------------------------------------
class HuertaRentadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD + archivar/restaurar para Huerta Rentada.
    """
    serializer_class   = HuertaRentadaSerializer
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ------------- filtros dinámicos -------------
    def get_queryset(self):
        qs     = HuertaRentada.objects.select_related("propietario").order_by("nombre")
        params = self.request.query_params

        if propietario_id := params.get("propietario"):
            qs = qs.filter(propietario_id=propietario_id)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)
        if (arch := params.get("archivado")) is not None:
            qs = qs.exclude(archivado_en__isnull=(arch.lower() == "false"))
        return qs

    # ---------------- LIST ----------------
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "huertas_rentadas": serializer.data,
                "meta": {
                    "count":    self.paginator.page.paginator.count,
                    "next":     self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            },
            status_code=status.HTTP_200_OK
        )


    # ---------------- CREATE ----------------
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

        self.perform_create(ser)          # ⬅️ auditoría

        return self.notify(
            key="huerta_rentada_create_success",
            data={"huerta_rentada": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------- UPDATE ----------------
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

        self.perform_update(ser)          # ⬅️ auditoría

        return self.notify(
            key="huerta_rentada_update_success",
            data={"huerta_rentada": ser.data}
        )

    # ---------------- DELETE ----------------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="huerta_debe_estar_archivada",
                data={"error": "Debes archivar la huerta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_destroy(instance)    # ⬅️ auditoría

        return self.notify(
            key="huerta_rentada_delete_success",
            data={"info": "Huerta rentada eliminada."}
        )

    # ---------------- CUSTOM ACTIONS ----------------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(
                key="ya_esta_archivada",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        instance.is_active    = False
        instance.archivado_en = timezone.now()
        instance.save()
        registrar_actividad(request.user, f"Archivó la huerta rentada: {instance.nombre}")

        return self.notify(
            key="huerta_archivada",
            data={"huerta_rentada_id": instance.id}
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="ya_esta_activa",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        instance.is_active    = True
        instance.archivado_en = None
        instance.save()
        registrar_actividad(request.user, f"Restauró la huerta rentada: {instance.nombre}")

        return self.notify(
            key="huerta_restaurada",
            data={"huerta_rentada_id": instance.id}
        )
