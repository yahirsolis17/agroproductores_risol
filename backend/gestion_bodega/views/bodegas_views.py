# backend/gestion_bodega/views/bodegas_views.py
from django.db import transaction
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_usuarios.permissions import HasModulePermission

from gestion_bodega.models import Bodega, Cliente, TemporadaBodega
from gestion_bodega.serializers import (
    BodegaSerializer,
    ClienteSerializer,
    TemporadaBodegaSerializer,
)

# Utilidades ya usadas en gestión_huerta
from gestion_bodega.utils.audit import ViewSetAuditMixin
from gestion_bodega.utils.activity import registrar_actividad
from gestion_bodega.utils.notification_handler import NotificationHandler


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _has_perm_bodega(user, codename: str) -> bool:
    """Permisos de app 'gestion_bodega' (admin siempre OK)."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "role", None) == "admin" or getattr(user, "is_superuser", False):
        return True
    return user.has_perm(f"gestion_bodega.{codename}")

class NotificationMixin:
    """Shortcut para devolver respuestas con el formato del frontend."""

    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )

    def get_pagination_meta(self):
        paginator = getattr(self, 'paginator', None)
        page = getattr(paginator, 'page', None) if paginator else None
        if not paginator or page is None:
            return {'count': 0, 'next': None, 'previous': None}
        return {
            'count': page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
        }




# ---------------------------------------------------------------------------
#  🏬  BODEGAS
# ---------------------------------------------------------------------------
class BodegaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de bodegas con:
    - Paginación uniforme + payload meta
    - Filtros por estado (activos|archivados|todos), nombre, ubicación
    - Búsqueda y ordenamiento
    - Acciones: archivar / restaurar
    """
    queryset = Bodega.objects.all().order_by("-id")
    serializer_class = BodegaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["nombre", "ubicacion", "is_active"]
    search_fields = ["nombre", "ubicacion"]
    ordering_fields = ["nombre", "actualizado_en", "creado_en", "id"]
    ordering = ["-actualizado_en", "-id"]

    # Mapa de permisos por acción (lo usa HasModulePermission)
    _perm_map = {
        "list":           ["view_bodega"],
        "retrieve":       ["view_bodega"],
        "create":         ["add_bodega"],
        "update":         ["change_bodega"],
        "partial_update": ["change_bodega"],
        "destroy":        ["delete_bodega"],
        "archivar":       ["archive_bodega"],
        "restaurar":      ["restore_bodega"],
    }

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_bodega"])
        return [p() for p in self.permission_classes]

    # ------------------------------ Queryset dinámico
    def get_queryset(self):
        qs = super().get_queryset()
        # No aplicar filtros de listado en acciones de detalle
        if self.action in {"retrieve", "update", "partial_update", "destroy", "archivar", "restaurar"}:
            return qs

        params = self.request.query_params

        # Estado: activos | archivados | todos
        estado = (params.get("estado") or "activos").strip().lower()
        if estado == "activos":
            qs = qs.filter(archivado_en__isnull=True, is_active=True)
        elif estado == "archivados":
            qs = qs.filter(archivado_en__isnull=False)

        # Filtros y search
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)
        if ubic := params.get("ubicacion"):
            qs = qs.filter(ubicacion__icontains=ubic)
        if search := params.get("search"):
            qs = qs.filter(Q(nombre__icontains=search) | Q(ubicacion__icontains=search))

        return qs

    # ------------------------------ LIST (con meta uniforme)
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            data = self.get_serializer(page, many=True).data
            meta = {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            }
        else:
            data = self.get_serializer(qs, many=True).data
            meta = {"count": len(data), "next": None, "previous": None}
        return self.notify(
            key="data_processed_success",
            data={"bodegas": data, "meta": meta},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ CREATE
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            return self.notify(
                key="validation_error",
                data={"errors": getattr(ex, "detail", ser.errors)},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_create(ser)
        registrar_actividad(request.user, f"Creó bodega {ser.data.get('nombre')}")
        return self.notify(
            key="bodega_create_success",
            data={"bodega": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ UPDATE / PARTIAL_UPDATE
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            return self.notify(
                key="validation_error",
                data={"errors": getattr(ex, "detail", ser.errors)},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(ser)
        registrar_actividad(request.user, f"Actualizó bodega {ser.data.get('nombre')}")
        return self.notify(
            key="bodega_update_success",
            data={"bodega": ser.data},
            status_code=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    # ------------------------------ DELETE (regla: debe estar archivada y sin temporadas)
    def destroy(self, request, *args, **kwargs):
        bodega = self.get_object()
        if bodega.is_active or bodega.archivado_en is None:
            return self.notify(
                key="bodega_debe_estar_archivada",
                data={"info": "Debes archivar la bodega antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if TemporadaBodega.objects.filter(bodega=bodega).exists():
            return self.notify(
                key="bodega_con_dependencias",
                data={"info": "No se puede eliminar. Tiene temporadas asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        bodega_id = int(bodega.id)
        self.perform_destroy(bodega)
        registrar_actividad(request.user, f"Eliminó bodega {bodega_id}")
        return self.notify(
            key="bodega_delete_success",
            data={"deleted_id": bodega_id},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ ARCHIVAR / RESTAURAR
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if instance.archivado_en:
            return self.notify(
                key="ya_archivada",
                data={"info": "La bodega ya está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not _has_perm_bodega(request.user, "archive_bodega"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar bodegas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        with transaction.atomic():
            affected = instance.archivar()  # tu modelo ya lo implementa
        registrar_actividad(request.user, f"Archivó bodega {instance.id}")
        return self.notify(key="bodega_archivada", data={"bodega_id": instance.id, "affected": affected})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active and not instance.archivado_en:
            return self.notify(
                key="ya_esta_activa",
                data={"info": "La bodega ya está activa."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not _has_perm_bodega(request.user, "restore_bodega"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar bodegas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        with transaction.atomic():
            affected = instance.desarchivar()
        registrar_actividad(request.user, f"Restauró bodega {instance.id}")
        return self.notify(key="bodega_restaurada", data={"bodega_id": instance.id, "affected": affected})


# ---------------------------------------------------------------------------
#  👥  CLIENTES (catálogo)
# ---------------------------------------------------------------------------
class ClienteViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by("-id")
    serializer_class = ClienteSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["nombre", "empresa", "telefono", "email"]
    ordering_fields = ["nombre", "actualizado_en", "creado_en", "id"]
    ordering = ["nombre", "id"]

    _perm_map = {
        "list":           ["view_cliente"],
        "retrieve":       ["view_cliente"],
        "create":         ["add_cliente"],
        "update":         ["change_cliente"],
        "partial_update": ["change_cliente"],
        "destroy":        ["delete_cliente"],
        "archivar":       ["archive_cliente"],
        "restaurar":      ["restore_cliente"],
    }

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_cliente"])
        return [p() for p in self.permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in {"retrieve", "update", "partial_update", "destroy", "archivar", "restaurar"}:
            return qs
        estado = (self.request.query_params.get("estado") or "activos").strip().lower()
        if estado == "activos":
            qs = qs.filter(archivado_en__isnull=True, is_active=True)
        elif estado == "archivados":
            qs = qs.filter(archivado_en__isnull=False)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            data = self.get_serializer(page, many=True).data
            meta = {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            }
        else:
            data = self.get_serializer(qs, many=True).data
            meta = {"count": len(data), "next": None, "previous": None}
        return self.notify(key="data_processed_success", data={"clientes": data, "meta": meta})

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if instance.archivado_en:
            return self.notify(
                key="ya_archivada",
                data={"info": "El cliente ya está archivado."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not _has_perm_bodega(request.user, "archive_cliente"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar clientes."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        with transaction.atomic():
            instance.archivar()
        registrar_actividad(request.user, f"Archivó cliente {instance.id}")
        return self.notify(key="cliente_archivado", data={"cliente_id": instance.id})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active and not instance.archivado_en:
            return self.notify(
                key="ya_esta_activa",
                data={"info": "El cliente ya está activo."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not _has_perm_bodega(request.user, "restore_cliente"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar clientes."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        with transaction.atomic():
            instance.desarchivar()
        registrar_actividad(request.user, f"Restauró cliente {instance.id}")
        return self.notify(key="cliente_restaurado", data={"cliente_id": instance.id})


# ---------------------------------------------------------------------------
#  📅  TEMPORADAS DE BODEGA (espejo de Temporadas en huerta)
# ---------------------------------------------------------------------------
class TemporadaBodegaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    queryset = (
        TemporadaBodega.objects
        .select_related("bodega")
        .order_by("-año", "-id")
    )
    serializer_class = TemporadaBodegaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["año", "bodega", "finalizada"]
    ordering_fields = ["año", "actualizado_en", "creado_en", "id"]
    ordering = ["-año", "-id"]

    _perm_map = {
        "list":           ["view_temporadabodega"],
        "retrieve":       ["view_temporadabodega"],
        "create":         ["add_temporadabodega"],
        "update":         ["change_temporadabodega"],
        "partial_update": ["change_temporadabodega"],
        "destroy":        ["delete_temporadabodega"],
        "archivar":       ["archive_temporadabodega"],
        "restaurar":      ["restore_temporadabodega"],
        # 'finalizar' → permiso contextual (finalize vs reactivate)
    }

    def get_permissions(self):
        if self.action == "finalizar":
            # Decide permiso según estado actual (igual patrón que Temporadas)
            required = ["finalize_temporadabodega", "reactivate_temporadabodega"]
            pk = self.kwargs.get("pk")
            if pk:
                try:
                    fin = TemporadaBodega.objects.only("id", "finalizada").get(pk=pk).finalizada
                    required = ["reactivate_temporadabodega"] if fin else ["finalize_temporadabodega"]
                except TemporadaBodega.DoesNotExist:
                    pass
            self.required_permissions = required
        else:
            self.required_permissions = self._perm_map.get(self.action, ["view_temporadabodega"])
        return [p() for p in self.permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in {"retrieve", "update", "partial_update", "destroy", "archivar", "restaurar", "finalizar"}:
            return qs
        estado = (self.request.query_params.get("estado") or "activos").strip().lower()
        if estado == "activos":
            qs = qs.filter(archivado_en__isnull=True, is_active=True)
        elif estado == "archivados":
            qs = qs.filter(archivado_en__isnull=False)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            data = self.get_serializer(page, many=True).data
            meta = {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            }
        else:
            data = self.get_serializer(qs, many=True).data
            meta = {"count": len(data), "next": None, "previous": None}
        return self.notify(key="data_processed_success", data={"temporadas": data, "meta": meta})

    # ------------------------------ ARCHIVAR / RESTAURAR
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        if not _has_perm_bodega(request.user, "archive_temporadabodega"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar temporadas de bodega."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        temp = self.get_object()
        if not temp.is_active:
            return self.notify(
                key="temporada_ya_archivada",
                data={"info": "Esta temporada ya está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            affected = temp.archivar()
        registrar_actividad(request.user, f"Archivó temporada bodega {temp.año}")
        return self.notify(key="temporada_bodega_archivada", data={"temporada_id": temp.id, "affected": affected})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        if not _has_perm_bodega(request.user, "restore_temporadabodega"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar temporadas de bodega."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        temp = self.get_object()
        if temp.is_active and not temp.archivado_en:
            return self.notify(
                key="ya_esta_activa",
                data={"info": "La temporada ya está activa."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            affected = temp.desarchivar()
        registrar_actividad(request.user, f"Restauró temporada bodega {temp.año}")
        return self.notify(key="temporada_bodega_restaurada", data={"temporada_id": temp.id, "affected": affected})

    # ------------------------------ FINALIZAR (toggle contextual)
    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        temp = self.get_object()
        required = "finalize_temporadabodega" if not temp.finalizada else "reactivate_temporadabodega"
        if not _has_perm_bodega(request.user, required):
            accion = "finalizar" if required == "finalize_temporadabodega" else "reactivar"
            return self.notify(
                key="permission_denied",
                data={"info": f"No tienes permiso para {accion} temporadas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        if not temp.is_active:
            return self.notify(
                key="temporada_archivada_no_finalizar",
                data={"info": "No puedes finalizar/reactivar una temporada archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not temp.finalizada:
            temp.finalizada = True
            temp.save(update_fields=["finalizada", "actualizado_en"])
            registrar_actividad(request.user, f"Finalizó temporada bodega {temp.año}")
            key = "temporada_bodega_finalizada"
        else:
            temp.finalizada = False
            temp.save(update_fields=["finalizada", "actualizado_en"])
            registrar_actividad(request.user, f"Reactivó temporada bodega {temp.año}")
            key = "temporada_bodega_reactivada"

        return self.notify(key=key, data={"temporada": self.get_serializer(temp).data})

