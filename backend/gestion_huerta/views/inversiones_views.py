# gestion_huerta/views/inversion_views.py
from datetime import datetime
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.models import InversionesHuerta, Cosecha
from gestion_huerta.serializers import InversionesHuertaSerializer
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission


# --------------------------- Helpers de mapeo de errores ---------------------------

def _txts(val):
    if val is None:
        return []
    if isinstance(val, (list, tuple)):
        return [str(x) for x in val]
    if isinstance(val, dict):
        out = []
        for v in val.values():
            out.extend(_txts(v))
        return out
    return [str(val)]


def _map_inversion_validation_errors(errors: dict) -> tuple[str, dict]:
    """
    Traduce mensajes del serializer/modelo a claves de notificación del FE.
    Devuelve (key, data).
    """
    flat = []
    for k in (
        "non_field_errors", "__all__",
        "fecha", "descripcion",
        "gastos_insumos", "gastos_mano_obra",
        "categoria_id", "cosecha_id", "temporada_id",
        "huerta_id", "huerta_rentada_id",
        "cosecha", "temporada", "huerta", "huerta_rentada",
    ):
        if k in errors:
            flat += _txts(errors[k])

    for msg in flat:
        t = msg.strip()

        # Fechas
        if t == "La fecha no puede ser futura.":
            return "inversion_fecha_futura", {"errors": errors}
        if t == "La fecha sólo puede ser de hoy o de ayer (máx. 24 h).":
            return "inversion_fecha_fuera_de_rango", {"errors": errors}
        if "La fecha debe ser igual o posterior al inicio de la cosecha" in t:
            return "inversion_fecha_antes_inicio_cosecha", {"errors": errors}
        if t == "No puedes mover la fecha más atrás que la registrada.":
            return "inversion_fecha_no_retroceder", {"errors": errors}

        # Montos
        if t == "Los gastos totales deben ser mayores a 0.":
            return "inversion_totales_cero", {"errors": errors}
        if t == "El gasto en insumos es obligatorio." or t == "El gasto en mano de obra es obligatorio.":
            return "inversion_campo_obligatorio", {"errors": errors}
        if t == "No puede ser negativo.":
            return "inversion_gasto_negativo", {"errors": errors}

        # Coherencia de contexto
        if t == "La temporada no coincide con la temporada de la cosecha.":
            return "inversion_temporada_incoherente", {"errors": errors}
        if t == "No se pueden registrar inversiones en una temporada finalizada o archivada.":
            return "inversion_temporada_no_permitida", {"errors": errors}
        if t == "La huerta no coincide con la huerta de la cosecha.":
            return "inversion_huerta_incoherente", {"errors": errors}
        if t == "La huerta rentada no coincide con la de la cosecha.":
            return "inversion_huerta_rentada_incoherente", {"errors": errors}
        if t == "No asignes huerta propia en una cosecha de huerta rentada.":
            return "inversion_origen_rentada_en_propia", {"errors": errors}
        if t == "No asignes huerta rentada en una cosecha de huerta propia.":
            return "inversion_origen_propia_en_rentada", {"errors": errors}
        if t == "La cosecha no tiene origen (huerta/huerta_rentada) definido.":
            return "inversion_cosecha_sin_origen", {"errors": errors}

        # Mensajes de model.clean
        if t == "La cosecha debe estar activa y no finalizada.":
            return "inversion_cosecha_no_permitida", {"errors": errors}
        if t == "La temporada debe estar activa y no finalizada.":
            return "inversion_temporada_no_permitida", {"errors": errors}
        if t == "No se pueden registrar inversiones en una huerta archivada.":
            return "inversion_huerta_archivada", {"errors": errors}
        if t == "No se pueden registrar inversiones en una huerta rentada archivada.":
            return "inversion_huerta_rentada_archivada", {"errors": errors}

    # Fallback genérico
    return "validation_error", {"errors": errors}


def _parse_date(val: str):
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except Exception:
        return None


def _get_cosecha_from_payload(data) -> Cosecha | None:
    """
    Intenta resolver la Cosecha desde el payload (acepta 'cosecha' o 'cosecha_id').
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


class InversionHuertaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Gestiona inversiones por cosecha: CRUD + archivar/restaurar (POST|PATCH),
    filtros por cosecha/temporada/categoría/huerta/huerta_rentada + estado (activas|archivadas|todas)
    y rango de fechas (fecha_desde / fecha_hasta, inclusive).
    """
    queryset = (
        InversionesHuerta.objects
        .select_related('categoria', 'cosecha', 'temporada', 'huerta', 'huerta_rentada')
        .order_by('-fecha', '-id')
    )
    serializer_class   = InversionesHuertaSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['cosecha', 'temporada', 'categoria', 'huerta', 'huerta_rentada']
    search_fields      = ['descripcion']
    ordering_fields    = ['fecha', 'id']

    # ------------------------------ Queryset dinámico
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # En acciones de detalle, no limitar por estado/rangos
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            return qs

        # Estado: activas / archivadas / todas
        estado = (params.get('estado') or 'activas').strip().lower()
        if estado == 'activas':
            qs = qs.filter(is_active=True)
        elif estado == 'archivadas':
            qs = qs.filter(is_active=False)
        # 'todas' => sin filtro

        # Rango de fechas (inclusive). Espera YYYY-MM-DD
        if fd := params.get('fecha_desde'):
            d = _parse_date(fd)
            if d:
                qs = qs.filter(fecha__gte=d)
        if fh := params.get('fecha_hasta'):
            d = _parse_date(fh)
            if d:
                qs = qs.filter(fecha__lte=d)

        return qs

    # ------------------------------ LIST (con fallback si no hay paginación)
    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.notify(
                key="data_processed_success",
                data={
                    "inversiones": ser.data,
                    "meta": {
                        "count": self.paginator.page.paginator.count,
                        "next": self.paginator.get_next_link(),
                        "previous": self.paginator.get_previous_link(),
                    }
                },
                status_code=status.HTTP_200_OK
            )

        # fallback sin paginación
        ser = self.get_serializer(qs, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "inversiones": ser.data,
                "meta": {"count": len(ser.data), "next": None, "previous": None},
            },
            status_code=status.HTTP_200_OK
        )

    # ------------------------------ PRECHECKS de estado (cosecha/temporada)
    def _precheck_estado_contexto_create(self, payload: dict):
        """
        Antes de validar/crear: si podemos inferir la cosecha, validamos que
        ni la cosecha ni su temporada estén archivadas/finalizadas.
        """
        c = _get_cosecha_from_payload(payload)
        if not c:
            return None  # dejar que el serializer marque lo que falte
        t = c.temporada

        if not t.is_active:
            return ("inversion_temporada_archivada", {"info": "No puedes registrar inversiones en una temporada archivada."})
        if t.finalizada:
            return ("inversion_temporada_finalizada", {"info": "No puedes registrar inversiones en una temporada finalizada."})
        if not c.is_active:
            return ("inversion_cosecha_archivada", {"info": "No puedes registrar inversiones en una cosecha archivada."})
        if c.finalizada:
            return ("inversion_cosecha_finalizada", {"info": "No puedes registrar inversiones en una cosecha finalizada."})
        return None

    def _precheck_estado_contexto_edit(self, inv: InversionesHuerta):
        """
        En edición: bloquear si la inversión está archivada o si su cosecha/temporada
        no permiten operaciones.
        """
        if not inv.is_active:
            return ("inversion_archivada_no_editar", {"info": "No puedes editar una inversión archivada."})

        c = inv.cosecha
        t = inv.temporada

        if not t.is_active:
            return ("inversion_temporada_archivada_no_editar", {"info": "No puedes editar inversiones de una temporada archivada."})
        if t.finalizada:
            return ("inversion_temporada_finalizada_no_editar", {"info": "No puedes editar inversiones de una temporada finalizada."})
        if not c.is_active:
            return ("inversion_cosecha_archivada_no_editar", {"info": "No puedes editar inversiones de una cosecha archivada."})
        if c.finalizada:
            return ("inversion_cosecha_finalizada_no_editar", {"info": "No puedes editar inversiones de una cosecha finalizada."})
        return None

    # ------------------------------ CREATE
    def create(self, request, *args, **kwargs):
        pre = self._precheck_estado_contexto_create(request.data if isinstance(request.data, dict) else {})
        if pre:
            key, data = pre
            return self.notify(key=key, data=data, status_code=status.HTTP_400_BAD_REQUEST)

        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_inversion_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_create(ser)
            inv = ser.instance

        registrar_actividad(request.user, f"Creó inversión {inv.id} en cosecha {inv.cosecha_id}")
        return self.notify(
            key="inversion_create_success",
            data={"inversion": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ UPDATE
    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        inst     = self.get_object()

        pre = self._precheck_estado_contexto_edit(inst)
        if pre:
            key, data = pre
            return self.notify(key=key, data=data, status_code=status.HTTP_400_BAD_REQUEST)

        ser = self.get_serializer(inst, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_inversion_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            self.perform_update(ser)

        registrar_actividad(request.user, f"Actualizó inversión {inst.id}")
        return self.notify(
            key="inversion_update_success",
            data={"inversion": ser.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ DELETE (solo si está archivada)
    def destroy(self, request, *args, **kwargs):
        inv = self.get_object()
        if inv.is_active:
            return self.notify(
                key="inversion_debe_estar_archivada",
                data={"error": "Debes archivar la inversión antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(inv)
        registrar_actividad(request.user, f"Eliminó inversión {inv.id}")
        return self.notify(
            key="inversion_delete_success",
            data={"info": "Inversión eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ ARCHIVAR / RESTAURAR
    @action(detail=True, methods=["post", "patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        inv = self.get_object()
        if not inv.is_active:
            return self.notify(key="inversion_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            inv.archivar()

        registrar_actividad(request.user, f"Archivó inversión {inv.id}")
        return self.notify(
            key="inversion_archivada",
            data={"inversion": self.get_serializer(inv).data},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post", "patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        inv = self.get_object()
        if inv.is_active:
            return self.notify(key="inversion_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        c = inv.cosecha
        t = inv.temporada
        # No restaurar si el contexto no permite operar
        if not t.is_active:
            return self.notify(
                key="inversion_temporada_archivada_no_restaurar",
                data={"info": "No puedes restaurar inversiones de una temporada archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if t.finalizada:
            return self.notify(
                key="inversion_temporada_finalizada_no_restaurar",
                data={"info": "No puedes restaurar inversiones de una temporada finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not c.is_active:
            return self.notify(
                key="inversion_cosecha_archivada_no_restaurar",
                data={"info": "No puedes restaurar inversiones de una cosecha archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if c.finalizada:
            return self.notify(
                key="inversion_cosecha_finalizada_no_restaurar",
                data={"info": "No puedes restaurar inversiones de una cosecha finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            inv.desarchivar()

        registrar_actividad(request.user, f"Restauró inversión {inv.id}")
        return self.notify(
            key="inversion_restaurada",
            data={"inversion": self.get_serializer(inv).data},
            status_code=status.HTTP_200_OK,
        )
