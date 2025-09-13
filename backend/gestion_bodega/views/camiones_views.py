# gestion_bodega/views/camiones_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from gestion_bodega.models import CamionSalida, CamionItem, CierreSemanal
from gestion_bodega.serializers import CamionSalidaSerializer, CamionItemSerializer
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.views import NotificationMixin


def _semana_cerrada(bodega_id: int, temporada_id: int, fecha):
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id, temporada_id=temporada_id,
        fecha_desde__lte=fecha, fecha_hasta__gte=fecha, is_active=True
    ).exists()


class CamionSalidaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Camiones de salida (embarques) con manifiesto (CamionItem).
    - Acción confirmar asigna número correlativo por (bodega, temporada).
    - Bloqueo por semana cerrada en fecha_salida.
    """
    queryset = CamionSalida.objects.all().order_by("-fecha_salida", "-id")
    serializer_class = CamionSalidaSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_camion"],
        "retrieve": ["view_camion"],
        "create":   ["add_camion"],
        "update":   ["change_camion"],
        "partial_update": ["change_camion"],
        "destroy":  ["delete_camion"],
        "confirmar": ["confirm_camion"],
        "add_item": ["change_camion"],
        "remove_item": ["change_camion"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "numero": ["exact", "gte", "lte"],
        "estado": ["exact"],
        "fecha_salida": ["exact", "gte", "lte"],
        "is_active": ["exact"],
    }
    search_fields = ["placas", "chofer", "destino", "receptor", "observaciones"]
    ordering_fields = ["fecha_salida", "numero", "id"]
    ordering = ["-fecha_salida", "-id"]

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
        if _semana_cerrada(data["bodega"].id, data["temporada"].id, data["fecha_salida"]):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="camion_creado", data={"camion": self.get_serializer(obj).data}, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha_salida", obj.fecha_salida)):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="camion_actualizado", data={"camion": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha_salida", obj.fecha_salida)):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="camion_actualizado", data={"camion": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        with transaction.atomic():
            obj.archivar()
        return self.notify(key="camion_archivado", status_code=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def confirmar(self, request, pk=None):
        obj = self.get_object()
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            try:
                obj.confirmar()
            except serializers.ValidationError as e:
                return self.notify(key="camion_no_confirmable", data={"errors": e.detail if hasattr(e, "detail") else str(e)}, status_code=status.HTTP_400_BAD_REQUEST)

        return self.notify(key="camion_confirmado", data={"camion": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    # ----- Items del camión (manifiesto) -----
    @action(detail=True, methods=["post"], url_path="items/add")
    def add_item(self, request, pk=None):
        obj = self.get_object()
        ser = CamionItemSerializer(data={**request.data, "camion": obj.id})
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            item = ser.save()

        return self.notify(key="camion_item_creado", data={"item": CamionItemSerializer(item).data}, status_code=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="items/remove")
    def remove_item(self, request, pk=None):
        obj = self.get_object()
        item_id = request.data.get("item_id")
        if not item_id:
            return self.notify(key="validation_error", data={"errors": {"item_id": ["Este campo es requerido."]}}, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            item = obj.items.get(pk=item_id)
        except CamionItem.DoesNotExist:
            return self.notify(key="camion_item_no_encontrado", status_code=status.HTTP_404_NOT_FOUND)

        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            item.archivar()

        return self.notify(key="camion_item_archivado", status_code=status.HTTP_200_OK)
