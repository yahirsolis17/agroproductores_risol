# backend/gestion_bodega/views/tablero_views.py
from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Q  # ← para filtros de rango

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.models import Bodega, TemporadaBodega, CierreSemanal
from gestion_bodega.serializers import (
    DashboardAlertResponseSerializer,
    DashboardQueueResponseSerializer,
    DashboardSummaryResponseSerializer,
    QueueItemSerializer,
)
from gestion_bodega.utils.constants import NOTIFICATION_MESSAGES
from gestion_bodega.utils.kpis import (
    build_alerts,
    build_queue_items,
    build_summary,
    queue_despachos_qs,
    queue_inventarios_qs,
    queue_recepciones_qs,
)
from gestion_bodega.utils.notification_handler import NotificationHandler
from gestion_bodega.utils.semana import rango_por_semana_id

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

ISO_WEEK_RE = re.compile(r"^\d{4}-W\d{2}$")


def msg_text(key: str) -> str:
    return NOTIFICATION_MESSAGES.get(key, {}).get("message", "")


class BodegaDashboardPermission(BasePermission):
    message = _("No tienes permisos para ver el tablero de bodega.")

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        if getattr(u, "is_superuser", False) or getattr(u, "is_staff", False):
            return True
        return u.has_perm("gestion_bodega.view_dashboard")


class WeekManagePermission(BasePermission):
    message = _("No tienes permisos para gestionar semanas de bodega.")

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        if getattr(u, "is_superuser", False) or getattr(u, "is_staff", False):
            return True
        return u.has_perm("gestion_bodega.close_week")


class BaseDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, BodegaDashboardPermission]

    def permission_denied(self, request, message=None, code=None):
        return NotificationHandler.generate_response(
            "permission_denied",
            data=None,
            status_code=status.HTTP_403_FORBIDDEN,
        )


def _to_int(v: Optional[str]) -> Optional[int]:
    try:
        return int(v) if v not in (None, "") else None
    except ValueError:
        return None


def _parse_bool(v: Optional[str]) -> Optional[bool]:
    if v is None:
        return None
    return str(v).lower() in {"1", "true", "t", "yes", "y", "on"}


def _parse_date_str(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


def _iso_week_to_range(iso_key: str) -> Optional[Tuple[date, date]]:
    if not ISO_WEEK_RE.match(iso_key):
        return None
    y = int(iso_key[:4])
    w = int(iso_key[-2:])
    try:
        monday = date.fromisocalendar(y, w, 1)
        sunday = date.fromisocalendar(y, w, 7)
        return monday, sunday
    except Exception:
        return None


def _require_temporada(request) -> int | None:
    temporada = request.query_params.get("temporada")
    try:
        return int(temporada)
    except (TypeError, ValueError):
        return None


def _temporada_label(temporada_id: int) -> str:
    try:
        t = TemporadaBodega.objects.only("id", "año").get(id=temporada_id)
        return str(t.año)
    except TemporadaBodega.DoesNotExist:
        return str(temporada_id)
    except Exception:
        return str(temporada_id)


def _current_or_last_week_ctx(bodega_id: Optional[int], temporada_id: int) -> Optional[Dict[str, Any]]:
    """
    Devuelve la semana que contiene 'hoy'. Si no existe, devuelve la última semana (por fecha_desde).
    Formato de retorno compatible con el 'active_week' legacy para no romper consumidores.
    """
    if not bodega_id:
        return None
    try:
        qs = CierreSemanal.objects.filter(
            bodega_id=bodega_id,
            temporada_id=temporada_id,
            is_active=True,
        )

        hoy = date.today()
        # Semana que contiene hoy (fecha_hasta o fin teórico +6)
        week = (
            qs.filter(
                Q(fecha_desde__lte=hoy)
                & (Q(fecha_hasta__gte=hoy) | Q(fecha_hasta__isnull=True))
            )
            .order_by("fecha_desde", "id")
            .last()
        )

        # Si no hay semana que contenga hoy, tomar la última creada
        if not week:
            week = qs.order_by("fecha_desde", "id").last()
            if not week:
                return None

        end_theoretical = week.fecha_hasta or (week.fecha_desde + timedelta(days=6))
        contiene_hoy = week.fecha_desde <= hoy <= end_theoretical

        return {
            "id": week.id,
            "fecha_inicio": week.fecha_desde.isoformat(),
            "fecha_fin": week.fecha_hasta.isoformat() if week.fecha_hasta else None,
            "rango_inferido": {
                "from": week.fecha_desde.isoformat(),
                "to": end_theoretical.isoformat(),
            },
            "estado": "ACTUAL" if contiene_hoy else "PASADA",
            "iso_semana": week.iso_semana or None,
        }
    except Exception:
        return None


def _resolve_range(
    request,
    temporada_id: int,
    bodega_id: Optional[int],
) -> Tuple[Optional[str], Optional[str], Optional[Dict[str, Any]]]:
    """
    Prioridad:
      1) semana_id (semana manual registrada)
      2) fecha_desde/fecha_hasta explícitos
      3) iso_semana válida (YYYY-Www)
      4) semana actual (la que contiene hoy) o, si no existe, la última
      5) None
    Devuelve (fdesde_str, fhasta_str, active_week_ctx)
    """
    # 1) semana_id → usamos CierreSemanal real
    semana_id = _to_int(request.query_params.get("semana_id"))
    if semana_id:
        try:
            d1, d2, _ = rango_por_semana_id(semana_id)
            return d1.isoformat(), d2.isoformat(), _current_or_last_week_ctx(bodega_id, temporada_id)
        except Exception as e:
            logger.info("semana_id inválido: %s", e)

    # 2) rango explícito
    fdesde = request.query_params.get("fecha_desde")
    fhasta = request.query_params.get("fecha_hasta")
    if fdesde or fhasta:
        return fdesde, fhasta, _current_or_last_week_ctx(bodega_id, temporada_id)

    # 3) iso_semana
    iso_key = request.query_params.get("iso_semana")
    if iso_key and ISO_WEEK_RE.match(iso_key):
        rng = _iso_week_to_range(iso_key)
        if rng:
            a, b = rng
            return a.isoformat(), b.isoformat(), _current_or_last_week_ctx(bodega_id, temporada_id)

    # 4) semana actual (o última)
    aw = _current_or_last_week_ctx(bodega_id, temporada_id)
    if aw and aw.get("rango_inferido"):
        r = aw["rango_inferido"]
        return r["from"], r["to"], aw

    # 5) sin rango
    return None, None, aw


def _enrich_items_with_huertero(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Asegura que 'huertero' exista como campo toplevel si viene en meta u otros alias.
    """
    out: List[Dict[str, Any]] = []
    for it in items:
        meta = it.get("meta") or {}
        if "huertero" not in it:
            h = (
                it.get("huertero")
                or meta.get("huertero")
                or it.get("huertero_nombre")
                or meta.get("huertero_nombre")
                or it.get("recepcion__huertero_nombre")
                or meta.get("recepcion__huertero_nombre")
            )
            if h:
                it = {**it, "huertero": h}
        out.append(it)
    return out


def _ordering_from_alias(tipo: str, order_by: Optional[str]) -> List[str]:
    """
    Traduce alias de negocio → campos ORM. Soporta lista separada por comas: "campo:asc,otro:desc".
    Si llega un alias inválido, lanza ValueError.
    """
    if not order_by:
        return []

    alias_maps: Dict[str, Dict[str, str]] = {
        "recepciones": {
            "fecha_recepcion": "fecha",
            "id": "id",
            "huertero": "huertero_nombre",
        },
        "inventarios": {
            "fecha": "fecha",
            "id": "id",
        },
        "despachos": {
            "fecha_programada": "fecha_salida",
            "id": "id",
        },
    }

    mapping = alias_maps.get(tipo, {})
    parts = [p.strip() for p in order_by.split(",") if p.strip()]
    orm_fields: List[str] = []
    invalid: List[str] = []

    for p in parts:
        key, direction = (p.split(":", 1) + ["asc"])[:2]
        field = mapping.get(key.strip())
        if not field:
            invalid.append(key.strip())
            continue
        orm_fields.append(f"-{field}" if direction.strip().lower() == "desc" else field)

    if invalid:
        raise ValueError(f"invalid_order_by:{'|'.join(invalid)}")

    return orm_fields


def _context_payload(temporada_id: int, bodega_id: Optional[int]) -> Dict[str, Any]:
    ctx: Dict[str, Any] = {
        "temporada_id": temporada_id,
        "temporada_label": _temporada_label(temporada_id),
    }
    # Etiqueta de bodega (opcional)
    if bodega_id:
        try:
            b = Bodega.objects.only("id", "nombre").get(id=bodega_id)
            ctx["bodega_label"] = b.nombre
        except Exception:
            ctx["bodega_label"] = str(bodega_id)
    aw = _current_or_last_week_ctx(bodega_id, temporada_id)
    if aw:
        ctx["active_week"] = aw
    return ctx


# ─────────────────────────────────────────────────────────────────────────────
# Vistas
# ─────────────────────────────────────────────────────────────────────────────

@method_decorator(never_cache, name="dispatch")
class TableroBodegaSummaryView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/summary/?temporada=:id&bodega=:id&huerta_id=&fecha_desde=&fecha_hasta=&iso_semana=&semana_id=
    """
    throttle_scope = "bodega_dashboard"

    def get(self, request, *args, **kwargs):
        temporada_id = _require_temporada(request)
        if not temporada_id:
            return NotificationHandler.generate_response(
                "validation_error", data=None, status_code=status.HTTP_400_BAD_REQUEST
            )
        try:
            bodega_id = _to_int(request.query_params.get("bodega"))
            huerta_id = _to_int(request.query_params.get("huerta_id"))

            fdesde, fhasta, _ = _resolve_range(request, temporada_id, bodega_id)

            kpis_or_payload = build_summary(temporada_id, fdesde, fhasta, huerta_id)
            payload = kpis_or_payload if isinstance(kpis_or_payload, dict) and "kpis" in kpis_or_payload \
                else {"kpis": kpis_or_payload}

            ser = DashboardSummaryResponseSerializer(payload)
            data = dict(ser.data)
            data["context"] = _context_payload(temporada_id, bodega_id)

            return NotificationHandler.generate_response(
                "data_processed_success",
                data=data,
                status_code=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.exception("Error en TableroBodegaSummaryView: %s", e)
            return NotificationHandler.generate_response(
                "server_error", data=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaQueuesView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/queues/?temporada=:id&bodega=:id&type=recepciones|inventarios|despachos&page=&page_size=&order_by=&fecha_desde=&fecha_hasta=&iso_semana=&semana_id=&huerta_id=...
    """
    throttle_scope = "bodega_dashboard"

    def get(self, request, *args, **kwargs):
        temporada_id = _require_temporada(request)
        if not temporada_id:
            return NotificationHandler.generate_response(
                "validation_error", data=None, status_code=status.HTTP_400_BAD_REQUEST
            )

        tipo = request.query_params.get("type")
        if tipo not in {"recepciones", "inventarios", "despachos"}:
            return NotificationHandler.generate_response(
                "validation_error", data=None, status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            bodega_id = _to_int(request.query_params.get("bodega"))
            fdesde, fhasta, _ = _resolve_range(request, temporada_id, bodega_id)

            huerta_id = _to_int(request.query_params.get("huerta_id"))
            estado_lote = request.query_params.get("estado_lote")
            calidad = request.query_params.get("calidad")
            madurez = request.query_params.get("madurez")
            solo_pendientes = _parse_bool(request.query_params.get("solo_pendientes"))

            order_by_alias = request.query_params.get("order_by")
            try:
                ordering = _ordering_from_alias(tipo, order_by_alias)
            except ValueError as ve:
                logger.info("Alias inválido en order_by: %s", ve)
                return NotificationHandler.generate_response(
                    "validation_error",
                    data={"detail": str(ve)},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            if tipo == "recepciones":
                base_qs = queue_recepciones_qs(
                    temporada_id=temporada_id,
                    fecha_desde=fdesde,
                    fecha_hasta=fhasta,
                    huerta_id=huerta_id,
                    estado_lote=estado_lote,
                    calidad=calidad,
                    madurez=madurez,
                    solo_pendientes=solo_pendientes,
                )
            elif tipo == "inventarios":
                base_qs = queue_inventarios_qs(
                    temporada_id=temporada_id,
                    fecha_desde=fdesde,
                    fecha_hasta=fhasta,
                    huerta_id=huerta_id,
                    calidad=calidad,
                    madurez=madurez,
                )
            else:  # despachos
                base_qs = queue_despachos_qs(
                    temporada_id=temporada_id,
                    fecha_desde=fdesde,
                    fecha_hasta=fhasta,
                )

            if ordering:
                base_qs = base_qs.order_by(*ordering)

            paginator = GenericPagination()
            page_qs = paginator.paginate_queryset(base_qs, request, view=self)

            items = build_queue_items(tipo, page_qs)
            items = _enrich_items_with_huertero(items)
            items_ser = QueueItemSerializer(items, many=True).data

            paginated = paginator.get_paginated_response(items_ser)
            envelope = paginated.data.get("data", {}) or {}

            results_key = getattr(paginator, "resource_name", "results")
            meta = envelope.get("meta", {}) or {}
            results = envelope.get("results")
            if results is None:
                results = envelope.get(results_key, [])  # fallback

            payload = {
                "meta": meta,
                "results": results,
            }
            ser = DashboardQueueResponseSerializer(payload)
            data = dict(ser.data)
            data["context"] = _context_payload(temporada_id, bodega_id)

            return NotificationHandler.generate_response(
                "data_processed_success", data=data, status_code=status.HTTP_200_OK
            )

        except Exception as e:
            logger.exception("Error en TableroBodegaQueuesView: %s", e)
            return NotificationHandler.generate_response(
                "server_error", data=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaAlertsView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/alerts/?temporada=:id&bodega=:id
    """
    throttle_scope = "bodega_dashboard"

    def get(self, request, *args, **kwargs):
        try:
            temporada_raw = request.query_params.get("temporada")
            bodega_raw = request.query_params.get("bodega")
            if not temporada_raw or not bodega_raw:
                raise DjangoValidationError("Parámetros requeridos: temporada y bodega")

            temporada_id = int(temporada_raw)
            bodega_id = int(bodega_raw)
            if temporada_id <= 0 or bodega_id <= 0:
                raise DjangoValidationError("IDs inválidos para temporada/bodega")

            alerts = build_alerts(temporada_id=temporada_id, bodega_id=bodega_id)
            payload = {"alerts": alerts}
            ser = DashboardAlertResponseSerializer(payload)
            data = dict(ser.data)
            data["context"] = _context_payload(temporada_id, bodega_id)

            return NotificationHandler.generate_response(
                "data_processed_success", data=data, status_code=status.HTTP_200_OK
            )
        except (ValueError, DjangoValidationError) as ve:
            return NotificationHandler.generate_response(
                "validation_error", data={"detail": str(ve)}, status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Error en TableroBodegaAlertsView: %s", e)
            return NotificationHandler.generate_response(
                "server_error", data=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ─────────────────────────────────────────────────────────────────────────────
# Semanas manuales — start / finish / current / nav
# ─────────────────────────────────────────────────────────────────────────────

class BaseWeekAPIView(APIView):
    permission_classes = [IsAuthenticated, WeekManagePermission]

    def permission_denied(self, request, message=None, code=None):
        return NotificationHandler.generate_response(
            "permission_denied",
            data=None,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    def _require_ctx(self, request) -> Tuple[Optional[int], Optional[int], Optional[TemporadaBodega]]:
        temporada_id = _require_temporada(request)
        bodega_id = _to_int(request.query_params.get("bodega"))
        if not temporada_id or not bodega_id:
            return None, None, None
        try:
            t = TemporadaBodega.objects.select_related("bodega").get(id=temporada_id, bodega_id=bodega_id)
            return bodega_id, temporada_id, t
        except TemporadaBodega.DoesNotExist:
            return bodega_id, temporada_id, None


@method_decorator(never_cache, name="dispatch")
class TableroBodegaWeekCurrentView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/week/current/?bodega=:id&temporada=:id
    """
    throttle_scope = "bodega_dashboard"

    def get(self, request, *args, **kwargs):
        bodega_id = _to_int(request.query_params.get("bodega"))
        temporada_id = _require_temporada(request)
        if not bodega_id or not temporada_id:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "Parámetros inválidos o temporada/bodega no corresponden."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        aw = _current_or_last_week_ctx(bodega_id, temporada_id)
        week_simple = None
        if aw:
            start = aw.get("rango_inferido", {}).get("from") or aw.get("fecha_inicio")
            end = aw.get("rango_inferido", {}).get("to") or aw.get("fecha_fin")
            try:
                today = date.today().isoformat()
                activa = bool(start <= today <= (end or start))
            except Exception:
                activa = False
            week_simple = {
                "id": aw.get("id"),
                "fecha_desde": start,
                "fecha_hasta": end,
                "activa": activa,
            }
        return NotificationHandler.generate_response(
            "data_processed_success",
            data={
                "active_week": aw,
                "week": week_simple,
                "context": _context_payload(temporada_id, bodega_id),
            },
            status_code=status.HTTP_200_OK,
        )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaWeekStartView(BaseWeekAPIView):
    """
    POST /bodega/tablero/week/start/
      body/json: { "bodega": <id>, "temporada": <id>, "fecha_desde": "YYYY-MM-DD" }
    Política: al iniciar fijamos fecha_hasta = fecha_desde + 6 días.
    """
    throttle_scope = "bodega_dashboard"

    def post(self, request, *args, **kwargs):
        bodega_id = _to_int(request.data.get("bodega"))
        temporada_id = _to_int(request.data.get("temporada"))
        fecha_desde_s = request.data.get("fecha_desde")

        if not (bodega_id and temporada_id and fecha_desde_s):
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "bodega, temporada y fecha_desde son obligatorios."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            t = TemporadaBodega.objects.get(id=temporada_id, bodega_id=bodega_id, is_active=True, finalizada=False)
        except TemporadaBodega.DoesNotExist:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "Temporada inválida o no activa."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        f = _parse_date_str(fecha_desde_s)
        if not f:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "fecha_desde inválida."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Etiqueta opcional ISO de referencia (no afecta la lógica manual)
        try:
            iso_tag = f"{f.isocalendar().year}-W{str(f.isocalendar().week).zfill(2)}"
        except Exception:
            iso_tag = None

        try:
            # Política: al iniciar, fijamos fecha_hasta = fecha_desde + 6 días
            fecha_hasta_def = f + timedelta(days=6)

            # Solo una semana “activa” para la fecha actual: si la nueva contendrá hoy, validar conflicto
            hoy = date.today()
            if f <= hoy <= fecha_hasta_def:
                # Existe alguna semana que ya contenga hoy
                if CierreSemanal.objects.filter(
                    bodega_id=bodega_id,
                    temporada_id=temporada_id,
                    fecha_desde__lte=hoy,
                    is_active=True,
                ).filter(
                    Q(fecha_hasta__gte=hoy) | Q(fecha_hasta__isnull=True)
                ).exists():

                    return NotificationHandler.generate_response(
                        "validation_error",
                        data={"detail": "Ya existe una semana activa para hoy."},
                        status_code=status.HTTP_409_CONFLICT,
                    )

            cw = CierreSemanal.objects.create(
                bodega_id=bodega_id,
                temporada_id=temporada_id,
                fecha_desde=f,
                fecha_hasta=fecha_hasta_def,
                iso_semana=iso_tag,
                locked_by=request.user,
            )
            aw = _current_or_last_week_ctx(bodega_id, temporada_id)
            return NotificationHandler.generate_response(
                "data_processed_success",
                data={"active_week": aw, "context": _context_payload(temporada_id, bodega_id)},
                status_code=status.HTTP_201_CREATED,
            )
        except DjangoValidationError as e:
            # Validaciones de modelo (p.ej., solapes) -> 400 controlado con detalle
            return NotificationHandler.generate_response(
                "validation_error",
                data={"errors": getattr(e, "message_dict", None) or {"detail": str(e)}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception("Error al iniciar semana: %s", e)
            return NotificationHandler.generate_response(
                "server_error", data=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaWeekFinishView(BaseWeekAPIView):
    """
    POST /bodega/tablero/week/finish/
      body/json: { "bodega": <id>, "temporada": <id>, "fecha_hasta": "YYYY-MM-DD" }
    Reglas: cerrar la semana vigente (la que contiene hoy) y no exceder 7 días.
    """
    throttle_scope = "bodega_dashboard"

    def post(self, request, *args, **kwargs):
        bodega_id = _to_int(request.data.get("bodega"))
        temporada_id = _to_int(request.data.get("temporada"))
        fecha_hasta_s = request.data.get("fecha_hasta")

        if not (bodega_id and temporada_id and fecha_hasta_s):
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "bodega, temporada y fecha_hasta son obligatorios."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        h = _parse_date_str(fecha_hasta_s)
        if not h:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "fecha_hasta inválida."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            hoy = date.today()
            # Localizar semana que contenga hoy (o, si se decide, la última; aquí usamos “vigente”)
            cw = (
                CierreSemanal.objects.filter(
                    bodega_id=bodega_id,
                    temporada_id=temporada_id,
                    is_active=True,
                    fecha_desde__lte=hoy,
                )
                .filter(Q(fecha_hasta__gte=hoy) | Q(fecha_hasta__isnull=True))
                .order_by("fecha_desde", "id")
                .last()
            )
            if not cw:
                return NotificationHandler.generate_response(
                    "validation_error",
                    data={"detail": "No hay semana vigente para cerrar."},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            # Validación de 7 días (inclusivo) previa al save (clean() también valida)
            if (h - cw.fecha_desde).days > 6:
                return NotificationHandler.generate_response(
                    "validation_error",
                    data={"detail": "La semana no puede exceder 7 días."},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            cw.fecha_hasta = h
            cw.save(update_fields=["fecha_hasta", "actualizado_en"])

            aw = _current_or_last_week_ctx(bodega_id, temporada_id)
            return NotificationHandler.generate_response(
                "data_processed_success",
                data={"active_week": aw, "context": _context_payload(temporada_id, bodega_id)},
                status_code=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.exception("Error al finalizar semana: %s", e)
            return NotificationHandler.generate_response(
                "server_error", data=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaWeeksNavView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/semanas/?bodega=:id&temporada=:id&iso_semana=YYYY-Www
    Devuelve navegación simple basada SOLO en semanas creadas: actual/prev/next/total.
    """
    throttle_scope = "bodega_dashboard"

    def get(self, request, *args, **kwargs):
        temporada_id = _require_temporada(request)
        bodega_id = _to_int(request.query_params.get("bodega"))
        if not temporada_id or not bodega_id:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "bodega y temporada son obligatorios."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Lista de semanas (cerradas y abierta si existe), ordenadas por fecha_desde
        semanas = list(
            CierreSemanal.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, is_active=True)
            .order_by("fecha_desde", "id")
            .values("id", "fecha_desde", "fecha_hasta", "iso_semana")
        )

        total = len(semanas)
        if total == 0:
            return NotificationHandler.generate_response(
                "data_processed_success",
                data={
                    "actual": None,
                    "total": 0,
                    "has_prev": False,
                    "has_next": False,
                    "context": _context_payload(temporada_id, bodega_id),
                    "items": [],
                },
                status_code=status.HTTP_200_OK,
            )

        # Elegir referencia:
        iso_key = request.query_params.get("iso_semana")
        idx = None
        if iso_key and ISO_WEEK_RE.match(iso_key):
            for i, s in enumerate(semanas):
                if s.get("iso_semana") == iso_key:
                    idx = i
                    break
        if idx is None:
            # Si hay semana que contenga hoy, usarla; si no, la última
            hoy = date.today()
            for i, s in enumerate(semanas):
                d0 = s["fecha_desde"]
                d1 = s["fecha_hasta"] or (s["fecha_desde"] + timedelta(days=6))
                if d0 <= hoy <= d1:
                    idx = i
                    break
            if idx is None:
                idx = total - 1

        cur = semanas[idx]

        def _range_of(s):
            d0 = s["fecha_desde"]
            d1 = s["fecha_hasta"] or (s["fecha_desde"] + timedelta(days=6))
            return d0.isoformat(), d1.isoformat()

        inicio, fin = _range_of(cur)

        # items extendidos: ahora también exponemos {fecha_desde, fecha_hasta, activa}
        items = []
        hoy = date.today().isoformat()
        for s in semanas:
            i0, i1 = _range_of(s)
            activa = bool(i0 <= hoy <= i1)
            items.append({
                "id": s["id"],
                "iso_semana": s.get("iso_semana") or None,
                "inicio": i0,
                "fin": i1,
                # contrato estable
                "fecha_desde": i0,
                "fecha_hasta": i1,
                "activa": activa,
            })

        data = {
            "actual": cur.get("iso_semana") or None,
            "total": total,
            "has_prev": idx > 0,
            "has_next": idx < (total - 1),
            "inicio": inicio,
            "fin": fin,
            "indice": idx + 1,  # 1-based
            "context": _context_payload(temporada_id, bodega_id),
            "items": items,
        }
        if idx > 0:
            data["prev"] = semanas[idx - 1].get("iso_semana") or None
        if idx < (total - 1):
            data["next"] = semanas[idx + 1].get("iso_semana") or None

        return NotificationHandler.generate_response(
            "data_processed_success", data=data, status_code=status.HTTP_200_OK
        )
