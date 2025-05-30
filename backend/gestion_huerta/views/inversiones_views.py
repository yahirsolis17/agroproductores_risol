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
    InversionesHuerta, CategoriaInversion
)

# Serializadores
from gestion_huerta.serializers import (
InversionesHuertaSerializer,
    CategoriaInversionSerializer
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
#  💰  CATEGORÍAS DE INVERSIÓN
# ---------------------------------------------------------------------------
class CategoriaInversionViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = CategoriaInversion.objects.all().order_by("nombre")
    serializer_class = CategoriaInversionSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return self.notify(
            key="data_processed_success",
            data={"categorias": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(
            request.user, f"Creó la categoría de inversión: {obj.nombre}"
        )
        return self.notify(
            key="categoria_inversion_create_success",
            data={"categoria": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(
            request.user, f"Actualizó la categoría de inversión: {obj.nombre}"
        )
        return self.notify(
            key="categoria_inversion_update_success",
            data={"categoria": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre
        instance.delete()
        registrar_actividad(
            request.user, f"Eliminó la categoría de inversión: {nombre}"
        )
        return self.notify(
            key="categoria_inversion_delete_success",
            data={"info": f"Categoría '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
#  🪙  INVERSIONES
# ---------------------------------------------------------------------------
class InversionViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = InversionesHuerta.objects.select_related(
        "categoria", "huerta"
    ).order_by("-fecha")
    serializer_class = InversionesHuertaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # -------- FILTRO POR COSECHA --------
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
        registrar_actividad(request.user, f"Registró una inversión: {obj.nombre}")
        return self.notify(
            key="inversion_create_success",
            data={"inversion": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la inversión: {obj.nombre}")
        return self.notify(
            key="inversion_update_success",
            data={"inversion": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la inversión: {nombre}")
        return self.notify(
            key="inversion_delete_success",
            data={"info": f"Inversión '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )