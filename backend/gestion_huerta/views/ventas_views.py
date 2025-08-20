# src/modules/gestion_huerta/views/ventas_views.py
from rest_framework import viewsets, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from datetime import datetime

from gestion_huerta.models import Venta, Cosecha
from gestion_huerta.serializers import VentaSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad


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
    flat = []
    for k in (
        "non_field_errors", "__all__",
        "cosecha_id", "temporada_id",
        "huerta_id", "huerta_rentada_id",
        "fecha_venta", "num_cajas", "precio_por_caja", "gasto",
        "descripcion", "tipo_mango",
    ):
        if k in errors:
            flat += _texts(errors[k])

    # --- Mensajes textuales directos
    for msg in flat:
        t = msg.strip()

        # Fechas
        if t == "La fecha solo puede ser HOY o AYER (máx. 24 h).":
            return "venta_fecha_fuera_de_rango", {"errors": errors}
        if "La fecha debe ser igual o posterior al inicio de la cosecha" in t:
            return "venta_fecha_antes_inicio_cosecha", {"errors": errors}

        # Coherencias
        if t == "Cosecha requerida.":
            return "venta_cosecha_requerida", {"errors": errors}
        if t == "La temporada no coincide con la de la cosecha.":
            return "venta_temporada_incoherente", {"errors": errors}
        if t == "La huerta no coincide con la de la cosecha.":
            return "venta_huerta_incoherente", {"errors": errors}
        if t == "La huerta rentada no coincide con la de la cosecha.":
            return "venta_huerta_rentada_incoherente", {"errors": errors}
        if t == "Define solo huerta o huerta_rentada, no ambos.":
            return "venta_origen_ambos_definidos", {"errors": errors}
        if t == "Debe definirse huerta u huerta_rentada (según la cosecha).":
            return "venta_origen_indefinido", {"errors": errors}

        # Estados de temporada
        if t == "No se pueden registrar/editar ventas en una temporada finalizada o archivada.":
            return "venta_temporada_no_permitida", {"errors": errors}

        # Ganancia
        if t == "La ganancia neta no puede ser negativa.":
            return "venta_ganancia_negativa", {"errors": errors}

    # --- Numéricos por campo (diferenciamos por key del error)
    if "num_cajas" in errors:
        # p.ej. "Debe ser mayor que 0.", "greater than or equal to 1", etc.
        if any((">" in s or "mayor" in s or "greater" in s) for s in _texts(errors["num_cajas"])):
            return "venta_num_cajas_invalido", {"errors": errors}

    if "precio_por_caja" in errors:
        if any((">" in s or "mayor" in s or "greater" in s) for s in _texts(errors["precio_por_caja"])):
            return "venta_precio_invalido", {"errors": errors}

    if "gasto" in errors:
        if any(("≥" in s or "mayor o igual a 0" in s or ">=" in s or "no puede ser negativo" in s)
               for s in _texts(errors["gasto"])):
            return "venta_gasto_invalido", {"errors": errors}

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
            "id", "is_active", "finalizada", "temporada_id"
        ).get(pk=cid)
    except Cosecha.DoesNotExist:
        return None


class VentaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de ventas por cosecha + archivar/restaurar,
    con filtros por cosecha, temporada, huerta, huerta_rentada, tipo_mango,
    estado (activas|archivadas|todas) y rango de fechas (fecha_desde/fecha_hasta).
    Además, prechecks para estados de Cosecha/Temporada y mapeo fino de errores.
    """
    queryset           = Venta.objects.select_related('cosecha', 'temporada', 'huerta', 'huerta_rentada').order_by('-fecha_venta')
    serializer_class   = VentaSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['cosecha', 'temporada', 'huerta', 'huerta_rentada', 'tipo_mango']
    search_fields      = ['tipo_mango', 'descripcion']
    ordering_fields    = ['fecha_venta']

    # ------------------------------ QUERYSET
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Excluir filtros en acciones de detalle
        if self.action not in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            # Filtro por estado
            estado = (params.get('estado') or 'activas').strip().lower()
            if estado == 'activas':
                qs = qs.filter(is_active=True)
            elif estado == 'archivadas':
                qs = qs.filter(is_active=False)

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
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
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
            },
            status_code=status.HTTP_200_OK
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
