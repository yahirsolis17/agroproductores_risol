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
import ast
from django.utils import timezone
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
# Modelos
from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada
)
from django.db.models import Q
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
from agroproductores_risol.utils.pagination import GenericPagination

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Paginar 100 → máximo y permitir ?page_size=
# ---------------------------------------------------------------------------

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
    queryset           = Propietario.objects.all()
    
    serializer_class   = PropietarioSerializer
    pagination_class = GenericPagination
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

    def get_queryset(self):
        qs = Propietario.objects.all()
        params = self.request.query_params

        # 🔁 Estado: activos / archivados (solo un parámetro)
        archivado_param = params.get("archivado")
        if archivado_param:
            archivado = archivado_param.lower()
            if archivado in ["activos", "false"]:
                qs = qs.filter(archivado_en__isnull=True)
            elif archivado in ["archivados", "true"]:
                qs = qs.filter(archivado_en__isnull=False)

        # 🔍 Búsqueda exacta por ID (prioridad máxima)
        if id_param := params.get("id"):
            try:
                return qs.filter(id=int(id_param))  # RETURN aquí
            except ValueError:
                pass  # No rompe el flujo si ID es inválido

        # 🔍 Búsqueda por nombre (exacta)
        if nombre := params.get("nombre"):
            return qs.filter(nombre=nombre)  # EXACTO, no parcial

        # 🔎 Filtro inteligente (búsqueda parcial en múltiples campos)
        if search := params.get("search"):
            from django.db.models import Value, CharField
            from django.db.models.functions import Concat
            return qs.annotate(
                nombre_completo=Concat('nombre', Value(' '), 'apellidos', output_field=CharField())
            ).filter(
                Q(nombre__icontains=search) |
                Q(apellidos__icontains=search) |
                Q(nombre_completo__icontains=search) |
                Q(telefono__icontains=search) |
                Q(direccion__icontains=search)
            )

        return qs
# --------------1-------------------------------------------------------------
#  🌳  HUERTAS PROPIAS
# ---------------------------------------------------------------------------
class HuertaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de huertas + acciones custom (archivar / restaurar).
    """
    queryset           = Huerta.objects.select_related("propietario").order_by("nombre")
    serializer_class   = HuertaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]


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

    def get_queryset(self):
        qs     = Huerta.objects.select_related("propietario").order_by("nombre")
        params = self.request.query_params

        # 🔁 Estado (activos / archivados)
        if estado := params.get("estado"):
            if estado == 'activos':
                qs = qs.filter(archivado_en__isnull=True)
            elif estado == 'archivados':
                qs = qs.filter(archivado_en__isnull=False)
        elif arch := params.get("archivado"):
            low = arch.lower()
            if low == "true":
                qs = qs.filter(archivado_en__isnull=False)
            elif low == "false":
                qs = qs.filter(archivado_en__isnull=True)

        # 🔍 Búsqueda global (`search`) en nombre / ubicación / variedades
        if search := params.get("search"):
            qs = qs.filter(
                Q(nombre__icontains=search)     |
                Q(ubicacion__icontains=search)  |
                Q(variedades__icontains=search)
            )

        # 🎯 Filtros específicos
        if prop := params.get("propietario"):
            qs = qs.filter(propietario_id=prop)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)

        return qs
# ---------------------------------------------------------------------------
#  🏡  HUERTAS RENTADAS
# ---------------------------------------------------------------------------
class HuertaRentadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD + archivar/restaurar para Huerta Rentada.
    """
    serializer_class   = HuertaRentadaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]
    
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

    def get_queryset(self):
        qs     = HuertaRentada.objects.select_related("propietario").order_by("nombre")
        params = self.request.query_params

        # 🔁 Estado
        if estado := params.get("estado"):
            if estado == 'activos':
                qs = qs.filter(archivado_en__isnull=True)
            elif estado == 'archivados':
                qs = qs.filter(archivado_en__isnull=False)
        elif arch := params.get("archivado"):
            low = arch.lower()
            if low == "true":
                qs = qs.filter(archivado_en__isnull=False)
            elif low == "false":
                qs = qs.filter(archivado_en__isnull=True)

        # 🔍 Búsqueda global
        if search := params.get("search"):
            qs = qs.filter(
                Q(nombre__icontains=search)    |
                Q(ubicacion__icontains=search) |
                Q(variedades__icontains=search)
            )

        # 🎯 Filtros específicos
        if prop := params.get("propietario"):
            qs = qs.filter(propietario_id=prop)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)

        return qs