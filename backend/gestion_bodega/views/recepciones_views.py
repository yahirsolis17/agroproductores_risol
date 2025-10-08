# gestion_bodega/views/recepciones_views.py
from rest_framework import viewsets, status, filters, serializers
from gestion_bodega.utils.notification_handler import NotificationHandler
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Q
from datetime import date

from gestion_bodega.models import (
    Recepcion, ClasificacionEmpaque, CierreSemanal,
    TemporadaBodega, Bodega
)

from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination

# Reutilizamos el NotificationMixin como en tus vistas de huerta

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

def _semana_cerrada(bodega_id: int, temporada_id: int, f: date) -> bool:
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha_desde__lte=f,
        fecha_hasta__gte=f,
        is_active=True
    ).exists()


class RecepcionViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de Recepción de fruta (campo -> bodega).
    Reglas:
    - Temporada activa y no finalizada para crear/editar.
    - Semana ISO cerrada bloquea cambios en fechas dentro del rango.
    """
    queryset = Recepcion.objects.all().order_by("-fecha", "-id")
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_recepcion"],
        "retrieve": ["view_recepcion"],
        "create":   ["add_recepcion"],
        "update":   ["change_recepcion"],
        "partial_update": ["change_recepcion"],
        "destroy":  ["delete_recepcion"],
        "archivar": ["archive_recepcion"],
        "restaurar": ["restore_recepcion"],
    }

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

    def get_permissions(self):
        # Mismos patrones que en huerta
        action = getattr(self, "action", None)
        req_perms = self._perm_map.get(action) or self._perm_map.get(self.request.method.lower(), [])
        self.required_permissions = req_perms
        return super().get_permissions()

    # -------- LIST ----------
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = self.get_serializer(page or qs, many=True).data
        if page is not None:
            return self.notify(
                key="data_processed_success",
                data={
                    "results": data,
                    "meta": self.get_pagination_meta()
                },
                status_code=status.HTTP_200_OK,
            )
        return self.notify(key="data_processed_success", data={"results": data}, status_code=status.HTTP_200_OK)

    # -------- CREATE ----------
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        temporada = ser.validated_data["temporada"]
        bodega = ser.validated_data["bodega"]
        f = ser.validated_data["fecha"]

        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="recepcion_creada",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED,
        )

    # -------- UPDATE ----------
    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        temporada = ser.validated_data["temporada"]
        bodega = ser.validated_data["bodega"]
        f = ser.validated_data["fecha"]

        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="recepcion_actualizada",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        temporada = ser.validated_data.get("temporada", obj.temporada)
        bodega = ser.validated_data.get("bodega", obj.bodega)
        f = ser.validated_data.get("fecha", obj.fecha)

        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="recepcion_actualizada",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK,
        )

    # -------- DELETE (soft) ----------
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        # Semana lock por la fecha de la recepción
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj.archivar()

        return self.notify(key="recepcion_archivada", status_code=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def archivar(self, request, pk=None):
        obj = self.get_object()
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        if not obj.is_active:
            return self.notify(key="recepcion_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        obj.archivar()
        return self.notify(key="recepcion_archivada", status_code=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def restaurar(self, request, pk=None):
        obj = self.get_object()
        if obj.is_active:
            return self.notify(key="recepcion_ya_activa", status_code=status.HTTP_400_BAD_REQUEST)
        obj.desarchivar()
        return self.notify(
            key="recepcion_restaurada",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK
        )

