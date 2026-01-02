# gestion_bodega/views/cierres_views.py
from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.models import CierreSemanal, TemporadaBodega, Bodega
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.serializers import CierreSemanalSerializer, CierreTemporadaSerializer
from gestion_bodega.services.week_service import WeekService
from gestion_bodega.utils.activity import registrar_actividad
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.notification_handler import NotificationHandler
from gestion_bodega.utils.semana import rango_por_semana_id, tz_today_mx


class NotificationMixin:
    """Shortcut para devolver respuestas con el formato del frontend."""

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
            "page": getattr(page, "number", None),
            "page_size": paginator.get_page_size(self.request) if hasattr(paginator, "get_page_size") else None,
            "total_pages": getattr(page.paginator, "num_pages", None),
        }


class CierresViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.GenericViewSet):
    """Endpoints de cierre semanal y cierre de temporada."""

    queryset = CierreSemanal.objects.all().order_by("-fecha_desde", "-id")
    serializer_class = CierreSemanalSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "semanal": ["add_cierresemanal"],
        "temporada": ["finalize_temporadabodega"],
        "list": ["view_cierresemanal"],
        "index": ["view_cierresemanal"],
    }

    filter_backends = [DjangoFilterBackend]
    filterset_fields = {"bodega": ["exact"], "temporada": ["exact"], "iso_semana": ["exact"]}

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(getattr(self, "action", ""), [])
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = self.get_serializer(page or qs, many=True).data
        if page is not None:
            return self.notify(
                key="data_processed_success",
                data={"results": data, "meta": self.get_pagination_meta()},
                status_code=status.HTTP_200_OK,
            )
        meta = {
            "count": len(data),
            "next": None,
            "previous": None,
            "page": 1,
            "page_size": len(data),
            "total_pages": 1,
        }
        return self.notify(
            key="data_processed_success",
            data={"results": data, "meta": meta},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="index")
    def index(self, request):
        """
        Devuelve el indice de semanas registradas para una temporada.
        """
        temporada_id = request.query_params.get("temporada")
        if not temporada_id:
            return self.notify(
                key="validation_error",
                data={"errors": {"detail": "Se requiere el parametro 'temporada'"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        temporada = get_object_or_404(TemporadaBodega, pk=temporada_id)
        cierres = list(
            CierreSemanal.objects.filter(temporada_id=temporada.id)
            .order_by("fecha_desde")
            .values("id", "fecha_desde", "fecha_hasta")
        )

        if not cierres:
            return self.notify(
                key="data_processed_success",
                data={
                    "temporada": {"id": temporada.id, "anio": temporada.año, "finalizada": temporada.finalizada},
                    "current_semana_ix": None,
                    "weeks": [],
                },
                status_code=status.HTTP_200_OK,
            )

        idx_actual = None
        for i, s in enumerate(cierres):
            if s["fecha_hasta"] is None:
                idx_actual = i
                break
        if idx_actual is None:
            idx_actual = len(cierres) - 1

        weeks: List[Dict] = []
        for i, s in enumerate(cierres, start=1):
            desde, hasta, label = rango_por_semana_id(s["id"])
            weeks.append(
                {
                    "semana_ix": i,
                    "desde": str(desde),
                    "hasta": str(hasta),
                    "iso_semana": label,
                    "is_closed": s["fecha_hasta"] is not None,
                    "is_expired": s["fecha_hasta"] is None and (tz_today_mx() - s["fecha_desde"]).days > 6,
                    "semana_id": s["id"],
                }
            )

        return self.notify(
            key="data_processed_success",
            data={
                "temporada": {"id": temporada.id, "anio": temporada.año, "finalizada": temporada.finalizada},
                "current_semana_ix": idx_actual + 1,
                "weeks": weeks,
            },
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def semanal(self, request):
        """
        Cierra una semana (manual) para una bodega+temporada.
        Body:
        {
          "bodega": id,
          "temporada": id,
          "iso_semana": "YYYY-Www",           # opcional, etiqueta
          "fecha_desde": "YYYY-MM-DD",
          "fecha_hasta": "YYYY-MM-DD"         # opcional; si no viene, queda abierta
        }
        """
        ser = CierreSemanalSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cierre = ser.save(locked_by=request.user)

        registrar_actividad(
            request.user,
            f"Creo/actualizo cierre semanal (bodega {cierre.bodega_id}, temporada {cierre.temporada_id}, semana {cierre.id})",
        )
        return self.notify(
            key="cierre_semanal_creado",
            data={"cierre": CierreSemanalSerializer(cierre).data},
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def temporada(self, request):
        """
        Marca una temporada de bodega como finalizada.
        Body: { "temporada": id }
        """
        ser = CierreTemporadaSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        temporada: TemporadaBodega = ser.validated_data["temporada"]

        with transaction.atomic():
            temporada.finalizar()

        registrar_actividad(
            request.user,
            f"Finalizo temporada de bodega #{temporada.id} ({temporada.año})",
        )
        return self.notify(
            key="temporada_cerrada",
            data={"temporada": {"id": temporada.id, "año": temporada.año, "finalizada": True}},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="cerrar")
    def cerrar(self, request, pk=None):
        """
        Finaliza una semana abierta (CierreSemanal) asignandole fecha_hasta.
        Si no se envia fecha_hasta, se usa la fecha local de hoy.
        Usa WeekService para aplicar lógica unificada (clamp de 7 días).
        """
        cierre: CierreSemanal = self.get_object()

        raw_fh = request.data.get("fecha_hasta")
        try:
            fhasta = date.fromisoformat(str(raw_fh)) if raw_fh else tz_today_mx()
        except Exception:
            return self.notify(
                key="validation_error",
                data={"errors": {"fecha_hasta": ["Formato de fecha invalido. Use YYYY-MM-DD."]}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cierre = WeekService.close_week(cierre, fhasta, user=request.user)
        except DjangoValidationError as e:
            return self.notify(
                key="validation_error",
                data={"errors": {"detail": str(e)}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        registrar_actividad(
            request.user,
            f"Cerro semana de bodega {cierre.bodega_id} temporada {cierre.temporada_id} (semana {cierre.id} truncada a {cierre.fecha_hasta})",
        )
        return self.notify(
            key="cierre_semanal_cerrado",
            data={"cierre": CierreSemanalSerializer(cierre).data},
            status_code=status.HTTP_200_OK,
        )
