# gestion_huerta/views/categoria_inversion_views.py
from rest_framework import viewsets, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.db import transaction

from gestion_huerta.models import CategoriaInversion
from gestion_huerta.serializers import CategoriaInversionSerializer
from gestion_huerta.views.huerta_views import NotificationMixin, _has_error_code
from gestion_usuarios.permissions import HasModulePermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin


def _map_categoria_validation_errors(errors: dict) -> tuple[str, dict]:
    """
    Mapea mensajes de validación del serializer a claves de notificación específicas.
    """
    def _texts(v):
        if v is None:
            return []
        if isinstance(v, (list, tuple)):
            return [str(x) for x in v]
        if isinstance(v, dict):
            out = []
            for vv in v.values():
                out += _texts(vv)
            return out
        return [str(v)]

    # _has_error_code importado de huerta_views

    if _has_error_code(errors, "nombre_muy_corto"):
        return "categoria_nombre_corto", {"errors": errors}
    if _has_error_code(errors, "categoria_duplicada"):
        return "categoria_nombre_duplicado", {"errors": errors}
    return "validation_error", {"errors": errors}


def _has_perm(user, codename: str) -> bool:
    """Comprueba si el usuario tiene el permiso indicado."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "role", None) == "admin":
        return True
    return user.has_perm(f"gestion_huerta.{codename}")


class CategoriaInversionViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de categorías con soft-delete + filtro por estado (activas|archivadas|todas),
    orden alfabético y 'uso_count' (n° de inversiones) para decisiones en UI.
    Reglas:
    - No se puede **editar** una categoría archivada.
    - No se puede **eliminar** si está activa o si tiene inversiones.
    """
    serializer_class   = CategoriaInversionSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['nombre']
    ordering_fields    = ['nombre', 'id']

    # 👇 mapa de permisos por acción
    _perm_map = {
        "list":           ["view_categoriainversion"],
        "retrieve":       ["view_categoriainversion"],
        "create":         ["add_categoriainversion"],
        "update":         ["change_categoriainversion"],
        "partial_update": ["change_categoriainversion"],
        "destroy":        ["delete_categoriainversion"],
        "archivar":       ["archive_categoriainversion"],
        "restaurar":      ["restore_categoriainversion"],
        "list_all":       ["view_categoriainversion"],  # acción custom
    }

    def get_permissions(self):
        # Hace visible a HasModulePermission qué codenames exigir
        self.required_permissions = self._perm_map.get(self.action, ["view_categoriainversion"])
        return [p() for p in self.permission_classes]

    def get_queryset(self):
        base = (
            CategoriaInversion.objects
            .all()
            .annotate(uso_count=Count('inversiones'))
            .order_by('nombre')
        )

        # En acciones de detalle no filtramos por estado (evita 404 al restaurar/archivar)
        if getattr(self, 'action', None) in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            return base

        # Listados: estado = activas|archivadas|todas (default activas)
        estado = (self.request.query_params.get("estado") or "activas").strip().lower()

        if estado in ("activas", "activos"):
            return base.filter(is_active=True)
        elif estado in ("archivadas", "archivados"):
            return base.filter(is_active=False)
        elif estado in ("todas", "todos", "all"):
            return base

        return base.filter(is_active=True)

    # ------------------------------ LIST
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.notify_list(request=request, results=serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return self.notify_list(request=request, results=serializer.data, paginator=None)

    # GET /huerta/categorias-inversion/all  (útil para selects globales)
    @action(detail=False, methods=["get"], url_path="all")
    def list_all(self, request):
        qs = (
            CategoriaInversion.objects
            .all()
            .annotate(uso_count=Count('inversiones'))
            .order_by('nombre')
        )
        page = self.paginate_queryset(qs)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.notify_list(request=request, results=serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return self.notify_list(request=request, results=serializer.data, paginator=None)

    # ------------------------------ CREATE
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_categoria_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_create(ser)

        registrar_actividad(request.user, f"Creó categoría {ser.instance.id}")
        return self.notify(
            key="categoria_inversion_create_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ UPDATE (no permitir si está archivada)
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        inst    = self.get_object()
        if not inst.is_active:
            return self.notify(
                key="categoria_archivada_no_editar",
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

        registrar_actividad(request.user, f"Actualizó categoría {inst.id}")
        return self.notify(
            key="categoria_inversion_update_success",
            data={"categoria": ser.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ DELETE
    def destroy(self, request, *args, **kwargs):
        cat = self.get_object()
        if cat.is_active:
            return self.notify(
                key="categoria_debe_estar_archivada",
                data={"info": "Debes archivar la categoría antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if cat.inversiones.exists():
            return self.notify(
                key="categoria_con_inversiones",
                data={"info": "No puedes eliminar la categoría porque tiene inversiones asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
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
        if not _has_perm(request.user, "archive_categoriainversion"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar categorías."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        cat = self.get_object()
        if not cat.is_active:
            return self.notify(key="categoria_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cat.archivar()

        registrar_actividad(request.user, f"Archivó categoría {cat.id}")
        return self.notify(
            key="categoria_archivada",
            data={"categoria": self.get_serializer(cat).data},
            status_code=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        if not _has_perm(request.user, "restore_categoriainversion"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar categorías."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        cat = self.get_object()
        if cat.is_active:
            return self.notify(key="categoria_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cat.desarchivar()

        registrar_actividad(request.user, f"Restauró categoría {cat.id}")
        return self.notify(
            key="categoria_restaurada",
            data={"categoria": self.get_serializer(cat).data},
            status_code=status.HTTP_200_OK
        )
