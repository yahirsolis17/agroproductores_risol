# gestion_bodega/views/cierres_views.py
from __future__ import annotations

from typing import List, Dict

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from gestion_bodega.models import CierreSemanal, TemporadaBodega
from gestion_bodega.serializers import CierreSemanalSerializer, CierreTemporadaSerializer
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.utils.notification_handler import NotificationHandler
from gestion_bodega.utils.semana import (
    tz_today_mx,
    season_week_index,
    season_week_bounds,
)

class NotificationMixin:
    """Shortcut para devolver respuestas con el formato del frontend."""

    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )

    def get_pagination_meta(self):
        paginator = getattr(self, 'paginator', None)
        page = getattr(paginator, 'page', None) if paginator else None
        if not paginator or page is None:
            return {
                'count': 0,
                'next': None,
                'previous': None,
                'page': None,
                'page_size': None,
                'total_pages': None,
            }
        return {
            'count': page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
            'page': getattr(page, 'number', None),
            'page_size': paginator.get_page_size(self.request) if hasattr(paginator, 'get_page_size') else None,
            'total_pages': getattr(page.paginator, 'num_pages', None),
        }


class CierresViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.GenericViewSet):
    """
    Endpoints de cierre semanal y cierre de temporada.
    """
    queryset = CierreSemanal.objects.all().order_by("-fecha_desde", "-id")
    serializer_class = CierreSemanalSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        # Crear un cierre semanal requiere poder agregar registros de CierreSemanal
        "semanal": ["add_cierresemanal"],
        # Cerrar temporada usa la capacidad de lifecycle sobre TemporadaBodega
        "temporada": ["finalize_temporadabodega"],
        # Listado de cierres semanales
        "list": ["view_cierresemanal"],
        # Índice de semanas (consulta)
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
                status_code=status.HTTP_200_OK
            )
        return self.notify(key="data_processed_success", data={"results": data}, status_code=status.HTTP_200_OK)

    # ──────────────────────────────────────────────────────────────────────
    # NUEVO: índice de semanas de una temporada (rango, cerrada/abierta)
    # GET /bodega/cierres/index/?temporada=:id
    # ──────────────────────────────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="index")
    def index(self, request):
        temporada_id = request.query_params.get("temporada")
        if not temporada_id:
            return self.notify(
                key="validation_error",
                data={"errors": {"temporada": ["Este campo es obligatorio."]}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        temporada = get_object_or_404(TemporadaBodega, pk=temporada_id)

        # Construcción de semanas desde el ancla (lunes ISO de la semana de inicio)
        # hasta hoy (o fecha_fin si existe). Semana 1 es la que arranca en el lunes ISO
        # que contiene a fecha_inicio (recortada al inicio real de temporada).
        today = tz_today_mx()
        last_day = min(temporada.fecha_fin or today, today)

        weeks: List[Dict] = []
        ix = 1
        while True:
            desde, hasta, code = season_week_bounds(temporada, ix)
            # detener cuando el rango ya no intersecta la temporada
            if desde > last_day:
                break

            # ¿Existe cierre activo que cubra este rango?
            cerrada = CierreSemanal.objects.filter(
                bodega=temporada.bodega,
                temporada=temporada,
                is_active=True,
                fecha_desde__lte=hasta,
                fecha_hasta__gte=desde,
            ).exists()

            weeks.append({
                "semana_ix": ix,
                "desde": str(desde),
                "hasta": str(hasta),
                "iso_semana": code,
                "is_closed": cerrada,
            })
            ix += 1

        current_ix = season_week_index(last_day, temporada.fecha_inicio)

        return self.notify(
            key="data_processed_success",
            data={
                "temporada": {"id": temporada.id, "año": temporada.año, "finalizada": temporada.finalizada},
                "current_semana_ix": current_ix,
                "weeks": weeks,
            },
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def semanal(self, request):
        """
        Cierra una semana ISO para una bodega+temporada.
        Body:
        {
          "bodega": id,
          "temporada": id,
          "iso_semana": "YYYY-Www",
          "fecha_desde": "YYYY-MM-DD",
          "fecha_hasta": "YYYY-MM-DD"
        }
        """
        ser = CierreSemanalSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cierre = ser.save(locked_by=request.user)

        return self.notify(
            key="cierre_semanal_creado",
            data={"cierre": CierreSemanalSerializer(cierre).data},
            status_code=status.HTTP_201_CREATED
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

        return self.notify(
            key="temporada_cerrada",
            data={"temporada": {"id": temporada.id, "año": temporada.año, "finalizada": True}},
            status_code=status.HTTP_200_OK
        )
