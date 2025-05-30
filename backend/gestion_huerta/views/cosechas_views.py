import logging
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

# Modelos
from gestion_huerta.views.huerta_views import GenericPagination, NotificationMixin
from gestion_huerta.models import (
    Cosecha,
)

# Serializadores
from gestion_huerta.serializers import (
    CosechaSerializer,
)

# Permisos
from gestion_huerta.permissions import (
    HasHuertaModulePermission, HuertaGranularPermission
)

# Utilidades
from gestion_huerta.utils.activity import registrar_actividad

logger = logging.getLogger(__name__)



# ---------------------------------------------------------------------------
#  🌾  COSECHAS
# ---------------------------------------------------------------------------
class CosechaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Cosecha.objects.select_related("huerta").prefetch_related(
        "inversiones", "ventas"
    ).order_by("-fecha_creacion")
    serializer_class = CosechaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # --- CREATE ---
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data.setdefault("fecha_inicio", timezone.now())
        data["fecha_creacion"] = timezone.now()
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Registró la cosecha: {obj.nombre}")
        return self.notify(
            key="cosecha_create_success",
            data={"cosecha": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    # --- UPDATE ---
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        registrar_actividad(request.user, f"Actualizó la cosecha: {obj.nombre}")
        return self.notify(
            key="cosecha_update_success",
            data={"cosecha": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    # --- DESTROY ---
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre
        instance.delete()
        registrar_actividad(request.user, f"Eliminó la cosecha: {nombre}")
        return self.notify(
            key="cosecha_delete_success",
            data={"info": f"Cosecha '{nombre}' eliminada con éxito."},
            status_code=status.HTTP_200_OK,
        )

    # --- ACCIÓN EXTRA: TOGGLE ESTADO ---
    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle_estado(self, request, pk=None):
        cosecha = self.get_object()
        cosecha.finalizada = not cosecha.finalizada
        cosecha.fecha_fin = timezone.now() if cosecha.finalizada else None
        cosecha.save()
        estado = "finalizada" if cosecha.finalizada else "en progreso"
        registrar_actividad(
            request.user, f"Marcó la cosecha '{cosecha.nombre}' como {estado}"
        )
        serializer = self.get_serializer(cosecha)
        return self.notify(
            key="toggle_cosecha_success",
            data={"cosecha": serializer.data},
            status_code=status.HTTP_200_OK,
        )
