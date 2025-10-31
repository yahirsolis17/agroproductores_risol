# backend/gestion_bodega/views/tablero_views.py
from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.utils.translation import gettext_lazy as _
from rest_framework.views import APIView
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from gestion_bodega.utils.notification_handler import NotificationHandler
from agroproductores_risol.utils.pagination import GenericPagination

from gestion_bodega.utils.constants import NOTIFICATION_MESSAGES

from gestion_bodega.serializers import (
    DashboardSummaryResponseSerializer,
    DashboardQueueResponseSerializer,
    DashboardAlertResponseSerializer,
    QueueItemSerializer,
)
from gestion_bodega.utils.kpis import (
    build_summary,
    queue_recepciones_qs,
    queue_inventarios_qs,
    queue_despachos_qs,
    build_queue_items,
    build_alerts,
)

# 🔹 Intentamos resolver el label de temporada sin acoplar fuerte:
try:
    from gestion_huerta.models import Temporada  # si existe en tu proyecto
except Exception:  # pragma: no cover
    Temporada = None  # tipo: ignore

logger = logging.getLogger(__name__)


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


class BaseDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, BodegaDashboardPermission]

    def permission_denied(self, request, message=None, code=None):
        return NotificationHandler.generate_response(
            "permission_denied",
            data=None,
            status_code=status.HTTP_403_FORBIDDEN,
        )


def _require_temporada(request) -> int | None:
    temporada = request.query_params.get("temporada")
    try:
        return int(temporada)
    except (TypeError, ValueError):
        return None


def _to_int(v: Optional[str]) -> Optional[int]:
    try:
        return int(v) if v not in (None, "",) else None
    except ValueError:
        return None


def _parse_bool(v: Optional[str]) -> Optional[bool]:
    if v is None:
        return None
    return str(v).lower() in {"1", "true", "t", "yes", "y", "on"}


def _ordering_from_alias(tipo: str, order_by: Optional[str]) -> List[str]:
    """
    Traduce alias de negocio → campos ORM. Soporta lista separada por comas: "campo:asc,otro:desc".
    """
    if not order_by:
        return []

    alias_maps: Dict[str, Dict[str, str]] = {
        "recepciones": {
            "fecha_recepcion": "fecha",
            "id": "id",
            "huerta": "huertero_nombre",
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
    for p in parts:
        if ":" in p:
            key, direction = p.split(":", 1)
            field = mapping.get(key.strip())
            if not field:
                continue
            orm_fields.append(f"-{field}" if direction.strip().lower() == "desc" else field)
        else:
            field = mapping.get(p)
            if field:
                orm_fields.append(field)
    return orm_fields


def _temporada_label(temporada_id: int) -> str:
    """
    Intenta devolver '2025' (o nombre amigable).
    Fallbacks seguros si el modelo no está disponible o no tiene dichos campos.
    """
    if not Temporada:
        return str(temporada_id)
    try:
        t = Temporada.objects.only("id", "año", "nombre").get(id=temporada_id)
        if getattr(t, "año", None):
            return str(t.año)
        if getattr(t, "nombre", None):
            return str(t.nombre)
        return str(temporada_id)
    except Exception:
        return str(temporada_id)


@method_decorator(never_cache, name="dispatch")
class TableroBodegaSummaryView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/summary/?temporada=:id&huerta_id=&fecha_desde=&fecha_hasta=
    """
    throttle_scope = "bodega_dashboard"

    def get(self, request, *args, **kwargs):
        temporada_id = _require_temporada(request)
        if not temporada_id:
            return NotificationHandler.generate_response(
                "validation_error", data=None, status_code=status.HTTP_400_BAD_REQUEST
            )
        try:
            huerta_id = _to_int(request.query_params.get("huerta_id"))
            fdesde = request.query_params.get("fecha_desde")
            fhasta = request.query_params.get("fecha_hasta")

            kpis_or_payload = build_summary(temporada_id, fdesde, fhasta, huerta_id)
            payload = kpis_or_payload if isinstance(kpis_or_payload, dict) and "kpis" in kpis_or_payload \
                else {"kpis": kpis_or_payload}

            # ➕ Contexto común para front (temporada legible)
            payload["context"] = {
                "temporada_id": temporada_id,
                "temporada_label": _temporada_label(temporada_id),
            }

            serializer = DashboardSummaryResponseSerializer(payload)
            return NotificationHandler.generate_response(
                "data_processed_success",
                data=serializer.data,
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
    GET /bodega/tablero/queues/?temporada=:id&type=recepciones|inventarios|despachos&page=&page_size=&order_by=&fecha_desde=&fecha_hasta=&huerta_id=...
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
            fdesde = request.query_params.get("fecha_desde")
            fhasta = request.query_params.get("fecha_hasta")
            huerta_id = _to_int(request.query_params.get("huerta_id"))
            estado_lote = request.query_params.get("estado_lote")
            calidad = request.query_params.get("calidad")
            madurez = request.query_params.get("madurez")
            solo_pendientes = _parse_bool(request.query_params.get("solo_pendientes"))

            order_by_alias = request.query_params.get("order_by")
            ordering = _ordering_from_alias(tipo, order_by_alias)

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
            items_ser = QueueItemSerializer(items, many=True).data

            paginated = paginator.get_paginated_response(items_ser)
            envelope = paginated.data.get("data", {}) or {}

            results_key = getattr(paginator, "resource_name", "results")
            meta = envelope.get("meta", {}) or {}
            results = envelope.get("results")
            if results is None:
                results = envelope.get(results_key, [])  # fallback

            # ➕ Adjuntamos contexto con label de temporada
            payload = {"meta": meta, "results": results, "context": {
                "temporada_id": temporada_id,
                "temporada_label": _temporada_label(temporada_id),
            }}

            serializer = DashboardQueueResponseSerializer(payload)

            return NotificationHandler.generate_response(
                "data_processed_success", data=serializer.data, status_code=status.HTTP_200_OK
            )

        except Exception as e:
            logger.exception("Error en TableroBodegaQueuesView: %s", e)
            return NotificationHandler.generate_response(
                "server_error", data=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(never_cache, name="dispatch")
class TableroBodegaAlertsView(BaseDashboardAPIView):
    """
    GET /bodega/tablero/alerts/?temporada=:id
    """
    throttle_scope = "bodega_dashboard"

    def get(self, request, *args, **kwargs):
        temporada_id = _require_temporada(request)
        if not temporada_id:
            return NotificationHandler.generate_response(
                "validation_error", data=None, status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            alerts = build_alerts(temporada_id)
            payload = {"alerts": alerts, "context": {
                "temporada_id": temporada_id,
                "temporada_label": _temporada_label(temporada_id),
            }}
            serializer = DashboardAlertResponseSerializer(payload)
            return NotificationHandler.generate_response(
                "data_processed_success", data=serializer.data, status_code=status.HTTP_200_OK
            )
        except Exception as e:
            logger.exception("Error en TableroBodegaAlertsView: %s", e)
            return NotificationHandler.generate_response(
                "server_error", data=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
