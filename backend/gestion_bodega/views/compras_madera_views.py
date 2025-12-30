# gestion_bodega/views/compras_madera_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from gestion_bodega.models import CompraMadera, AbonoMadera, CierreSemanal
from gestion_bodega.serializers import CompraMaderaSerializer, AbonoMaderaSerializer, RegistrarAbonoSerializer
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


class CompraMaderaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Compras de madera (dinero real) + abonos.
    """
    queryset = CompraMadera.objects.all().order_by("-creado_en")
    serializer_class = CompraMaderaSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_compra_madera"],
        "retrieve": ["view_compra_madera"],
        "create":   ["add_compra_madera"],
        "update":   ["change_compra_madera"],
        "partial_update": ["change_compra_madera"],
        "destroy":  ["delete_compra_madera"],
        "abonos":   ["add_abono_madera"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "proveedor_nombre": ["exact", "icontains"],
        "is_active": ["exact"]
    }
    search_fields = ["proveedor_nombre", "observaciones"]
    ordering_fields = ["creado_en", "monto_total", "saldo", "cantidad_cajas"]
    ordering = ["-creado_en"]

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
        # Lock semanal por fecha_inicio de temporada? Aquí tomamos "hoy" no estricto.
        if data.get("temporada") and data["temporada"].finalizada:
            return self.notify(key="compra_temporada_finalizada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="compra_creada", data={"compra": self.get_serializer(obj).data}, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if data.get("temporada") and data["temporada"].finalizada:
            return self.notify(key="compra_temporada_finalizada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="compra_actualizada", data={"compra": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if data.get("temporada", obj.temporada).finalizada:
            return self.notify(key="compra_temporada_finalizada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="compra_actualizada", data={"compra": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        with transaction.atomic():
            obj.archivar()
        return self.notify(key="compra_archivada", status_code=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def abonos(self, request, pk=None):
        compra = self.get_object()
        ser = RegistrarAbonoSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        monto = ser.validated_data["monto"]
        fecha = ser.validated_data.get("fecha")
        metodo = ser.validated_data.get("metodo")

        with transaction.atomic():
            abono = compra.registrar_abono(monto=monto, fecha=fecha, metodo=metodo)

        payload = {
            "compra": self.get_serializer(compra).data,
            "abono": AbonoMaderaSerializer(abono).data
        }
        return self.notify(key="compra_abonada", data=payload, status_code=status.HTTP_200_OK)

