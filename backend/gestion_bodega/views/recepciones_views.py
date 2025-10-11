# backend/gestion_bodega/views/recepciones_views.py
from datetime import date

from django.db import transaction
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_bodega.models import (
    Bodega,
    CierreSemanal,
    Recepcion,
    TemporadaBodega,
)
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.serializers import RecepcionSerializer
from gestion_bodega.utils.audit import ViewSetAuditMixin
from gestion_bodega.utils.notification_handler import NotificationHandler
from agroproductores_risol.utils.pagination import GenericPagination


# ───────────────────────────────────────────────────────────────────────────
# Helpers / Mixin (alineado con huerta)
# ───────────────────────────────────────────────────────────────────────────

class NotificationMixin:
    """Devolver respuestas con el formato esperado por el frontend."""
    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )

    def _pagination_meta(self):
        # Igual que en huerta: contar y exponer números de página
        paginator = getattr(self, "paginator", None)
        page = getattr(paginator, "page", None) if paginator else None
        if not paginator or page is None:
            return {
                "count": 0,
                "next": None,
                "previous": None,
                "page": None,
                "page_size": None,
                "total_pages": None,
            }
        return {
            "count": page.paginator.count,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
            "page": page.number,
            "page_size": paginator.get_page_size(self.request),
            "total_pages": page.paginator.num_pages,
        }


def _msg_in(errors_dict, text_substring: str) -> bool:
    """Busca substring en cualquier mensaje del dict de errores DRF."""
    for _, msgs in (errors_dict or {}).items():
        if isinstance(msgs, (list, tuple)):
            for m in msgs:
                if text_substring.lower() in str(m).lower():
                    return True
        elif isinstance(msgs, str) and text_substring.lower() in msgs.lower():
            return True
    return False


def _semana_cerrada(bodega_id: int, temporada_id: int, f: date) -> bool:
    """¿Existe un cierre semanal activo que cubra la fecha dada?"""
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha_desde__lte=f,
        fecha_hasta__gte=f,
        is_active=True,
    ).exists()


def _map_recepcion_validation_errors(errors: dict) -> tuple[str, dict]:
    """
    Traductor a message_keys coherentes con el frontend.
    """
    if _msg_in(errors, "La temporada debe estar activa y no finalizada"):
        return "recepcion_temporada_invalida", {"errors": errors}
    if _msg_in(errors, "cantidad de cajas") or _msg_in(errors, "debe ser positiva"):
        return "recepcion_cantidad_invalida", {"errors": errors}
    return "validation_error", {"errors": errors}


# ───────────────────────────────────────────────────────────────────────────
# ViewSet
# ───────────────────────────────────────────────────────────────────────────

class RecepcionViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de Recepciones (entrada de mango desde campo).
    Reglas clave:
      - Temporada activa y no finalizada.
      - Bodega de la recepción debe coincidir con la bodega de la temporada.
      - CierreSemanal bloquea crear/editar/archivar/restaurar en fechas cerradas.
      - Archivar antes de eliminar (patrón consistente del sistema).
    """
    serializer_class = RecepcionSerializer
    queryset = Recepcion.objects.select_related("bodega", "temporada").order_by("-fecha", "-id")
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":             ["view_recepcion"],
        "retrieve":         ["view_recepcion"],
        "create":           ["add_recepcion"],
        "update":           ["change_recepcion"],
        "partial_update":   ["change_recepcion"],
        "destroy":          ["delete_recepcion"],
        "archivar":         ["archive_recepcion"],
        "restaurar":        ["restore_recepcion"],
    }

    # Filtros / búsqueda / ordenamiento
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "fecha": ["exact", "gte", "lte"],
        "tipo_mango": ["exact", "icontains"],
        "is_active": ["exact"],
    }
    search_fields = ["huertero_nombre", "tipo_mango", "observaciones"]
    ordering_fields = ["fecha", "id", "creado_en"]
    ordering = ["-fecha", "-id"]

    # ---------- permisos por acción (igual que en huerta) ----------
    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_recepcion"])
        return [p() for p in self.permission_classes]

    # ---------- queryset dinámico ----------
    def get_queryset(self):
        qs = super().get_queryset()

        # En acciones de detalle no aplicamos filtros de lista para evitar 404 por filtros
        if self.action in ["retrieve", "update", "partial_update", "destroy", "archivar", "restaurar"]:
            return qs

        params = self.request.query_params

        # Filtro estado/archivado (alias coherente con huerta)
        if estado := (params.get("estado") or "").strip().lower():
            if estado in ("activos", "activas", "false"):
                qs = qs.filter(is_active=True)
            elif estado in ("archivados", "archivadas", "true"):
                qs = qs.filter(is_active=False)

        # Búsqueda rica combinada adicional (además de SearchFilter)
        if search := (params.get("search") or "").strip():
            qs = qs.filter(
                Q(huertero_nombre__icontains=search)
                | Q(tipo_mango__icontains=search)
                | Q(observaciones__icontains=search)
            )

        return qs

    # ---------- LIST ----------
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        ser = self.get_serializer(page, many=True)
        payload = {
            "recepciones": ser.data,   # alias estable para UI
            "results": ser.data,       # compatibilidad
            "meta": self._pagination_meta(),
        }
        return self.notify(key="data_processed_success", data=payload, status_code=status.HTTP_200_OK)

    # ---------- CREATE ----------
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        ser = self.get_serializer(data=data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_recepcion_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        temporada: TemporadaBodega = ser.validated_data["temporada"]
        bodega: Bodega = ser.validated_data["bodega"]
        f: date = ser.validated_data["fecha"]

        # Consistencia Bodega <-> Temporada
        if temporada.bodega_id != bodega.id:
            return self.notify(
                key="recepcion_bodega_temporada_incongruente",
                data={"info": "La bodega de la recepción debe coincidir con la bodega de la temporada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Estado de temporada
        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        # Cierre semanal
        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="recepcion_create_success",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------- UPDATE ----------
    def update(self, request, *args, **kwargs):
        instance: Recepcion = self.get_object()
        ser = self.get_serializer(instance, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_recepcion_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        temporada: TemporadaBodega = ser.validated_data["temporada"]
        bodega: Bodega = ser.validated_data["bodega"]
        f: date = ser.validated_data["fecha"]

        # Consistencia Bodega <-> Temporada
        if temporada.bodega_id != bodega.id:
            return self.notify(
                key="recepcion_bodega_temporada_incongruente",
                data={"info": "La bodega de la recepción debe coincidir con la bodega de la temporada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Estado de temporada
        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        # Bloqueo por cierre (si la fecha original o la nueva están cerradas, bloqueamos)
        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha) or _semana_cerrada(
            bodega.id, temporada.id, f
        ):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="recepcion_update_success",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK,
        )

    # ---------- PARTIAL UPDATE ----------
    def partial_update(self, request, *args, **kwargs):
        instance: Recepcion = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_recepcion_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        temporada: TemporadaBodega = ser.validated_data.get("temporada", instance.temporada)
        bodega: Bodega = ser.validated_data.get("bodega", instance.bodega)
        f: date = ser.validated_data.get("fecha", instance.fecha)

        if temporada.bodega_id != bodega.id:
            return self.notify(
                key="recepcion_bodega_temporada_incongruente",
                data={"info": "La bodega de la recepción debe coincidir con la bodega de la temporada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha) or _semana_cerrada(
            bodega.id, temporada.id, f
        ):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="recepcion_update_success",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK,
        )

    # ---------- DELETE (hard) ----------
    def destroy(self, request, *args, **kwargs):
        instance: Recepcion = self.get_object()

        # Patrón: archivar antes de eliminar
        if instance.is_active:
            return self.notify(
                key="recepcion_debe_estar_archivada",
                data={"error": "Debes archivar la recepción antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Dependencias duras: si hay clasificaciones asociadas, no permitir
        if hasattr(instance, "clasificaciones") and instance.clasificaciones.exists():
            return self.notify(
                key="recepcion_con_dependencias",
                data={"error": "No se puede eliminar: existen clasificaciones asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Cierre por la fecha del registro
        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        nombre = f"Recepción #{instance.id}"
        self.perform_destroy(instance)
        return self.notify(
            key="recepcion_delete_success",
            data={"info": f"{nombre} eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ---------- ARCHIVAR ----------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance: Recepcion = self.get_object()

        if not instance.is_active:
            return self.notify(key="recepcion_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            instance.archivar()

        return self.notify(key="recepcion_archivada", data={"recepcion_id": instance.id})

    # ---------- RESTAURAR ----------
    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance: Recepcion = self.get_object()

        if instance.is_active:
            return self.notify(key="recepcion_ya_activa", status_code=status.HTTP_400_BAD_REQUEST)

        # Estado temporada (debe poder operar)
        if not instance.temporada.is_active or instance.temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        # Cierre semanal (fecha del propio registro)
        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            instance.desarchivar()

        return self.notify(
            key="recepcion_restaurada",
            data={"recepcion": self.get_serializer(instance).data},
            status_code=status.HTTP_200_OK,
        )
