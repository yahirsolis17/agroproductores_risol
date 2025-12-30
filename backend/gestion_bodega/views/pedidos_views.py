# gestion_bodega/views/pedidos_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Sum, F

from gestion_bodega.models import (
    Pedido, PedidoRenglon, SurtidoRenglon, ClasificacionEmpaque, CierreSemanal
)
from gestion_bodega.serializers import (
    PedidoSerializer, PedidoDetailSerializer, PedidoRenglonSerializer,
    SurtirPedidoSerializer
)
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import  ViewSetAuditMixin
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
            return {
                'count': 0,
                'next': None,
                'previous': None,
                'page': None,
                'page_size': None,
                'total_pages': None,
            }
        return {
            'count': page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
            'page': getattr(page, 'number', None),
            'page_size': paginator.get_page_size(self.request) if hasattr(paginator, 'get_page_size') else None,
            'total_pages': getattr(page.paginator, 'num_pages', None),
        }

def _semana_cerrada(bodega_id: int, temporada_id: int, fecha):
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id, temporada_id=temporada_id,
        fecha_desde__lte=fecha, fecha_hasta__gte=fecha, is_active=True
    ).exists()


class PedidoViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Pedidos por cliente:
    - CRUD + renglones anidados (serializer).
    - Acción `surtir` multi-origen con bloqueo de overpicking.
    - Respeta lock semanal por fechas de origen (clasificación) y del pedido.
    """
    queryset = Pedido.objects.all().order_by("-fecha", "-id")
    serializer_class = PedidoSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_pedido"],
        "retrieve": ["view_pedido"],
        "create":   ["add_pedido"],
        "update":   ["change_pedido"],
        "partial_update": ["change_pedido"],
        "destroy":  ["delete_pedido"],
        "surtir":   ["surtir_pedido"],
        "cancelar": ["cancel_pedido"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "cliente": ["exact"],
        "estado": ["exact"],
        "fecha": ["exact", "gte", "lte"],
        "is_active": ["exact"]
    }
    search_fields = ["observaciones"]
    ordering_fields = ["fecha", "id", "creado_en"]
    ordering = ["-fecha", "-id"]

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(getattr(self, "action", ""), [])
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ("retrieve",):
            return PedidoDetailSerializer
        return super().get_serializer_class()

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        pedido = ser.validated_data
        if _semana_cerrada(pedido["bodega"].id, pedido["temporada"].id, pedido["fecha"]):
            return self.notify(key="pedido_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="pedido_creado",
            data={"pedido": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha", obj.fecha)):
            return self.notify(key="pedido_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="pedido_actualizado",
            data={"pedido": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK
        )

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha", obj.fecha)):
            return self.notify(key="pedido_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(
            key="pedido_actualizado",
            data={"pedido": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="pedido_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        with transaction.atomic():
            obj.archivar()
        return self.notify(key="pedido_archivado", status_code=status.HTTP_200_OK)

    # ---- Acción: surtir ----
    @action(detail=True, methods=["post"])
    def surtir(self, request, pk=None):
        """
        Body esperado:
        {
          "consumos": [
            { "renglon_id": X, "clasificacion_id": Y, "cantidad": Z },
            ...
          ]
        }
        """
        obj: Pedido = self.get_object()
        ser = SurtirPedidoSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        consumos = ser.validated_data["consumos"]

        # Checar lock por semana del pedido y de cada origen
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="pedido_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            for c in consumos:
                renglon = PedidoRenglon.objects.select_for_update().get(pk=c["renglon_id"], pedido=obj)
                origen = ClasificacionEmpaque.objects.select_for_update().get(pk=c["clasificacion_id"])

                if _semana_cerrada(origen.bodega_id, origen.temporada_id, origen.fecha):
                    return self.notify(key="surtido_origen_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

                # Valida compatibilidad y overpicking vía clean() de SurtidoRenglon:
                sr = SurtidoRenglon(renglon=renglon, origen_clasificacion=origen, cantidad=c["cantidad"])
                sr.full_clean()
                sr.save()

                # Actualiza avance del renglon
                surtido_total = renglon.surtidos.aggregate(total=Sum("cantidad"))["total"] or 0
                renglon.cantidad_surtida = surtido_total
                renglon.save(update_fields=["cantidad_surtida", "actualizado_en"])

            # Recalcula estado del pedido
            pend = obj.renglones.filter(cantidad_surtida__lt=F("cantidad_solicitada")).exists()
            obj.estado = "PARCIAL" if pend else "SURTIDO"
            obj.save(update_fields=["estado", "actualizado_en"])

        return self.notify(
            key="pedido_surtido_ok",
            data={"pedido": PedidoDetailSerializer(obj).data},
            status_code=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        obj = self.get_object()
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="pedido_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        # Política básica: cancelar solo si no hay surtidos
        if SurtidoRenglon.objects.filter(renglon__pedido=obj).exists():
            return self.notify(key="pedido_no_cancelable_con_surtidos", status_code=status.HTTP_409_CONFLICT)

        obj.estado = "CANCELADO"
        obj.save(update_fields=["estado", "actualizado_en"])
        return self.notify(
            key="pedido_cancelado",
            data={"pedido": PedidoDetailSerializer(obj).data},
            status_code=status.HTTP_200_OK
        )

