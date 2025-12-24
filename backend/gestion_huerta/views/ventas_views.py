# src/modules/gestion_huerta/views/ventas_views.py
from rest_framework import viewsets, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from datetime import datetime

from gestion_huerta.models import Venta, Cosecha
from gestion_huerta.serializers import VentaSerializer
from gestion_huerta.views.huerta_views import NotificationMixin, _has_error_code
from gestion_usuarios.permissions import HasModulePermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin


# ---------- Helpers de mapeo de errores ----------
def _texts(val):
    if val is None:
        return []
    if isinstance(val, (list, tuple)):
        return [str(x) for x in val]
    if isinstance(val, dict):
        # recolecta recursivamente
        out = []
        for v in val.values():
            out.extend(_texts(v))
        return out
    return [str(val)]


def _map_venta_validation_errors(errors: dict) -> tuple[str, dict]:
    """
    Traduce mensajes del serializer/modelo a claves de notificación declaradas
    en NOTIFICATION_MESSAGES. Devuelve (key, data).
    """
    # _has_error_code importado de huerta_views

    # Fechas
    if _has_error_code(errors, "fecha_fuera_rango"): return "venta_fecha_fuera_de_rango", {"errors": errors}
    if _has_error_code(errors, "fecha_anterior_cosecha"): return "venta_fecha_antes_inicio_cosecha", {"errors": errors}

    # Coherencias
    if _has_error_code(errors, "falta_cosecha"): return "venta_cosecha_requerida", {"errors": errors}
    if _has_error_code(errors, "temporada_inconsistente"): return "venta_temporada_incoherente", {"errors": errors}
    if _has_error_code(errors, "huerta_inconsistente"): return "venta_huerta_incoherente", {"errors": errors}
    if _has_error_code(errors, "huerta_rentada_inconsistente"): return "venta_huerta_rentada_incoherente", {"errors": errors}
    if _has_error_code(errors, "origen_ambiguo"): return "venta_origen_ambos_definidos", {"errors": errors}
    if _has_error_code(errors, "falta_origen"): return "venta_origen_indefinido", {"errors": errors}

    # Estados de temporada
    if _has_error_code(errors, "temporada_invalida"): return "venta_temporada_no_permitida", {"errors": errors}
    if _has_error_code(errors, "temporada_archivada"): return "venta_temporada_no_permitida", {"errors": errors}
    if _has_error_code(errors, "temporada_finalizada"): return "venta_temporada_no_permitida", {"errors": errors}

    # Ganancia / Numeros
    if _has_error_code(errors, "ganancia_negativa"): return "venta_ganancia_negativa", {"errors": errors}
    if _has_error_code(errors, "cantidad_invalida"): return "venta_num_cajas_invalido", {"errors": errors}
    if _has_error_code(errors, "precio_invalido"):   return "venta_precio_invalido", {"errors": errors}
    if _has_error_code(errors, "gasto_invalido"):    return "venta_gasto_invalido", {"errors": errors}

    # Fallback
    return "validation_error", {"errors": errors}


def _parse_date(val: str):
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except Exception:
        return None


def _get_cosecha_from_payload(data) -> Cosecha | None:
    """
    Intenta obtener la Cosecha desde el payload. Acepta 'cosecha' o 'cosecha_id'.
    """
    if not isinstance(data, dict):
        return None
    cid = data.get("cosecha") or data.get("cosecha_id")
    if not cid:
        return None
    try:
        return Cosecha.objects.select_related("temporada").only(
            "id",
            "is_active",
            "finalizada",
            "temporada_id",
            "temporada__is_active",
            "temporada__finalizada",
        ).get(pk=cid)
    except Cosecha.DoesNotExist:
        return None


def _has_perm(user, codename: str) -> bool:
    """
    Admin pasa siempre; si no, exige 'gestion_huerta.<codename>'.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "role", None) == "admin":
        return True
    return user.has_perm(f"gestion_huerta.{codename}")


class VentaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de ventas por cosecha + archivar/restaurar,
    con filtros por cosecha, temporada, huerta, huerta_rentada, tipo_mango,
    estado (activas|archivadas|todas) y rango de fechas (fecha_desde/fecha_hasta).
    Además, prechecks para estados de Cosecha/Temporada y mapeo fino de errores.
    """
    queryset           = Venta.objects.select_related('cosecha', 'temporada', 'huerta', 'huerta_rentada').order_by('-fecha_venta')
    serializer_class   = VentaSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['cosecha', 'temporada', 'huerta', 'huerta_rentada', 'tipo_mango']
    search_fields      = ['tipo_mango', 'descripcion']
    ordering_fields    = ['fecha_venta']

    # 👇 mapa de permisos por acción
    _perm_map = {
        "list":           ["view_venta"],
        "retrieve":       ["view_venta"],
        "create":         ["add_venta"],
        "update":         ["change_venta"],
        "partial_update": ["change_venta"],
        "destroy":        ["delete_venta"],
        "archivar":       ["archive_venta"],
        "restaurar":      ["restore_venta"],
    }

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_venta"])
        return [p() for p in self.permission_classes]

    # ------------------------------ QUERYSET
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Excluir filtros en acciones de detalle
        if self.action not in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            # Filtro por estado
            estado = (params.get("estado") or "activas").strip().lower()

            if estado in ("activas", "activos"):
                qs = qs.filter(is_active=True)
            elif estado in ("archivadas", "archivados"):
                qs = qs.filter(is_active=False)
            elif estado in ("todas", "todos", "all"):
                pass

            # Rango de fechas (inclusive)
            if fd := params.get('fecha_desde'):
                d = _parse_date(fd)
                if d:
                    qs = qs.filter(fecha_venta__gte=d)
            if fh := params.get('fecha_hasta'):
                d = _parse_date(fh)
                if d:
                    qs = qs.filter(fecha_venta__lte=d)

        return qs

    # ------------------------------ LIST
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            meta = {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
                "page": self.paginator.page.number,
                "page_size": self.paginator.get_page_size(request),
                "total_pages": self.paginator.page.paginator.num_pages,
            }
            return self.notify(
                key="data_processed_success",
                data={"results": serializer.data, "meta": meta},
                status_code=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(qs, many=True)
        meta = {
            "count": len(serializer.data),
            "next": None,
            "previous": None,
            "page": 1,
            "page_size": len(serializer.data),
            "total_pages": 1,
        }
        return self.notify(
            key="data_processed_success",
            data={"results": serializer.data, "meta": meta},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ PRECHECKS de estado (cosecha/temporada)
    def _precheck_estado_contexto_create(self, payload: dict):
        c = _get_cosecha_from_payload(payload)
        if not c:
            return None
        t = c.temporada

        if not t.is_active:
            return ("venta_contexto_temporada_archivada",
                    {"info": "No puedes registrar ventas: la temporada está archivada."})
        if t.finalizada:
            return ("venta_contexto_temporada_finalizada",
                    {"info": "No puedes registrar ventas: la temporada está finalizada."})
        if not c.is_active:
            return ("venta_contexto_cosecha_archivada",
                    {"info": "No puedes registrar ventas: la cosecha está archivada."})
        if c.finalizada:
            return ("venta_contexto_cosecha_finalizada",
                    {"info": "No puedes registrar ventas: la cosecha está finalizada."})
        return None

    def _precheck_estado_contexto_edit(self, venta: Venta):
        """
        En edición: bloquear si la venta está archivada o si su cosecha/temporada
        no permiten operaciones.
        """
        if not venta.is_active:
            return ("venta_archivada_no_editar", {"info": "No puedes editar una venta archivada."})

        c = venta.cosecha
        t = venta.temporada

        if not t.is_active:
            return ("venta_temporada_archivada_no_editar", {"info": "No puedes editar ventas de una temporada archivada."})
        if t.finalizada:
            return ("venta_temporada_finalizada_no_editar", {"info": "No puedes editar ventas de una temporada finalizada."})
        if not c.is_active:
            return ("venta_cosecha_archivada_no_editar", {"info": "No puedes editar ventas de una cosecha archivada."})
        if c.finalizada:
            return ("venta_cosecha_finalizada_no_editar", {"info": "No puedes editar ventas de una cosecha finalizada."})
        return None

    # ------------------------------ CREATE
    def create(self, request, *args, **kwargs):
        # Precheck por estados (para evitar que el serializer devuelva mensajes no relacionados)
        pre = self._precheck_estado_contexto_create(request.data if isinstance(request.data, dict) else {})
        if pre:
            key, data = pre
            return self.notify(key=key, data=data, status_code=status.HTTP_400_BAD_REQUEST)

        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_venta_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_create(ser)
            venta = ser.instance

        registrar_actividad(request.user, f"Creó venta {venta.id} en cosecha {venta.cosecha.id}")
        return self.notify(
            key="venta_create_success",
            data={"venta": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ UPDATE
    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        inst     = self.get_object()

        # Precheck
        pre = self._precheck_estado_contexto_edit(inst)
        if pre:
            key, data = pre
            return self.notify(key=key, data=data, status_code=status.HTTP_400_BAD_REQUEST)

        ser = self.get_serializer(inst, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_venta_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_update(ser)

        registrar_actividad(request.user, f"Actualizó venta {inst.id}")
        return self.notify(
            key="venta_update_success",
            data={"venta": ser.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ DELETE (solo si está archivada)
    def destroy(self, request, *args, **kwargs):
        venta = self.get_object()
        if venta.is_active:
            return self.notify(
                key="venta_debe_estar_archivada",
                data={"error": "Debes archivar la venta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(venta)
        registrar_actividad(request.user, f"Eliminó venta {venta.id}")
        return self.notify(
            key="venta_delete_success",
            data={"info": "Venta eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ ARCHIVAR/RESTAURAR
    @action(detail=True, methods=["post", "patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        venta = self.get_object()
        if not venta.is_active:
            return self.notify(key="venta_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        # 🔐 Refuerzo explícito (además del permiso del viewset)
        if not _has_perm(request.user, "archive_venta"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar ventas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            venta.archivar()

        registrar_actividad(request.user, f"Archivó venta {venta.id}")
        return self.notify(
            key="venta_archivada",
            data={"venta": self.get_serializer(venta).data},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post", "patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        venta = self.get_object()
        if venta.is_active:
            return self.notify(key="venta_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        # 🔐 Refuerzo explícito (además del permiso del viewset)
        if not _has_perm(request.user, "restore_venta"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar ventas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )

        c = venta.cosecha
        t = venta.temporada
        # No restaurar si el contexto no permite operar
        if not t.is_active:
            return self.notify(
                key="venta_temporada_archivada_no_restaurar",
                data={"info": "No puedes restaurar ventas de una temporada archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if t.finalizada:
            return self.notify(
                key="venta_temporada_finalizada_no_restaurar",
                data={"info": "No puedes restaurar ventas de una temporada finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not c.is_active:
            return self.notify(
                key="venta_cosecha_archivada_no_restaurar",
                data={"info": "No puedes restaurar ventas de una cosecha archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if c.finalizada:
            return self.notify(
                key="venta_cosecha_finalizada_no_restaurar",
                data={"info": "No puedes restaurar ventas de una cosecha finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            venta.desarchivar()

        registrar_actividad(request.user, f"Restauró venta {venta.id}")
        return self.notify(
            key="venta_restaurada",
            data={"venta": self.get_serializer(venta).data},
            status_code=status.HTTP_200_OK,
        )
