# gestion_huerta/views/categoria_inversion_views.py
from rest_framework import viewsets, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count

from gestion_huerta.models import CategoriaInversion
from gestion_huerta.serializers import CategoriaInversionSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin


class CategoriaInversionViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de categorías con soft-delete + filtro por estado (activas|archivadas|todas)
    y orden alfabético por nombre. Expone uso_count para saber si puede eliminarse.
    """
    serializer_class   = CategoriaInversionSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['nombre']
    ordering_fields    = ['nombre', 'id']

    def get_queryset(self):
        base = (
            CategoriaInversion.objects
            .all()
            .annotate(uso_count=Count('inversiones'))
            .order_by('nombre')
        )

        # ⚠️ Para acciones de detalle NO filtramos por estado, así /restaurar no da 404
        if getattr(self, 'action', None) in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            return base

        # Listados: estado = activas|archivadas|todas (default activas)
        estado = (self.request.query_params.get('estado') or 'activas').strip().lower()
        if estado == 'activas':
            return base.filter(is_active=True)
        elif estado == 'archivadas':
            return base.filter(is_active=False)
        return base

    # ------------------------------ LIST
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

    # GET /huerta/categorias-inversion/all
    @action(detail=False, methods=["get"], url_path="all")
    def list_all(self, request):
        qs         = CategoriaInversion.objects.all().annotate(uso_count=Count('inversiones')).order_by('nombre')
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

    # ------------------------------ CREATE
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
            key="categoria_inversion_create_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ UPDATE
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
            key="categoria_inversion_update_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ DELETE (bloqueada si tiene inversiones)
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
        return self.notify(
            key="categoria_inversion_delete_success",
            data={"info": "Categoría eliminada."},
            status_code=status.HTTP_200_OK
        )

    # ------------------------------ ARCHIVAR / RESTAURAR
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
