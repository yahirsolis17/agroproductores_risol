from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError

from gestion_huerta.models import Temporada
from gestion_huerta.serializers import TemporadaSerializer
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.views.huerta_views import GenericPagination, NotificationMixin
from gestion_huerta.permissions import (
    HasHuertaModulePermission,
    HuertaGranularPermission,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers


class TemporadaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Temporada.objects.select_related(
        "huerta", "huerta_rentada"
    ).order_by("-año")
    serializer_class   = TemporadaSerializer
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if año := params.get("año"):
            qs = qs.filter(año=año)
        if h_id := params.get("huerta"):
            qs = qs.filter(huerta_id=h_id)
        if hr_id := params.get("huerta_rentada"):
            qs = qs.filter(huerta_rentada_id=hr_id)
        if arch := params.get("archivado"):
            qs = qs.exclude(archivado_en__isnull=(arch.lower() == "false"))
        return qs

    def create(self, request, *args, **kwargs):
        print("🛬 Payload CRUDO:", request.data)  # Aquí

        data = request.data.copy()
        for field in ['huerta', 'huerta_rentada']:
            if field not in data or data.get(field) in [None, '', 'null', 'None']:
                data.pop(field, None)

        print("🔬 Payload LIMPIO:", data)  # Aquí
        print("🧼 request.data:", request.data)
        print("🧼 huerta_rentada:", request.data.get("huerta_rentada"), type(request.data.get("huerta_rentada")))
        print("🧼 huerta:", request.data.get("huerta"), type(request.data.get("huerta")))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        instance.full_clean()
        registrar_actividad(request.user, f"Creó la temporada {instance.año}")

        return self.notify(
            key="temporada_create_success",
            data={"temporada": self.get_serializer(instance).data},
            status_code=status.HTTP_201_CREATED,
        )



    def update(self, request, *args, **kwargs):
        temp = self.get_object()

        if temp.finalizada:
            return self.notify(
                key="temporada_ya_finalizada",
                data={"info": "No se pueden editar temporadas finalizadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(temp, data=request.data, partial=kwargs.pop("partial", False))
        serializer.is_valid(raise_exception=True)
        temp = serializer.save()
        registrar_actividad(request.user, f"Actualizó la temporada {temp.año}")
        return self.notify(
            key="temporada_update_success",
            data={"temporada": serializer.data},
        )

    def destroy(self, request, *args, **kwargs):
        temp = self.get_object()
        nombre = f"Temporada {temp.año}"
        temp.delete()
        registrar_actividad(request.user, f"Eliminó la temporada: {nombre}")
        return self.notify(
            key="temporada_delete_success",
            data={"info": f"{nombre} eliminada."},
        )

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        temp = self.get_object()
        if temp.finalizada:
            return self.notify(
                key="temporada_ya_finalizada",
                data={"info": "Esta temporada ya fue finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        temp.finalizar()
        registrar_actividad(request.user, f"Finalizó la temporada {temp.año}")
        return self.notify(
            key="temporada_finalizada",
            data={"temporada": self.get_serializer(temp).data},
        )

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        temp = self.get_object()
        if not temp.is_active:
            return self.notify(
                key="temporada_ya_archivada",
                data={"info": "Esta temporada ya está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        temp.archivar()
        registrar_actividad(request.user, f"Archivó la temporada {temp.año}")
        return self.notify(
            key="temporada_archivada",
            data={"temporada": self.get_serializer(temp).data},
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        temp = self.get_object()
        if temp.is_active:
            return self.notify(
                key="temporada_no_archivada",
                data={"info": "Esta temporada ya está activa."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        temp.desarchivar()
        registrar_actividad(request.user, f"Restauró la temporada {temp.año}")
        return self.notify(
            key="temporada_restaurada",
            data={"temporada": self.get_serializer(temp).data},
        )
