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
from django.core.exceptions import ValidationError as DjangoValidationError, ObjectDoesNotExist, FieldError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Q
from django.db import transaction, IntegrityError

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
from gestion_bodega.utils.activity import registrar_actividad

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


def _current_or_last_week_ctx(
    bodega_id: Optional[int],
    temporada_id: int,
) -> Optional[Dict[str, Any]]:
    """
    Regla unificada para TODO el tablero:

    - Semana ACTIVA = CierreSemanal con fecha_hasta is null (bodega+temporada, is_active=True).
    - Si hay varias abiertas (no debería por constraint), tomamos la última por fecha_desde.
    - Si NO hay abiertas, tomamos la ÚLTIMA semana registrada como contexto, marcada como CERRADA.

    Siempre devolvemos:
      {
        "id": <id>,
        "fecha_inicio": "YYYY-MM-DD",
        "fecha_fin": "YYYY-MM-DD" | None,  # real persistida
        "rango_inferido": { "from": ..., "to": ... },  # to = fecha_fin o fecha_desde+6 si está abierta
        "estado": "ABIERTA" | "CERRADA",
        "iso_semana": "YYYY-Www" | None,
        "activa": True si fecha_hasta is null, False en caso contrario
      }
    """
    if not bodega_id:
        return None
    try:
        qs = (
            CierreSemanal.objects.filter(
                bodega_id=bodega_id,
                temporada_id=temporada_id,
                is_active=True,
            )
            .order_by("fecha_desde", "id")
        )

        # 1) Priorizar semana ABIERTA (fecha_hasta is null)
        week = qs.filter(fecha_hasta__isnull=True).last()

        # 2) Si no hay abiertas, usar la última semana registrada (cerrada)
        if not week:
            week = qs.last()
            if not week:
                return None

        start = week.fecha_desde
        end_real = week.fecha_hasta
        end_theoretical = end_real or (start + timedelta(days=6))

        return {
            "id": week.id,
            "fecha_inicio": start.isoformat(),
            "fecha_fin": end_real.isoformat() if end_real else None,
            "rango_inferido": {
                "from": start.isoformat(),
                "to": end_theoretical.isoformat(),
            },
            "estado": "ABIERTA" if end_real is None else "CERRADA",
            "iso_semana": week.iso_semana or None,
            "activa": end_real is None,
        }
    except Exception:
        return None


def _week_simple_payload(week: CierreSemanal) -> Dict[str, Any]:
    """
    Payload compacto y consistente para el frontend.

    Regla:
      - activa = True si fecha_hasta is null (semana abierta)
      - activa = False si fecha_hasta tiene valor (semana cerrada)
    """
    start = week.fecha_desde
    end_real = week.fecha_hasta

    return {
        "id": week.id,
        "fecha_desde": start.isoformat(),
        "fecha_hasta": end_real.isoformat() if end_real else None,
        "iso_semana": week.iso_semana or None,
        "activa": end_real is None,
    }


def _resolve_range(
    request,
    temporada_id: int,
    bodega_id: Optional[int],
) -> Tuple[Optional[str], Optional[str], Optional[Dict[str, Any]]]:
    """
    Prioridad de rango para KPIs y colas:

      1) semana_id (semana manual registrada)
      2) fecha_desde/fecha_hasta explícitos
      3) iso_semana válida (YYYY-Www)
      4) semana abierta (o, si no existe, la última)
      5) None

    Devuelve (fdesde_str, fhasta_str, active_week_ctx)
    """
    # 1) semana_id → usamos CierreSemanal real
    semana_id = _to_int(request.query_params.get("semana_id"))
    if semana_id:
        try:
            qs = CierreSemanal.objects.filter(
                id=semana_id,
                temporada_id=temporada_id,
                is_active=True,
            )
            if bodega_id:
                qs = qs.filter(bodega_id=bodega_id)

            week = qs.get()
            start = week.fecha_desde
            end = week.fecha_hasta or (start + timedelta(days=6))
            return start.isoformat(), end.isoformat(), _current_or_last_week_ctx(
                bodega_id,
                temporada_id,
            )
        except ObjectDoesNotExist:
            logger.info("semana_id no corresponde a este contexto")
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
            return a.isoformat(), b.isoformat(), _current_or_last_week_ctx(
                bodega_id,
                temporada_id,
            )

    # 4) semana abierta (o última)
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
# Vistas: Summary / Queues / Alerts
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
                "validation_error",
                data=None,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            bodega_id = _to_int(request.query_params.get("bodega"))
            huerta_id = _to_int(request.query_params.get("huerta_id"))

            fdesde, fhasta, _ = _resolve_range(request, temporada_id, bodega_id)

            kpis_or_payload = build_summary(
                temporada_id,
                fdesde,
                fhasta,
                huerta_id,
            )
            payload = (
                kpis_or_payload
                if isinstance(kpis_or_payload, dict) and "kpis" in kpis_or_payload
                else {"kpis": kpis_or_payload}
            )

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
                "server_error",
                data=None,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
                "validation_error",
                data=None,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        tipo = request.query_params.get("type")
        if tipo not in {"recepciones", "inventarios", "despachos"}:
            return NotificationHandler.generate_response(
                "validation_error",
                data=None,
                status_code=status.HTTP_400_BAD_REQUEST,
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
                try:
                    base_qs = base_qs.order_by(*ordering)
                except FieldError as fe:
                    return NotificationHandler.generate_response(
                        "validation_error",
                        data={"detail": f"ordering_not_supported:{str(fe)}"},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

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
                "data_processed_success",
                data=data,
                status_code=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception("Error en TableroBodegaQueuesView: %s", e)
            return NotificationHandler.generate_response(
                "server_error",
                data=None,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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

            try:
                TemporadaBodega.objects.get(
                    id=temporada_id,
                    bodega_id=bodega_id,
                    is_active=True,
                    finalizada=False,
                )
            except TemporadaBodega.DoesNotExist:
                return NotificationHandler.generate_response(
                    "validation_error",
                    data={"detail": "Temporada inválida o no activa para esta bodega."},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            alerts = build_alerts(
                temporada_id=temporada_id,
                bodega_id=bodega_id,
            )
            payload = {"alerts": alerts}
            ser = DashboardAlertResponseSerializer(payload)
            data = dict(ser.data)
            data["context"] = _context_payload(temporada_id, bodega_id)

            return NotificationHandler.generate_response(
                "data_processed_success",
                data=data,
                status_code=status.HTTP_200_OK,
            )
        except (ValueError, DjangoValidationError) as ve:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": str(ve)},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception("Error en TableroBodegaAlertsView: %s", e)
            return NotificationHandler.generate_response(
                "server_error",
                data=None,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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

    def _require_ctx(
        self,
        request,
    ) -> Tuple[Optional[int], Optional[int], Optional[TemporadaBodega]]:
        temporada_id = _require_temporada(request)
        bodega_id = _to_int(request.query_params.get("bodega"))
        if not temporada_id or not bodega_id:
            return None, None, None
        try:
            t = TemporadaBodega.objects.select_related("bodega").get(
                id=temporada_id,
                bodega_id=bodega_id,
            )
            return bodega_id, temporada_id, t
        except TemporadaBodega.DoesNotExist:
            return bodega_id, temporada_id, None


@method_decorator(never_cache, name="dispatch")
class TableroBodegaWeekCurrentView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/week/current/?bodega=:id&temporada=:id

    Regla de negocio:
      - Semana ACTIVA = CierreSemanal con fecha_hasta is null para esa bodega+temporada.
      - Si no hay semana activa, se devuelve la última semana (cerrada) solo como contexto.
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
            week_simple = {
                "id": aw.get("id"),
                "fecha_desde": aw.get("fecha_inicio"),
                "fecha_hasta": aw.get("fecha_fin"),
                "activa": bool(aw.get("activa")),
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

    Política nueva:
      - La semana se crea ABIERTA: fecha_hasta = null.
      - Solo puede existir UNA semana abierta por (bodega, temporada)
        (enforced por constraint + validación defensiva aquí).
      - La duración máxima (7 días) y los no solapes se validan en CierreSemanal.clean()
        usando un fin teórico = fecha_desde + 6 para semanas abiertas.
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
            TemporadaBodega.objects.get(
                id=temporada_id,
                bodega_id=bodega_id,
                is_active=True,
                finalizada=False,
            )
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
            with transaction.atomic():
                # Validación explícita: solo una semana ABIERTA por contexto
                if (
                    CierreSemanal.objects.select_for_update()
                    .filter(
                        bodega_id=bodega_id,
                        temporada_id=temporada_id,
                        fecha_hasta__isnull=True,
                        is_active=True,
                    )
                    .exists()
                ):
                    return NotificationHandler.generate_response(
                        "validation_error",
                        data={"detail": "Ya existe una semana abierta para esta bodega y temporada."},
                        status_code=status.HTTP_409_CONFLICT,
                    )

                cw = CierreSemanal.objects.create(
                    bodega_id=bodega_id,
                    temporada_id=temporada_id,
                    fecha_desde=f,
                    fecha_hasta=None,  # Semana ABIERTA
                    iso_semana=iso_tag,
                    locked_by=request.user,
                )

            aw = _current_or_last_week_ctx(bodega_id, temporada_id)
            week_payload = _week_simple_payload(cw)

            registrar_actividad(
                request.user,
                f"Inició semana de bodega {bodega_id}, temporada {temporada_id}, desde {f.isoformat()}",
            )

            return NotificationHandler.generate_response(
                "data_processed_success",
                data={
                    "week": week_payload,
                    "active_week": aw,
                    "context": _context_payload(temporada_id, bodega_id),
                },
                status_code=status.HTTP_201_CREATED,
            )
        except DjangoValidationError as e:
            # Validaciones de modelo (p.ej., solapes) -> 400 controlado con detalle
            return NotificationHandler.generate_response(
                "validation_error",
                data={"errors": getattr(e, "message_dict", None) or {"detail": str(e)}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except IntegrityError:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "Ya existe una semana abierta para esta bodega y temporada."},
                status_code=status.HTTP_409_CONFLICT,
            )
        except Exception as e:
            logger.exception("Error al iniciar semana: %s", e)
            return NotificationHandler.generate_response(
                "server_error",
                data=None,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaWeekFinishView(BaseWeekAPIView):
    """
    POST /bodega/tablero/week/finish/
      body/json: {
        "bodega": <id>,
        "temporada": <id>,
        "semana_id": <id>,
        "fecha_hasta": "YYYY-MM-DD"
      }

    Reglas:
      - Cierra la semana indicada (semana_id) para esa bodega+temporada.
      - Solo puede cerrarse si está ABIERTA (fecha_hasta is null).
      - La fecha de cierre debe estar en el rango [fecha_desde, fecha_desde+6].
    """
    throttle_scope = "bodega_dashboard"

    def post(self, request, *args, **kwargs):
        bodega_id = _to_int(request.data.get("bodega"))
        temporada_id = _to_int(request.data.get("temporada"))
        semana_id = _to_int(request.data.get("semana_id"))
        fecha_hasta_s = request.data.get("fecha_hasta")

        if not (bodega_id and temporada_id and semana_id and fecha_hasta_s):
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "bodega, temporada, semana_id y fecha_hasta son obligatorios."},
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
            with transaction.atomic():
                # Lock de la semana a cerrar
                cw = (
                    CierreSemanal.objects.select_for_update()
                    .get(
                        id=semana_id,
                        bodega_id=bodega_id,
                        temporada_id=temporada_id,
                        is_active=True,
                    )
                )

                # Solo se puede cerrar si sigue ABIERTA
                if cw.fecha_hasta is not None:
                    return NotificationHandler.generate_response(
                        "validation_error",
                        data={"detail": "La semana ya está cerrada."},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                # Validaciones de rango
                if h < cw.fecha_desde:
                    return NotificationHandler.generate_response(
                        "validation_error",
                        data={"detail": "La fecha de cierre no puede ser anterior al inicio de la semana."},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                if (h - cw.fecha_desde).days > 6:
                    return NotificationHandler.generate_response(
                        "validation_error",
                        data={"detail": "La semana no puede exceder 7 días."},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                cw.fecha_hasta = h
                cw.save(update_fields=["fecha_hasta", "actualizado_en"])

            aw = _current_or_last_week_ctx(bodega_id, temporada_id)
            week_payload = _week_simple_payload(cw)

            registrar_actividad(
                request.user,
                f"Cerró semana {cw.id} de bodega {bodega_id}, temporada {temporada_id}, hasta {h.isoformat()}",
            )

            return NotificationHandler.generate_response(
                "data_processed_success",
                data={
                    "week": week_payload,  # 👈 semana cerrada concreta
                    "active_week": aw,
                    "context": _context_payload(temporada_id, bodega_id),
                },
                status_code=status.HTTP_200_OK,
            )
        except CierreSemanal.DoesNotExist:
            return NotificationHandler.generate_response(
                "validation_error",
                data={"detail": "No existe la semana indicada para cerrar."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception("Error al finalizar semana: %s", e)
            return NotificationHandler.generate_response(
                "server_error",
                data=None,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaWeeksNavView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/semanas/?bodega=:id&temporada=:id&iso_semana=YYYY-Www
    Devuelve navegación simple basada SOLO en semanas creadas: actual/prev/next/total.

    Regla:
      - Semana ACTIVA = fecha_hasta is null.
      - Si no hay semana activa, la "actual" es la última semana creada.
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
            CierreSemanal.objects.filter(
                bodega_id=bodega_id,
                temporada_id=temporada_id,
                is_active=True,
            )
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
        idx: Optional[int] = None

        # 1) Si viene iso_semana válida, usar esa
        if iso_key and ISO_WEEK_RE.match(iso_key):
            for i, s in enumerate(semanas):
                if s.get("iso_semana") == iso_key:
                    idx = i
                    break

        # 2) Si no, usar la semana ABIERTA (fecha_hasta is null) si existe
        if idx is None:
            for i, s in enumerate(semanas):
                if s["fecha_hasta"] is None:
                    idx = i
                    break

        # 3) Si no hay abiertas, usar la última
        if idx is None:
            idx = total - 1

        cur = semanas[idx]

        def _range_of(s):
            d0 = s["fecha_desde"]
            real_end = s["fecha_hasta"]
            # Para semanas abiertas usamos fin teórico = +6 días
            d1 = real_end or (d0 + timedelta(days=6))
            return d0.isoformat(), d1.isoformat(), real_end.isoformat() if real_end else None

        inicio, fin, _ = _range_of(cur)

        # items extendidos: {fecha_desde real, fecha_hasta real (None si abierta), activa}
        items = []
        for s in semanas:
            i0, i1, real_end_str = _range_of(s)
            activa = s["fecha_hasta"] is None
            items.append(
                {
                    "id": s["id"],
                    "iso_semana": s.get("iso_semana") or None,
                    # Rango "visible" en el tablero
                    "inicio": i0,
                    "fin": i1,
                    # Fechas reales persistidas
                    "fecha_desde": i0,
                    "fecha_hasta": real_end_str,
                    "activa": activa,
                }
            )

        data = {
            "actual": cur.get("iso_semana") or None,
            "total": total,
            "has_prev": idx > 0,
            "has_next": idx < (total - 1),
            "inicio": inicio,
            "fin": fin,
            "actual_id": cur.get("id"),
            "prev_id": semanas[idx - 1].get("id") if idx > 0 else None,
            "next_id": semanas[idx + 1].get("id") if idx < (total - 1) else None,
            "indice": idx + 1,  # 1-based
            "context": _context_payload(temporada_id, bodega_id),
            "items": items,
        }
        if idx > 0:
            data["prev"] = semanas[idx - 1].get("iso_semana") or None
        if idx < (total - 1):
            data["next"] = semanas[idx + 1].get("iso_semana") or None

        return NotificationHandler.generate_response(
            "data_processed_success",
            data=data,
            status_code=status.HTTP_200_OK,
        )
