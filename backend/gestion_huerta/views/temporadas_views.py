# src/modules/gestion_huerta/views/temporada_views.py

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import Temporada
from gestion_huerta.serializers import TemporadaSerializer
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.views.huerta_views import GenericPagination, NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission


class TemporadaViewSet(NotificationMixin, viewsets.ModelViewSet):
    queryset = Temporada.objects.select_related(
        "huerta", "huerta_rentada"
    ).order_by("-año")
    serializer_class = TemporadaSerializer
    pagination_class = GenericPagination
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
        print("🛬 Payload recibido:", request.data)

        # Limpiar campos vacíos
        data = request.data.copy()
        for field in ['huerta', 'huerta_rentada']:
            if field not in data or data.get(field) in [None, '', 'null', 'None']:
                data.pop(field, None)

        # Validar huerta archivada
        from gestion_huerta.models import Huerta, HuertaRentada

        if 'huerta' in data:
            try:
                huerta = Huerta.objects.get(id=data['huerta'])
                if not huerta.is_active:
                    return self.notify(
                        key="huerta_archivada_temporada",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            except Huerta.DoesNotExist:
                return self.notify(
                    key="validation_error",
                    data={"errors": {"huerta": ["La huerta no existe."]}},
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        if 'huerta_rentada' in data:
            try:
                huerta_r = HuertaRentada.objects.get(id=data['huerta_rentada'])
                if not huerta_r.is_active:
                    return self.notify(
                        key="huerta_rentada_archivada",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            except HuertaRentada.DoesNotExist:
                return self.notify(
                    key="validation_error",
                    data={"errors": {"huerta_rentada": ["La huerta rentada no existe."]}},
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        # Validar datos con el serializador
        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="temporada_duplicada",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Guardar instancia
        instance = serializer.save()
        instance.full_clean()

        # Registrar actividad
        registrar_actividad(request.user, f"Creó la temporada {instance.año}")

        return self.notify(
            key="temporada_create_success",
            data={"temporada": self.get_serializer(instance).data},
            status_code=status.HTTP_201_CREATED,
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
