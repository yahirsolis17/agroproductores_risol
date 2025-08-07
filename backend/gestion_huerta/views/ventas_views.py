# backend/gestion_huerta/views/ventas_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from gestion_huerta.models import Venta
from gestion_huerta.serializers import VentaSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination

class VentaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de ventas por cosecha + archivar/restaurar
    """
    queryset = Venta.objects.select_related('cosecha','huerta','temporada').order_by('-fecha_venta')
    serializer_class = VentaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['cosecha', 'huerta', 'temporada', 'tipo_mango']
    search_fields = ['tipo_mango', 'descripcion']

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "ventas": serializer.data,
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
        return self.notify(
            key="venta_create_success",
            data={"venta": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        ser      = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(ser)
        return self.notify(
            key="venta_update_success",
            data={"venta": ser.data},
        )

    def destroy(self, request, *args, **kwargs):
        inst = self.get_object()
        self.perform_destroy(inst)
        return self.notify(
            key="venta_delete_success",
            data={"info": "Venta eliminada."}
        )

    @action(detail=True, methods=["patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        v = self.get_object()
        if not v.is_active:
            return self.notify(key="venta_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        v.is_active = False
        v.archivado_en = timezone.now()
        v.save(update_fields=["is_active","archivado_en"])
        return self.notify(key="venta_archivada", data={"venta": self.get_serializer(v).data})

    @action(detail=True, methods=["patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        v = self.get_object()
        if v.is_active:
            return self.notify(key="venta_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        v.is_active = True
        v.archivado_en = None
        v.save(update_fields=["is_active","archivado_en"])
        return self.notify(key="venta_restaurada", data={"venta": self.get_serializer(v).data})
