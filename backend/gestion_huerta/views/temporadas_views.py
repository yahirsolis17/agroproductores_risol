# src/modules/gestion_huerta/views/temporada_views.py

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import Temporada, Huerta, HuertaRentada
from gestion_huerta.serializers import TemporadaSerializer
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.views.huerta_views import GenericPagination, NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission

class TemporadaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de temporadas + acción custom “finalizar/reactivar”.
    Sigue el patrón de HuertaViewSet: NotificationMixin + GenericPagination.
    """
    queryset = Temporada.objects.select_related("huerta", "huerta_rentada").order_by("-año")
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

        # Filtro por año (opcional)
        if año := params.get("año"):
            qs = qs.filter(año=año)

        # Filtro por huerta propia
        if h_id := params.get("huerta"):
            qs = qs.filter(huerta_id=h_id)

        # Filtro por huerta rentada
        if hr_id := params.get("huerta_rentada"):
            qs = qs.filter(huerta_rentada_id=hr_id)

        # Filtro por archivado
        if (arch := params.get("archivado")) is not None:
            qs = qs.exclude(archivado_en__isnull=(arch.lower() == "false"))
        return qs

    def list(self, request, *args, **kwargs):
        """
        Listado paginado de temporadas en la forma:
        { success, notification, data: { temporadas: […], meta: { count, next, previous } } }
        """
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)

        return self.notify(
            key="no_notification",
            data={
                "temporadas": serializer.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                },
            },
            status_code=status.HTTP_200_OK
        )

    def create(self, request, *args, **kwargs):
        """
        Crea una nueva temporada: valida que huerta/huerta_rentada exista y esté activa,
        luego usa el serializador (evita duplicados).
        Retorna: { success, notification, data: { temporada: { … } } }
        """
        data = request.data.copy()
        # Eliminar campos vacíos de huerta o huerta_rentada
        for field in ["huerta", "huerta_rentada"]:
            if field in data and data.get(field) in [None, "", "null", "None"]:
                data.pop(field)

        # Validar huerta propia
        if "huerta" in data:
            try:
                huerta = Huerta.objects.get(id=data["huerta"])
                if not huerta.is_active:
                    return self.notify(
                        key="huerta_archivada_temporada",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )
            except Huerta.DoesNotExist:
                return self.notify(
                    key="validation_error",
                    data={"errors": {"huerta": ["La huerta no existe."]}},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        # Validar huerta rentada
        if "huerta_rentada" in data:
            try:
                huerta_r = HuertaRentada.objects.get(id=data["huerta_rentada"])
                if not huerta_r.is_active:
                    return self.notify(
                        key="huerta_rentada_archivada",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )
            except HuertaRentada.DoesNotExist:
                return self.notify(
                    key="validation_error",
                    data={"errors": {"huerta_rentada": ["La huerta rentada no existe."]}},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        # Serialización y validación de duplicados
        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="temporada_duplicada",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        instance = serializer.save()
        instance.full_clean()
        registrar_actividad(request.user, f"Creó la temporada {instance.año}")

        return self.notify(
            key="temporada_create_success",
            data={"temporada": self.get_serializer(instance).data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """
        Actualiza una temporada existente. Validación igual que create.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        temporada = serializer.save()
        registrar_actividad(request.user, f"Actualizó la temporada {temporada.año}")
        return self.notify(
            key="temporada_update_success",
            data={"temporada": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        """
        Hard delete de una temporada: si tiene cosechas, devuelve error.
        """
        temp = self.get_object()
        if temp.cosechas.exists():
            return self.notify(
                key="temporada_con_dependencias",
                data={"error": "No se puede eliminar. Tiene cosechas asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        nombre = f"Temporada {temp.año}"
        temp.delete()
        registrar_actividad(request.user, f"Eliminó la temporada: {nombre}")
        return self.notify(
            key="temporada_delete_success",
            data={"info": f"{nombre} eliminada."},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        """
        Acción “finalizar ↔ reactivar” en un solo endpoint:

        - Si la temporada NO está finalizada: la marca como finalizada (finalizada=True y fecha_fin=fecha de hoy).
        - Si YA estaba finalizada: la “reactiva” (finalizada=False y fecha_fin=None).

        Retorna la notificación adecuada: 
        - "temporada_finalizada" o 
        - "temporada_reactivada"
        """
        temp = self.get_object()

        # Si NO está finalizada: la finalizamos
        if not temp.finalizada:
            temp.finalizar()  # ahora guarda .date() en fecha_fin
            registrar_actividad(request.user, f"Finalizó la temporada {temp.año}")
            return self.notify(
                key="temporada_finalizada",
                data={"temporada": self.get_serializer(temp).data},
                status_code=status.HTTP_200_OK,
            )

        # Si YA estaba finalizada: la reactivamos
        temp.finalizada = False
        temp.fecha_fin = None
        temp.save(update_fields=["finalizada", "fecha_fin"])
        registrar_actividad(request.user, f"Reactivó la temporada {temp.año}")
        return self.notify(
            key="temporada_reactivada",
            data={"temporada": self.get_serializer(temp).data},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        """
        Acción para archivar (soft-delete) temporada + cascada a cosechas/inversiones/ventas.
        """
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
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        """
        Acción para restaurar (desarchivar) temporada + cascada en cosechas/inversiones/ventas.
        """
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
            status_code=status.HTTP_200_OK,
        )
