# gestion_bodega/views/empaques_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Sum
from datetime import timedelta  # ⬅️ agrega esto

from gestion_bodega.models import (
    ClasificacionEmpaque, CierreSemanal, CierreSemanal as _Cierre,  # alias opcional
)

from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.utils.notification_handler import NotificationHandler

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

def _semana_cerrada(bodega_id: int, temporada_id: int, fecha) -> bool:
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha_desde__lte=fecha,
        fecha_hasta__gte=fecha,
        is_active=True
    ).exists()

def _resolve_semana_for_fecha(bodega, temporada, fecha):
    """Misma heurística que recepciones: semana abierta = desde + 6."""
    qs = _Cierre.objects.filter(bodega=bodega, temporada=temporada, is_active=True).order_by("-fecha_desde")
    for c in qs:
        start = c.fecha_desde
        end = c.fecha_hasta or (c.fecha_desde + timedelta(days=6))
        if start <= fecha <= end:
            return c
    return None


class ClasificacionEmpaqueViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Clasificación (empaque) por recepción.
    - Bloqueo si la semana ISO está cerrada.
    - Inmutabilidad si la línea tiene consumos (SurtidoRenglon).
    - Acción bulk-upsert para captura rápida.
    """
    queryset = (
        ClasificacionEmpaque.objects
        .select_related("recepcion", "bodega", "temporada", "semana")  # ⬅️ incluye semana
        .order_by("-fecha", "-id")
    )
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_clasificacion"],
        "retrieve": ["view_clasificacion"],
        "create":   ["add_clasificacion"],
        "update":   ["change_clasificacion"],
        "partial_update": ["change_clasificacion"],
        "destroy":  ["delete_clasificacion"],
        "bulk_upsert": ["add_clasificacion"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "recepcion": ["exact"],
        "semana": ["exact"],   # NUEVO
        "material": ["exact"],
        "calidad": ["exact", "icontains"],
        "tipo_mango": ["exact", "icontains"],
        "fecha": ["exact", "gte", "lte"],
        "is_active": ["exact"]
    }
    search_fields = ["calidad", "tipo_mango"]
    ordering_fields = ["fecha", "id", "creado_en"]
    ordering = ["-fecha", "-id"]

    def get_permissions(self):
        action = getattr(self, "action", None)
        self.required_permissions = self._perm_map.get(action, [])
        return super().get_permissions()

    # ---- CREATE ----
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        bodega = ser.validated_data["bodega"]
        temporada = ser.validated_data["temporada"]
        f = ser.validated_data["fecha"]

        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()
            # ⬅️ Semana: heredamos de la recepción si existe; si no, resolvemos por fecha
            semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
            if semana != obj.semana:
                obj.semana = semana
                obj.save(update_fields=["semana", "actualizado_en"])

        return self.notify(
            key="clasificacion_creada",
            data={"clasificacion": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED
        )

    # ---- UPDATE/PATCH ----
    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.surtidos.exists():
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        bodega = ser.validated_data.get("bodega", obj.bodega)
        temporada = ser.validated_data.get("temporada", obj.temporada)
        f = ser.validated_data.get("fecha", obj.fecha)

        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()
            semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
            if semana != obj.semana:
                obj.semana = semana
                obj.save(update_fields=["semana", "actualizado_en"])

        return self.notify(
            key="clasificacion_actualizada",
            data={"clasificacion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK
        )

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.surtidos.exists():
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        bodega = ser.validated_data.get("bodega", obj.bodega)
        temporada = ser.validated_data.get("temporada", obj.temporada)
        f = ser.validated_data.get("fecha", obj.fecha)

        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()
            semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
            if semana != obj.semana:
                obj.semana = semana
                obj.save(update_fields=["semana", "actualizado_en"])

        return self.notify(
            key="clasificacion_actualizada",
            data={"clasificacion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK
        )

    # ---- DELETE ----
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.surtidos.exists():
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        with transaction.atomic():
            obj.archivar()
        return self.notify(key="clasificacion_archivada", status_code=status.HTTP_200_OK)

    # ---- BULK UPSERT (captura rápida) ----
    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        """
        Recibe: {
          "recepcion": id,
          "bodega": id,
          "temporada": id,
          "fecha": "YYYY-MM-DD",
          "items": [
            {"material": "...", "calidad": "...", "tipo_mango": "...", "cantidad_cajas": N},
            ...
          ]
        }
        """
        from gestion_bodega.serializers import ClasificacionEmpaqueBulkUpsertSerializer, ClasificacionEmpaqueSerializer

        ser = ClasificacionEmpaqueBulkUpsertSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        bodega = ser.validated_data["bodega"]
        temporada = ser.validated_data["temporada"]
        f = ser.validated_data["fecha"]
        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        created, updated = [], []
        with transaction.atomic():
            for item_data in ser.validated_data["items"]:
                line_ser = ClasificacionEmpaqueSerializer(data={
                    "recepcion": ser.validated_data["recepcion"].id,
                    "bodega": bodega.id,
                    "temporada": temporada.id,
                    "fecha": f,
                    **item_data
                })
                line_ser.is_valid(raise_exception=True)
                obj = line_ser.save()

                # ⬅️ Asegurar semana para cada item creado
                semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
                if semana != obj.semana:
                    obj.semana = semana
                    obj.save(update_fields=["semana", "actualizado_en"])

                created.append(obj.id)

        return self.notify(
            key="clasificacion_bulk_upsert_ok",
            data={"created_ids": created, "updated_ids": updated},
            status_code=status.HTTP_201_CREATED
        )
