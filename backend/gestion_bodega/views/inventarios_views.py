# gestion_bodega/views/inventarios_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from gestion_bodega.models import InventarioPlastico, MovimientoPlastico, CierreSemanal
from gestion_bodega.serializers import (
    InventarioPlasticoSerializer,
    MovimientoPlasticoSerializer,
    AjusteInventarioPlasticoSerializer,
)
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.utils.notification_handler import NotificationHandler

class NotificationMixin:
    """Shortcut para devolver respuestas con el formato del frontend."""
    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )

def _semana_cerrada(bodega_id: int, temporada_id: int, fecha):
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id, temporada_id=temporada_id,
        fecha_desde__lte=fecha, fecha_hasta__gte=fecha, is_active=True
    ).exists()


class InventarioPlasticoViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Inventario de envases plásticos (propio / consigna).
    Acción de ajuste con motivo obligatorio y movimientos auditables.
    """
    queryset = InventarioPlastico.objects.all().order_by("-id")
    serializer_class = InventarioPlasticoSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_inventario_plastico"],
        "retrieve": ["view_inventario_plastico"],
        "create":   ["adjust_inventario_plastico"],
        "update":   ["adjust_inventario_plastico"],
        "partial_update": ["adjust_inventario_plastico"],
        "destroy":  ["adjust_inventario_plastico"],
        "ajustar":  ["adjust_inventario_plastico"],
        "movimientos": ["view_inventario_plastico"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "cliente": ["exact", "isnull"],
        "calidad": ["exact"],
        "tipo_mango": ["exact", "icontains"],
        "is_active": ["exact"]
    }
    search_fields = ["tipo_mango"]
    ordering_fields = ["id", "creado_en", "actualizado_en", "stock"]
    ordering = ["-id"]

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(getattr(self, "action", ""), [])
        return super().get_permissions()

    # Se permite crear explícitamente un registro de inventario (ej. consigna nueva)
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="inventario_creado",
            data={"inventario": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED
        )

    # Ajuste explícito sobre un inventario existente
    @action(detail=True, methods=["post"])
    def ajustar(self, request, pk=None):
        inv = self.get_object()
        ser = AjusteInventarioPlasticoSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        mov_tipo = ser.validated_data["tipo"]
        cantidad = ser.validated_data["cantidad"]
        motivo = ser.validated_data["motivo"]

        # Lock semanal por "hoy" (fecha del movimiento) – si lo quieres por otra fecha, ajustamos el payload.
        hoy = ser.validated_data.get("fecha") or None
        if hoy and _semana_cerrada(inv.bodega_id, inv.temporada_id, hoy.date() if hasattr(hoy, "date") else hoy):
            return self.notify(key="inventario_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            # No negativos
            nuevo_stock = inv.stock + (cantidad if mov_tipo == MovimientoPlastico.ENTRADA else -cantidad)
            if nuevo_stock < 0:
                return self.notify(key="inventario_no_negativo", status_code=status.HTTP_400_BAD_REQUEST)

            inv.stock = nuevo_stock
            inv.save(update_fields=["stock", "actualizado_en"])

            mov = MovimientoPlastico.objects.create(
                inventario=inv, tipo=mov_tipo, cantidad=cantidad, motivo=motivo
            )

        return self.notify(
            key="inventario_ajustado",
            data={"inventario": self.get_serializer(inv).data, "movimiento": MovimientoPlasticoSerializer(mov).data},
            status_code=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"])
    def movimientos(self, request):
        qs = MovimientoPlastico.objects.select_related("inventario").order_by("-fecha", "-id")
        # Filtros básicos via query params
        inv_id = request.query_params.get("inventario")
        tipo = request.query_params.get("tipo")
        if inv_id:
            qs = qs.filter(inventario_id=inv_id)
        if tipo:
            qs = qs.filter(tipo=tipo)

        page = self.paginate_queryset(qs)
        data = MovimientoPlasticoSerializer(page or qs, many=True).data
        if page is not None:
            return self.notify(
                key="data_processed_success",
                data={"results": data, "meta": self.get_pagination_meta()},
                status_code=status.HTTP_200_OK
            )
        return self.notify(key="data_processed_success", data={"results": data}, status_code=status.HTTP_200_OK)
