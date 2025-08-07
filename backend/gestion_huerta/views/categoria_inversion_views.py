# backend/gestion_huerta/views/categoria_inversion_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import CategoriaInversion
from gestion_huerta.serializers import CategoriaInversionSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination

class CategoriaInversionViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de categorías de inversión
    """
    queryset = CategoriaInversion.objects.all().order_by('id')
    serializer_class = CategoriaInversionSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "categorias": serializer.data,
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
            key="categoria_create_success",
            data={"categoria": ser.data},
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
            key="categoria_update_success",
            data={"categoria": ser.data},
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.inversiones.exists():
            return self.notify(
                key="categoria_referenciada",
                data={"error": "No se puede eliminar una categoría con inversiones asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return self.notify(
            key="categoria_delete_success",
            data={"info": "Categoría eliminada."}
        )

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        cat = self.get_object()
        if not cat.is_active:
            return self.notify(key="categoria_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        cat.archivar()
        return self.notify(
            key="categoria_archivada",
            data={"categoria": self.get_serializer(cat).data},
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        cat = self.get_object()
        if cat.is_active:
            return self.notify(key="categoria_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        cat.restaurar()
        return self.notify(
            key="categoria_restaurada",
            data={"categoria": self.get_serializer(cat).data},
        )
