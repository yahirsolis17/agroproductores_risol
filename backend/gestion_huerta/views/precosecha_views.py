# gestion_huerta/views/precosecha_views.py
from datetime import datetime

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.models import PreCosecha, Temporada
from gestion_huerta.serializers import PreCosechaSerializer
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin
from gestion_huerta.views.huerta_views import NotificationMixin, _has_error_code
from gestion_usuarios.permissions import HasModulePermission


def _parse_date(val: str):
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except Exception:
        return None


def _has_perm(user, codename: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "role", None) == "admin":
        return True
    return user.has_perm(f"gestion_huerta.{codename}")


def _map_precosecha_validation_errors(errors: dict) -> tuple[str, dict]:
    if _has_error_code(errors, "fecha_posterior_inicio_temporada"):
        return "precosecha_fecha_fuera_de_temporada", {"errors": errors}
    if _has_error_code(errors, "gastos_totales_cero"):
        return "precosecha_totales_cero", {"errors": errors}
    if _has_error_code(errors, "campo_requerido"):
        return "precosecha_field_obligatorio", {"errors": errors}
    if _has_error_code(errors, "valor_negativo"):
        return "precosecha_gasto_negativo", {"errors": errors}
    if _has_error_code(errors, "temporada_no_planificada"):
        return "precosecha_temporada_no_planificada", {"errors": errors}
    if _has_error_code(errors, "temporada_no_reasignable"):
        return "precosecha_temporada_no_reasignable", {"errors": errors}
    if _has_error_code(errors, "temporada_archivada"):
        return "precosecha_temporada_no_permitida", {"errors": errors}
    if _has_error_code(errors, "temporada_finalizada"):
        return "precosecha_temporada_no_permitida", {"errors": errors}
    if _has_error_code(errors, "categoria_archivada"):
        return "precosecha_categoria_archivada", {"errors": errors}
    if _has_error_code(errors, "origen_rentada_en_propia"):
        return "precosecha_origen_rentada_en_propia", {"errors": errors}
    if _has_error_code(errors, "origen_propia_en_rentada"):
        return "precosecha_origen_propia_en_rentada", {"errors": errors}
    if _has_error_code(errors, "huerta_archivada"):
        return "precosecha_huerta_archivada", {"errors": errors}
    if _has_error_code(errors, "huerta_rentada_archivada"):
        return "precosecha_huerta_rentada_archivada", {"errors": errors}
    return "validation_error", {"errors": errors}


class PreCosechaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    queryset = (
        PreCosecha.objects
        .select_related('categoria', 'temporada', 'huerta', 'huerta_rentada')
        .order_by('-fecha', '-id')
    )
    serializer_class = PreCosechaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['temporada', 'categoria', 'huerta', 'huerta_rentada']
    search_fields = ['descripcion']
    ordering_fields = ['fecha', 'id']

    _perm_map = {
        "list": ["view_precosecha"],
        "retrieve": ["view_precosecha"],
        "create": ["add_precosecha"],
        "update": ["change_precosecha"],
        "partial_update": ["change_precosecha"],
        "destroy": ["delete_precosecha"],
        "archivar": ["archive_precosecha"],
        "restaurar": ["restore_precosecha"],
    }

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_precosecha"])
        return [p() for p in self.permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        if self.action not in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            estado = (params.get("estado") or "activas").strip().lower()
            if estado in ("activas", "activos"):
                qs = qs.filter(is_active=True)
            elif estado in ("archivadas", "archivados"):
                qs = qs.filter(is_active=False)

            if fd := params.get('fecha_desde'):
                d = _parse_date(fd)
                if d:
                    qs = qs.filter(fecha__gte=d)
            if fh := params.get('fecha_hasta'):
                d = _parse_date(fh)
                if d:
                    qs = qs.filter(fecha__lte=d)

        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.notify_list(request=request, results=serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return self.notify_list(request=request, results=serializer.data, paginator=None)

    def _validate_temporada_editable(self, temporada: Temporada, action_label: str):
        if not temporada.is_active:
            return self.notify(
                key="precosecha_temporada_no_permitida",
                data={"info": f"No puedes {action_label} precosechas de una temporada archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if temporada.finalizada:
            return self.notify(
                key="precosecha_temporada_no_permitida",
                data={"info": f"No puedes {action_label} precosechas de una temporada finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if temporada.estado_operativo != Temporada.EstadoOperativo.PLANIFICADA:
            return self.notify(
                key="precosecha_temporada_congelada",
                data={"info": "La precosecha queda en solo lectura cuando la temporada ya es operativa."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return None

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_precosecha_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        block = self._validate_temporada_editable(ser.validated_data['temporada'], "registrar")
        if block:
            return block

        with transaction.atomic():
            self.perform_create(ser)

        registrar_actividad(request.user, f"Creó precosecha {ser.instance.id}")
        return self.notify(
            key="precosecha_create_success",
            data={"precosecha": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(
                key="precosecha_archivada_no_editar",
                data={"info": "No puedes editar una precosecha archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        block = self._validate_temporada_editable(instance.temporada, "editar")
        if block:
            return block

        ser = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_precosecha_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_update(ser)

        registrar_actividad(request.user, f"Actualizó precosecha {instance.id}")
        return self.notify(
            key="precosecha_update_success",
            data={"precosecha": ser.data},
            status_code=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        inst = self.get_object()
        block = self._validate_temporada_editable(inst.temporada, "eliminar")
        if block:
            return block

        if inst.is_active:
            return self.notify(
                key="precosecha_debe_estar_archivada",
                data={"info": "Debes archivar la precosecha antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            self.perform_destroy(inst)

        registrar_actividad(request.user, f"Eliminó precosecha {inst.id}")
        return self.notify(
            key="precosecha_delete_success",
            data={"info": "PreCosecha eliminada."},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        if not _has_perm(request.user, "archive_precosecha"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar precosechas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )

        inst = self.get_object()
        if not inst.is_active:
            return self.notify(key="precosecha_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        block = self._validate_temporada_editable(inst.temporada, "archivar")
        if block:
            return block

        with transaction.atomic():
            inst.archivar()

        registrar_actividad(request.user, f"Archivó precosecha {inst.id}")
        return self.notify(
            key="precosecha_archivada",
            data={"precosecha": self.get_serializer(inst).data},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        if not _has_perm(request.user, "restore_precosecha"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar precosechas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )

        inst = self.get_object()
        if inst.is_active:
            return self.notify(key="precosecha_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        block = self._validate_temporada_editable(inst.temporada, "restaurar")
        if block:
            return block

        with transaction.atomic():
            inst.desarchivar()

        registrar_actividad(request.user, f"Restauró precosecha {inst.id}")
        return self.notify(
            key="precosecha_restaurada",
            data={"precosecha": self.get_serializer(inst).data},
            status_code=status.HTTP_200_OK,
        )
