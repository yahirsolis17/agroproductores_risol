from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import CategoriaInversion
from gestion_huerta.serializers import CategoriaInversionSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit   import ViewSetAuditMixin                 # ⬅️ auditoría

# ─────────────────────────────────────────────────────────────────────────────
#  CATEGORÍAS DE INVERSIÓN
# ─────────────────────────────────────────────────────────────────────────────
class CategoriaInversionViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de categorías con soft-delete + endpoint /all para incluir inactivas.
    """
    queryset           = CategoriaInversion.objects.filter(is_active=True).order_by('id')
    serializer_class   = CategoriaInversionSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['nombre']
    ordering_fields    = ['nombre', 'id']

    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
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
            },
            status_code=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"], url_path="all")
    def list_all(self, request):
        qs         = CategoriaInversion.objects.all().order_by('id')
        page       = self.paginate_queryset(qs)
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
            },
            status_code=status.HTTP_200_OK
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
        registrar_actividad(request.user, f"Creó categoría {ser.instance.id}")
        return self.notify(
            key="categoria_create_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        inst    = self.get_object()
        ser     = self.get_serializer(inst, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(ser)
        registrar_actividad(request.user, f"Actualizó categoría {inst.id}")
        return self.notify(
            key="categoria_update_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        cat = self.get_object()
        if cat.inversiones.exists():
            return self.notify(
                key="categoria_con_inversiones",
                data={"info": "No puedes eliminar la categoría porque tiene inversiones asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(cat)
        registrar_actividad(request.user, f"Eliminó categoría {cat.id}")
        return self.notify(key="categoria_delete_success", data={"info": "Categoría eliminada."}, status_code=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        cat = self.get_object()
        if not cat.is_active:
            return self.notify(key="categoria_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        cat.archivar()
        registrar_actividad(request.user, f"Archivó categoría {cat.id}")
        return self.notify(
            key="categoria_archivada",
            data={"categoria": self.get_serializer(cat).data},
            status_code=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        cat = self.get_object()
        if cat.is_active:
            return self.notify(key="categoria_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        cat.desarchivar()
        registrar_actividad(request.user, f"Restauró categoría {cat.id}")
        return self.notify(
            key="categoria_restaurada",
            data={"categoria": self.get_serializer(cat).data},
            status_code=status.HTTP_200_OK
        )
