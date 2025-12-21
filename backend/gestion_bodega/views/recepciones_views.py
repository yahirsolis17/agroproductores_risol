# backend/gestion_bodega/views/recepciones_views.py
from datetime import date, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Sum, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.models import (
    Bodega,
    Recepcion,
    TemporadaBodega,
    CierreSemanal,
    ClasificacionEmpaque,  # ✅ fuente real del "empaque"
)
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.serializers import RecepcionSerializer
from gestion_bodega.utils.activity import registrar_actividad
from gestion_bodega.utils.audit import ViewSetAuditMixin
from gestion_bodega.utils.notification_handler import NotificationHandler
from gestion_bodega.utils.semana import semana_cerrada_ids as _semana_cerrada


# ───────────────────────────────────────────────────────────────────────────
# Helpers / Mixin
# ───────────────────────────────────────────────────────────────────────────


def _normalize_estado(raw, default: str = "activas") -> str:
    val = (raw or default).strip().lower()
    mapping = {
        "activos": "activas",
        "activas": "activas",
        "archivados": "archivadas",
        "archivadas": "archivadas",
        "todos": "todas",
        "todas": "todas",
        "all": "todas",
    }
    return mapping.get(val, default)


class NotificationMixin:
    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )

    def get_pagination_meta(self):
        paginator = getattr(self, "paginator", None)
        page = getattr(paginator, "page", None) if paginator else None
        if not paginator or page is None:
            return {
                "count": 0,
                "next": None,
                "previous": None,
                "page": None,
                "page_size": None,
                "total_pages": None,
            }
        return {
            "count": page.paginator.count,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
            "page": page.number,
            "page_size": paginator.get_page_size(self.request),
            "total_pages": page.paginator.num_pages,
        }


def _msg_in(errors, text_substring: str) -> bool:
    target = text_substring.lower()
    if errors is None:
        return False

    if isinstance(errors, (list, tuple)):
        return any(target in str(m).lower() for m in errors)

    if isinstance(errors, str):
        return target in errors.lower()

    if isinstance(errors, dict):
        for msgs in errors.values():
            if isinstance(msgs, (list, tuple)):
                if any(target in str(m).lower() for m in msgs):
                    return True
            else:
                if target in str(msgs).lower():
                    return True

    return target in str(errors).lower()


def _map_recepcion_validation_errors(errors) -> tuple[str, dict, int]:
    if _msg_in(errors, "semana est") and _msg_in(errors, "cerrad"):
        return "recepcion_semana_cerrada", {"errors": errors}, status.HTTP_409_CONFLICT
    if _msg_in(errors, "La temporada debe estar activa y no finalizada"):
        return "recepcion_temporada_invalida", {"errors": errors}, status.HTTP_400_BAD_REQUEST
    if _msg_in(errors, "cantidad de cajas") or _msg_in(errors, "debe ser positiva"):
        return "recepcion_cantidad_invalida", {"errors": errors}, status.HTTP_400_BAD_REQUEST
    if (
        _msg_in(errors, "semana activa")
        or _msg_in(errors, "no pertenece a esta bodega y temporada")
        or _msg_in(errors, "dentro del rango de la semana")
        or _msg_in(errors, "semana cerrada")
    ):
        return "recepcion_semana_invalida", {"errors": errors}, status.HTTP_400_BAD_REQUEST
    if _msg_in(errors, "No existe una semana") or _msg_in(errors, "Inicia una semana"):
        return "recepcion_semana_invalida", {"errors": errors}, status.HTTP_400_BAD_REQUEST
    return "validation_error", {"errors": errors}, status.HTTP_400_BAD_REQUEST


def _resolve_semana_for_fecha(bodega: Bodega, temporada: TemporadaBodega, fecha: date):
    qs = (
        CierreSemanal.objects.filter(
            bodega=bodega,
            temporada=temporada,
            is_active=True,
        )
        .order_by("-fecha_desde")
    )

    for c in qs:
        start = c.fecha_desde
        end = c.fecha_hasta or (c.fecha_desde + timedelta(days=6))
        if start <= fecha <= end:
            return c
    return None


# ───────────────────────────────────────────────────────────────────────────
# Empaque (Fase 3): resumen por recepción basado en ClasificacionEmpaque
# ───────────────────────────────────────────────────────────────────────────

def _build_empaque_map(recepcion_ids: list[int]) -> dict[int, dict]:
    """
    Devuelve:
      { recepcion_id: { packed, merma } }
    usando SUM sobre ClasificacionEmpaque (is_active=True).
    """
    if not recepcion_ids:
        return {}

    rows = (
        ClasificacionEmpaque.objects
        .filter(recepcion_id__in=recepcion_ids, is_active=True)
        .values("recepcion_id")
        .annotate(
            packed=Sum("cantidad_cajas"),
            merma=Sum("cantidad_cajas", filter=Q(calidad__iexact="MERMA")),
        )
    )

    out: dict[int, dict] = {}
    for r in rows:
        rid = r["recepcion_id"]
        out[rid] = {
            "packed": int(r["packed"] or 0),
            "merma": int(r["merma"] or 0),
        }
    return out


def _derive_empaque_status(captured: int, packed: int) -> str:
    if packed <= 0:
        return "SIN_EMPAQUE"
    if captured > 0 and packed >= captured:
        return "EMPACADO"
    return "PARCIAL"


def _inject_empaque_fields(row_dict: dict, *, captured: int, packed: int, merma: int):
    row_dict["empaque_status"] = _derive_empaque_status(captured, packed)
    row_dict["cajas_empaquetadas"] = packed
    row_dict["cajas_disponibles"] = max(0, captured - packed)
    row_dict["cajas_merma"] = merma
    # No existe "header id" de empaque; es líneas. Lo dejamos explícito.
    row_dict["empaque_id"] = None
    return row_dict


# ───────────────────────────────────────────────────────────────────────────
# ViewSet
# ───────────────────────────────────────────────────────────────────────────


class RecepcionViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    serializer_class = RecepcionSerializer
    queryset = (
        Recepcion.objects.select_related("bodega", "temporada", "semana")
        .order_by("-fecha", "-id")
    )
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list": ["view_recepcion"],
        "retrieve": ["view_recepcion"],
        "create": ["add_recepcion"],
        "update": ["change_recepcion"],
        "partial_update": ["change_recepcion"],
        "destroy": ["delete_recepcion"],
        "archivar": ["archive_recepcion"],
        "restaurar": ["restore_recepcion"],
    }

    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "semana": ["exact"],
    }
    ordering = ["-fecha", "-id"]

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_recepcion"])
        return [p() for p in self.permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs

    # ---------- LIST ----------
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)

        if page is not None:
            ser = self.get_serializer(page, many=True)
            meta = self.get_pagination_meta()
            rows = list(ser.data)

            recepcion_ids = [obj.id for obj in page]
            em_map = _build_empaque_map(recepcion_ids)

            for obj, d in zip(page, rows):
                captured = int(getattr(obj, "cajas_campo", 0) or 0)
                packed = int(em_map.get(obj.id, {}).get("packed", 0))
                merma = int(em_map.get(obj.id, {}).get("merma", 0))
                _inject_empaque_fields(d, captured=captured, packed=packed, merma=merma)

        else:
            ser = self.get_serializer(qs, many=True)
            meta = {
                "count": len(ser.data),
                "next": None,
                "previous": None,
                "page": 1,
                "page_size": len(ser.data),
                "total_pages": 1,
            }
            rows = list(ser.data)

            recepcion_ids = [obj.id for obj in qs]
            em_map = _build_empaque_map(recepcion_ids)

            for obj, d in zip(qs, rows):
                captured = int(getattr(obj, "cajas_campo", 0) or 0)
                packed = int(em_map.get(obj.id, {}).get("packed", 0))
                merma = int(em_map.get(obj.id, {}).get("merma", 0))
                _inject_empaque_fields(d, captured=captured, packed=packed, merma=merma)

        payload = {
            "recepciones": rows,
            "results": rows,
            "meta": meta,
        }
        return self.notify(
            key="data_processed_success",
            data=payload,
            status_code=status.HTTP_200_OK,
        )

    # ---------- CREATE ----------
    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        if "bodega_id" in data and "bodega" not in data:
            data["bodega"] = data.get("bodega_id")
        if "temporada_id" in data and "temporada" not in data:
            data["temporada"] = data.get("temporada_id")
        if "cajas_campo" in data and "cantidad_cajas" not in data:
            data["cantidad_cajas"] = data.get("cajas_campo")

        ser = self.get_serializer(data=data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload, sc = _map_recepcion_validation_errors(
                getattr(ex, "detail", ser.errors)
            )
            return self.notify(key=key, data=payload, status_code=sc)

        temporada: TemporadaBodega = ser.validated_data["temporada"]
        bodega: Bodega = ser.validated_data["bodega"]
        f: date = ser.validated_data["fecha"]

        if temporada.bodega_id != bodega.id:
            return self.notify(
                key="recepcion_bodega_temporada_incongruente",
                data={"info": "La bodega de la recepción debe coincidir con la bodega de la temporada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                obj: Recepcion = ser.save()
        except DjangoValidationError as ex:
            errors = getattr(ex, "message_dict", {"non_field_errors": ex.messages})
            key, payload, sc = _map_recepcion_validation_errors(errors)
            return self.notify(key=key, data=payload, status_code=sc)

        registrar_actividad(request.user, f"Creó recepción #{obj.id} (bodega {bodega.id}, temporada {temporada.id})")

        row = self.get_serializer(obj).data
        # recién creada: no hay líneas todavía
        _inject_empaque_fields(row, captured=int(obj.cajas_campo or 0), packed=0, merma=0)

        return self.notify(
            key="recepcion_create_success",
            data={"recepcion": row},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------- UPDATE ----------
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance: Recepcion = self.get_object()

        if not instance.is_active:
            return self.notify(
                key="registro_archivado_no_editar",
                data={"info": "No puedes editar una recepción archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()
        if "bodega_id" in data and "bodega" not in data:
            data["bodega"] = data.get("bodega_id")
        if "temporada_id" in data and "temporada" not in data:
            data["temporada"] = data.get("temporada_id")
        if "cajas_campo" in data and "cantidad_cajas" not in data:
            data["cantidad_cajas"] = data.get("cajas_campo")

        ser = self.get_serializer(instance, data=data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload, sc = _map_recepcion_validation_errors(getattr(ex, "detail", ser.errors))
            return self.notify(key=key, data=payload, status_code=sc)

        temporada: TemporadaBodega = ser.validated_data.get("temporada", instance.temporada)
        bodega: Bodega = ser.validated_data.get("bodega", instance.bodega)
        f: date = ser.validated_data.get("fecha", instance.fecha)

        if temporada.bodega_id != bodega.id:
            return self.notify(
                key="recepcion_bodega_temporada_incongruente",
                data={"info": "La bodega de la recepción debe coincidir con la bodega de la temporada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not temporada.is_active or temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha) or _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                obj: Recepcion = ser.save()
        except DjangoValidationError as ex:
            errors = getattr(ex, "message_dict", {"non_field_errors": ex.messages})
            key, payload, sc = _map_recepcion_validation_errors(errors)
            return self.notify(key=key, data=payload, status_code=sc)

        registrar_actividad(request.user, f"Actualizó recepción #{obj.id}")

        # Recalcular totals para mantener consistencia del contrato
        agg = (
            ClasificacionEmpaque.objects
            .filter(recepcion_id=obj.id, is_active=True)
            .aggregate(
            packed=Sum("cantidad_cajas"),
            merma=Sum("cantidad_cajas", filter=Q(calidad__iexact="MERMA")),
            )
        )
        packed = int(agg.get("packed") or 0)
        merma = int(agg.get("merma") or 0)

        row = self.get_serializer(obj).data
        _inject_empaque_fields(row, captured=int(obj.cajas_campo or 0), packed=packed, merma=merma)

        return self.notify(
            key="recepcion_update_success",
            data={"recepcion": row},
            status_code=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    # ---------- DELETE (hard) ----------
    def destroy(self, request, *args, **kwargs):
        instance: Recepcion = self.get_object()

        if instance.is_active:
            return self.notify(
                key="recepcion_debe_estar_archivada",
                data={"error": "Debes archivar la recepción antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(instance, "clasificaciones") and instance.clasificaciones.exists():
            return self.notify(
                key="recepcion_con_dependencias",
                data={"error": "No se puede eliminar: existen clasificaciones asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        rec_id = instance.id
        self.perform_destroy(instance)
        registrar_actividad(request.user, f"Eliminó recepción #{rec_id}")
        return self.notify(
            key="recepcion_delete_success",
            data={"deleted_id": rec_id},
            status_code=status.HTTP_200_OK,
        )

    # ---------- ARCHIVAR ----------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance: Recepcion = self.get_object()

        if not instance.is_active:
            return self.notify(key="recepcion_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            instance.archivar()

        registrar_actividad(request.user, f"Archivó recepción #{instance.id}")
        return self.notify(
            key="recepcion_archivada",
            data={"recepcion_id": instance.id},
            status_code=status.HTTP_200_OK,
        )

    # ---------- RESTAURAR ----------
    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance: Recepcion = self.get_object()

        if instance.is_active:
            return self.notify(key="recepcion_ya_activa", status_code=status.HTTP_400_BAD_REQUEST)

        if not instance.temporada.is_active or instance.temporada.finalizada:
            return self.notify(key="recepcion_temporada_invalida", status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(instance.bodega_id, instance.temporada_id, instance.fecha):
            return self.notify(key="recepcion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            instance.desarchivar()

        registrar_actividad(request.user, f"Restauró recepción #{instance.id}")

        # Recalcular totals para mantener contrato
        agg = (
            ClasificacionEmpaque.objects
            .filter(recepcion_id=instance.id, is_active=True)
            .aggregate(
            packed=Sum("cantidad_cajas"),
            merma=Sum("cantidad_cajas", filter=Q(calidad__iexact="MERMA")),
            )
        )
        packed = int(agg.get("packed") or 0)
        merma = int(agg.get("merma") or 0)

        row = self.get_serializer(instance).data
        _inject_empaque_fields(row, captured=int(instance.cajas_campo or 0), packed=packed, merma=merma)

        return self.notify(
            key="recepcion_restaurada",
            data={"recepcion": row},
            status_code=status.HTTP_200_OK,
        )
