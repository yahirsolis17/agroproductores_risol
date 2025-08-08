from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from gestion_huerta.models import InversionesHuerta
from gestion_huerta.serializers import InversionesHuertaSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad

class InversionHuertaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    Gestiona inversiones por cosecha: CRUD + archivar/restaurar,
    con filtros por cosecha, temporada, huerta y categoría.
    """
    queryset = (
        InversionesHuerta.objects
        .select_related('categoria', 'cosecha', 'temporada', 'huerta')
        .order_by('-fecha')
    )
    serializer_class = InversionesHuertaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['cosecha', 'temporada', 'huerta', 'categoria']
    search_fields      = ['descripcion']
    ordering_fields    = ['fecha']

    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "inversiones": serializer.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            }
        )

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_create(ser)
        inv = ser.instance
        registrar_actividad(request.user, f"Creó inversión {inv.id} en cosecha {inv.cosecha.id}")
        return self.notify(
            key="inversion_create_success",
            data={"inversion": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        inst     = self.get_object()
        ser      = self.get_serializer(inst, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(ser)
        registrar_actividad(request.user, f"Actualizó inversión {inst.id}")
        return self.notify(
            key="inversion_update_success",
            data={"inversion": ser.data},
        )

    def destroy(self, request, *args, **kwargs):
        inv = self.get_object()
        self.perform_destroy(inv)
        registrar_actividad(request.user, f"Eliminó inversión {inv.id}")
        return self.notify(
            key="inversion_delete_success",
            data={"info": "Inversión eliminada."}
        )

    @action(detail=True, methods=["patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        inv = self.get_object()
        if not inv.is_active:
            return self.notify(key="inversion_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        inv.is_active = False
        inv.archivado_en = timezone.now()
        inv.save(update_fields=["is_active", "archivado_en"])
        registrar_actividad(request.user, f"Archivó inversión {inv.id}")
        return self.notify(
            key="inversion_archivada",
            data={"inversion": self.get_serializer(inv).data}
        )

    @action(detail=True, methods=["patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        inv = self.get_object()
        if inv.is_active:
            return self.notify(key="inversion_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        inv.is_active = True
        inv.archivado_en = None
        inv.save(update_fields=["is_active", "archivado_en"])
        registrar_actividad(request.user, f"Restauró inversión {inv.id}")
        return self.notify(
            key="inversion_restaurada",
            data={"inversion": self.get_serializer(inv).data}
        )
