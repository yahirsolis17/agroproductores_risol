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
    # Solo activas por defecto
    queryset = CategoriaInversion.objects.filter(is_active=True).order_by('id')
    serializer_class = CategoriaInversionSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

    # --- LISTA TODAS (incluye archivadas) para modo edición ---
    @action(detail=False, methods=["get"], url_path="all")
    def list_all(self, request):
        qs = CategoriaInversion.objects.all().order_by('id')
        page = self.paginate_queryset(qs)
        ser  = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "categorias": ser.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            }
        )

    # --- ARCHIVAR ---
    @action(detail=True, methods=["patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        cat = self.get_object()
        if not cat.is_active:
            return self.notify(key="categoria_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        cat.archivar()
        return self.notify(key="categoria_archivada", data={"categoria": self.get_serializer(cat).data})

    # --- RESTAURAR ---
    @action(detail=True, methods=["patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        cat = self.get_object()
        if cat.is_active:
            return self.notify(key="categoria_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        cat.desarchivar()
        return self.notify(key="categoria_restaurada", data={"categoria": self.get_serializer(cat).data})

    # --- DELETE seguro ---
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.inversiones.exists():
            return self.notify(
                key="categoria_con_inversiones",
                data={"info": "No puedes eliminar la categoría porque tiene inversiones asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return self.notify(key="categoria_delete_success", data={"info": "Categoría eliminada."})