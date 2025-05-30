
import logging
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Modelos
from gestion_huerta.models import (
Venta
)

# Serializadores
from gestion_huerta.serializers import (
VentaSerializer
)

# Permisos
from gestion_huerta.permissions import (
    HasHuertaModulePermission, HuertaGranularPermission
)

# Utilidades
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.views.huerta_views import GenericPagination, NotificationMixin

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
#  💵  VENTAS
# ---------------------------------------------------------------------------
class VentaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Venta.objects.select_related("cosecha", "huerta").order_by("-fecha_venta")
    serializer_class = VentaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ----- FILTRO POR COSECHA -----
    def get_queryset(self):
        qs = super().get_queryset()
        cosecha_id = self.request.query_params.get("cosecha")
        if cosecha_id:
            qs = qs.filter(cosecha_id=cosecha_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(
            request.user, f"Registró una venta de {obj.num_cajas} cajas"
        )
        return self.notify(
            key="venta_create_success",
            data={"venta": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la venta ID: {obj.id}")
        return self.notify(
            key="venta_update_success",
            data={"venta": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        venta_id = instance.id
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la venta ID: {venta_id}")
        return self.notify(
            key="venta_delete_success",
            data={"info": "Venta eliminada correctamente."},
            status_code=status.HTTP_200_OK,
        )
