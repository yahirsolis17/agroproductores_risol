# gestion_huerta/views/categoria_precosecha_views.py
from django.db import transaction
from django.db.models import Count
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.models import CategoriaPreCosecha
from gestion_huerta.serializers import CategoriaPreCosechaSerializer
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin
from gestion_huerta.views.huerta_views import NotificationMixin, _has_error_code
from gestion_usuarios.permissions import HasModulePermission


def _map_categoria_validation_errors(errors: dict) -> tuple[str, dict]:
    if _has_error_code(errors, "nombre_muy_corto"):
        return "categoria_precosecha_nombre_corto", {"errors": errors}
    if _has_error_code(errors, "categoria_duplicada"):
        return "categoria_precosecha_nombre_duplicado", {"errors": errors}
    return "validation_error", {"errors": errors}


def _has_perm(user, codename: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "role", None) == "admin":
        return True
    return user.has_perm(f"gestion_huerta.{codename}")


class CategoriaPreCosechaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    serializer_class = CategoriaPreCosechaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'id']

    _perm_map = {
        "list": ["view_categoriaprecosecha"],
        "retrieve": ["view_categoriaprecosecha"],
        "create": ["add_categoriaprecosecha"],
        "update": ["change_categoriaprecosecha"],
        "partial_update": ["change_categoriaprecosecha"],
        "destroy": ["delete_categoriaprecosecha"],
        "archivar": ["archive_categoriaprecosecha"],
        "restaurar": ["restore_categoriaprecosecha"],
        "list_all": ["view_categoriaprecosecha"],
    }

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_categoriaprecosecha"])
        return [p() for p in self.permission_classes]

    def get_queryset(self):
        base = (
            CategoriaPreCosecha.objects
            .all()
            .annotate(uso_count=Count('precosechas'))
            .order_by('nombre')
        )

        if getattr(self, 'action', None) in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            return base

        estado = (self.request.query_params.get("estado") or "activas").strip().lower()
        if estado in ("activas", "activos"):
            return base.filter(is_active=True)
        if estado in ("archivadas", "archivados"):
            return base.filter(is_active=False)
        if estado in ("todas", "todos", "all"):
            return base
        return base.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.notify_list(request=request, results=serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return self.notify_list(request=request, results=serializer.data, paginator=None)

    @action(detail=False, methods=["get"], url_path="all")
    def list_all(self, request):
        qs = (
            CategoriaPreCosecha.objects
            .all()
            .annotate(uso_count=Count('precosechas'))
            .order_by('nombre')
        )
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.notify_list(request=request, results=serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return self.notify_list(request=request, results=serializer.data, paginator=None)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_categoria_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_create(ser)

        registrar_actividad(request.user, f"Creó categoría de precosecha {ser.instance.id}")
        return self.notify(
            key="categoria_precosecha_create_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        inst = self.get_object()
        if not inst.is_active:
            return self.notify(
                key="categoria_precosecha_archivada_no_editar",
                data={"info": "No puedes editar una categoría archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        ser = self.get_serializer(inst, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_categoria_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_update(ser)

        registrar_actividad(request.user, f"Actualizó categoría de precosecha {inst.id}")
        return self.notify(
            key="categoria_precosecha_update_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        cat = self.get_object()
        if cat.is_active:
            return self.notify(
                key="categoria_precosecha_debe_estar_archivada",
                data={"info": "Debes archivar la categoría antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if cat.precosechas.exists():
            return self.notify(
                key="categoria_precosecha_con_registros",
                data={"info": "No puedes eliminar la categoría porque tiene registros asociados."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            self.perform_destroy(cat)

        registrar_actividad(request.user, f"Eliminó categoría de precosecha {cat.id}")
        return self.notify(
            key="categoria_precosecha_delete_success",
            data={"info": "Categoría eliminada."},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        if not _has_perm(request.user, "archive_categoriaprecosecha"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar categorías."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        cat = self.get_object()
        if not cat.is_active:
            return self.notify(key="categoria_precosecha_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cat.archivar()

        registrar_actividad(request.user, f"Archivó categoría de precosecha {cat.id}")
        return self.notify(
            key="categoria_precosecha_archivada",
            data={"categoria": self.get_serializer(cat).data},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        if not _has_perm(request.user, "restore_categoriaprecosecha"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar categorías."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        cat = self.get_object()
        if cat.is_active:
            return self.notify(key="categoria_precosecha_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cat.desarchivar()

        registrar_actividad(request.user, f"Restauró categoría de precosecha {cat.id}")
        return self.notify(
            key="categoria_precosecha_restaurada",
            data={"categoria": self.get_serializer(cat).data},
            status_code=status.HTTP_200_OK,
        )
