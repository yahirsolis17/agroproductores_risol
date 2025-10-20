# backend/gestion_bodega/views/tablero_views.py
from __future__ import annotations
import logging
from typing import Any

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.utils.translation import gettext_lazy as _
from rest_framework.views import APIView
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from gestion_bodega.utils.notification_handler import NotificationHandler
from agroproductores_risol.utils.pagination import GenericPagination

# Usamos tus message_keys del módulo
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
    queue_ubicaciones_qs,
    queue_despachos_qs,
    build_queue_items,
    build_alerts,
)

logger = logging.getLogger(__name__)


# Helpers para obtener el 'message' desde tus constants (opcional; actualmente no se usa)
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
    """
    Asegura que los 403 también devuelvan envelope estándar.
    """
    permission_classes = [IsAuthenticated, BodegaDashboardPermission]

    def permission_denied(self, request, message=None, code=None):
        # NotificationHandler ya devuelve un Response con el envelope correcto
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
                "validation_error",
                data=None,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            huerta_id = request.query_params.get("huerta_id")
            huerta_id = int(huerta_id) if huerta_id else None
            fdesde = request.query_params.get("fecha_desde")
            fhasta = request.query_params.get("fecha_hasta")

            data = build_summary(temporada_id, fdesde, fhasta, huerta_id)
            serializer = DashboardSummaryResponseSerializer(data)

            return NotificationHandler.generate_response(
                "data_processed_success",
                data=serializer.data,
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
    GET /bodega/tablero/queues/?temporada=:id&type=recepciones|ubicaciones|despachos&page=&page_size=&order_by=
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
        if tipo not in {"recepciones", "ubicaciones", "despachos"}:
            return NotificationHandler.generate_response(
                "validation_error",
                data=None,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if tipo == "recepciones":
                base_qs = queue_recepciones_qs(temporada_id)
            elif tipo == "ubicaciones":
                base_qs = queue_ubicaciones_qs(temporada_id)
            else:
                base_qs = queue_despachos_qs(temporada_id)

            paginator = GenericPagination()
            page_qs = paginator.paginate_queryset(base_qs, request, view=self)

            items = build_queue_items(tipo, page_qs)
            items_ser = QueueItemSerializer(items, many=True).data

            # GenericPagination.get_paginated_response devuelve un Response con:
            # { success, notification, data: { <resource_name>/results: [...], meta: {...} } }
            paginated = paginator.get_paginated_response(items_ser)
            envelope = paginated.data.get("data", {}) or {}

            # 'results' es el nombre por defecto; si algún paginator usa 'resource_name', lo respetamos.
            results_key = getattr(paginator, "resource_name", "results")
            meta = envelope.get("meta", {}) or {}
            results = envelope.get("results")
            if results is None:
                results = envelope.get(results_key, [])  # fallback si el resource_name no es "results"

            serializer = DashboardQueueResponseSerializer({"meta": meta, "results": results})

            return NotificationHandler.generate_response(
                "data_processed_success",
                data=serializer.data,
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
    GET /bodega/tablero/alerts/?temporada=:id
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
            alerts = build_alerts(temporada_id)
            serializer = DashboardAlertResponseSerializer({"alerts": alerts})

            return NotificationHandler.generate_response(
                "data_processed_success",
                data=serializer.data,
                status_code=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.exception("Error en TableroBodegaAlertsView: %s", e)
            return NotificationHandler.generate_response(
                "server_error",
                data=None,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
