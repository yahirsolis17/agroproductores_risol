# gestion_bodega/views/consumibles_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from gestion_bodega.models import Consumible, CierreSemanal
from gestion_bodega.serializers import ConsumibleSerializer
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from agroproductores_risol.utils.notification_handler import NotificationHandler
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

def _semana_cerrada(bodega_id: int, temporada_id: int, f):
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id, temporada_id=temporada_id,
        fecha_desde__lte=f, fecha_hasta__gte=f, is_active=True
    ).exists()


class ConsumibleViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Consumibles/gastos operativos de bodega (por temporada).
    """
    queryset = Consumible.objects.all().order_by("-fecha", "-id")
    serializer_class = ConsumibleSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_consumible"],
        "retrieve": ["view_consumible"],
        "create":   ["add_consumible"],
        "update":   ["change_consumible"],
        "partial_update": ["change_consumible"],
        "destroy":  ["delete_consumible"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "concepto": ["exact", "icontains"],
        "fecha": ["exact", "gte", "lte"],
        "is_active": ["exact"]
    }
    search_fields = ["concepto", "observaciones"]
    ordering_fields = ["fecha", "id", "total"]
    ordering = ["-fecha", "-id"]

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(getattr(self, "action", ""), [])
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        if _semana_cerrada(data["bodega"].id, data["temporada"].id, data["fecha"]):
            return self.notify(key="consumible_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        obj = ser.save()
        return self.notify(key="consumible_creado", data={"consumible": self.get_serializer(obj).data}, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha", obj.fecha)):
            return self.notify(key="consumible_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        obj = ser.save()
        return self.notify(key="consumible_actualizado", data={"consumible": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha", obj.fecha)):
            return self.notify(key="consumible_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        obj = ser.save()
        return self.notify(key="consumible_actualizado", data={"consumible": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="consumible_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        obj.archivar()
        return self.notify(key="consumible_archivado", status_code=status.HTTP_200_OK)

