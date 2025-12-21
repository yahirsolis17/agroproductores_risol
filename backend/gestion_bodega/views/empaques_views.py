# backend/gestion_bodega/views/empaques_views.py
from datetime import timedelta

from django.db import transaction
from django.db.models import Sum, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.models import (
    ClasificacionEmpaque,
    CierreSemanal,
)
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.serializers import ClasificacionEmpaqueSerializer
from gestion_bodega.utils.audit import ViewSetAuditMixin
from gestion_bodega.utils.notification_handler import NotificationHandler
from gestion_bodega.utils.semana import semana_cerrada_ids  # ✅ centralizado


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
            "page": getattr(page, "number", None),
            "page_size": paginator.get_page_size(self.request) if hasattr(paginator, "get_page_size") else None,
            "total_pages": getattr(page.paginator, "num_pages", None),
        }


def _resolve_semana_for_fecha(bodega, temporada, fecha):
    """
    Devuelve el CierreSemanal cuyo rango cubre la fecha.
    Para semana abierta (fecha_hasta=None) usa fin teórico = fecha_desde + 6 días.
    """
    qs = CierreSemanal.objects.filter(
        bodega=bodega,
        temporada=temporada,
        is_active=True,
    ).order_by("-fecha_desde")

    for c in qs:
        start = c.fecha_desde
        end = c.fecha_hasta or (c.fecha_desde + timedelta(days=6))
        if start <= fecha <= end:
            return c
    return None


def _derive_empaque_status(captured: int, packed: int) -> str:
    if packed <= 0:
        return "SIN_EMPAQUE"
    if captured > 0 and packed >= captured:
        return "EMPACADO"
    return "PARCIAL"


class ClasificacionEmpaqueViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Clasificación (empaque) por recepción.

    Reglas clave:
    - Bloqueo si la semana está cerrada (centralizado en utils/semana.py).
    - Inmutabilidad si la línea tiene consumos (SurtidoRenglon).
    - Bulk-upsert: captura rápida alineada con server-truth y UniqueConstraint:
        * tipo_mango siempre heredado de la recepción
        * índice por (material, calidad) (sin fecha) para respetar constraint
        * reactiva/actualiza fecha/semana/cantidad cuando aplica
    """
    serializer_class = ClasificacionEmpaqueSerializer

    queryset = (
        ClasificacionEmpaque.objects
        .select_related("recepcion", "bodega", "temporada", "semana")
        .order_by("-fecha", "-id")
    )
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list": ["view_clasificacion"],
        "retrieve": ["view_clasificacion"],
        "create": ["add_clasificacion"],
        "update": ["change_clasificacion"],
        "partial_update": ["change_clasificacion"],
        "destroy": ["delete_clasificacion"],
        "bulk_upsert": ["add_clasificacion"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "recepcion": ["exact"],
        "semana": ["exact"],
        "material": ["exact"],
        "calidad": ["exact", "icontains"],
        "tipo_mango": ["exact", "icontains"],
        "fecha": ["exact", "gte", "lte"],
        "is_active": ["exact"],
    }
    search_fields = ["calidad", "tipo_mango"]
    ordering_fields = ["fecha", "id", "creado_en"]
    ordering = ["-fecha", "-id"]

    def get_permissions(self):
        # ✅ default: view_clasificacion si no está mapeada la acción
        self.required_permissions = self._perm_map.get(self.action, ["view_clasificacion"])
        return [p() for p in self.permission_classes]

    # ───────────────────────────────────────────────────────────────────────
    # LIST / RETRIEVE (contrato: NotificationHandler + meta/results)
    # ───────────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)

        if page is not None:
            ser = self.get_serializer(page, many=True)
            rows = list(ser.data)
            meta = self.get_pagination_meta()
        else:
            ser = self.get_serializer(qs, many=True)
            rows = list(ser.data)
            meta = {
                "count": len(rows),
                "next": None,
                "previous": None,
                "page": 1,
                "page_size": len(rows),
                "total_pages": 1,
            }

        return self.notify(
            key="data_processed_success",
            data={
                "empaques": rows,
                "results": rows,
                "meta": meta,
            },
            status_code=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        row = self.get_serializer(obj).data
        return self.notify(
            key="data_processed_success",
            data={"clasificacion": row},
            status_code=status.HTTP_200_OK,
        )

    # ───────────────────────────────────────────────────────────────────────
    # CREATE
    # ───────────────────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        bodega = ser.validated_data["bodega"]
        temporada = ser.validated_data["temporada"]
        f = ser.validated_data["fecha"]

        # ✅ semana cerrada centralizada
        if semana_cerrada_ids(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

            # Semana: prioriza la semana de la recepción; si no, resuelve por fecha
            semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
            if semana != obj.semana:
                obj.semana = semana
                obj.save(update_fields=["semana", "actualizado_en"])

        return self.notify(
            key="clasificacion_creada",
            data={"clasificacion": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED,
        )

    # ───────────────────────────────────────────────────────────────────────
    # UPDATE / PATCH
    # ───────────────────────────────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.surtidos.exists():
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        bodega = ser.validated_data.get("bodega", obj.bodega)
        temporada = ser.validated_data.get("temporada", obj.temporada)
        f = ser.validated_data.get("fecha", obj.fecha)

        if semana_cerrada_ids(bodega.id, temporada.id, f):
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
            status_code=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.surtidos.exists():
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        bodega = ser.validated_data.get("bodega", obj.bodega)
        temporada = ser.validated_data.get("temporada", obj.temporada)
        f = ser.validated_data.get("fecha", obj.fecha)

        if semana_cerrada_ids(bodega.id, temporada.id, f):
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
            status_code=status.HTTP_200_OK,
        )

    # ───────────────────────────────────────────────────────────────────────
    # DELETE (soft -> archivar)
    # ───────────────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()

        if obj.surtidos.exists():
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        if semana_cerrada_ids(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj.archivar()

        return self.notify(key="clasificacion_archivada", status_code=status.HTTP_200_OK)

    # ───────────────────────────────────────────────────────────────────────
    # BULK UPSERT (captura rápida)
    # ───────────────────────────────────────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        """
        Request:
        {
          "recepcion": id,
          "bodega": id,
          "temporada": id,
          "fecha": "YYYY-MM-DD",
          "items": [
            {"material": "...", "calidad": "...", "tipo_mango": "...", "cantidad_cajas": N},
            ...
          ]
        }

        Response:
        - created_ids / updated_ids
        - summary por recepción (empaque_status + counts)
        """
        from gestion_bodega.serializers import ClasificacionEmpaqueBulkUpsertSerializer

        ser = ClasificacionEmpaqueBulkUpsertSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        recepcion = ser.validated_data["recepcion"]
        bodega = ser.validated_data["bodega"]
        temporada = ser.validated_data["temporada"]
        f = ser.validated_data["fecha"]

        if semana_cerrada_ids(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        # Semana: heredamos de recepción si existe, si no resolvemos
        semana = getattr(recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)

        # ✅ Índice de existentes por (material, calidad) (sin fecha) para respetar UniqueConstraint
        existing_qs = (
            ClasificacionEmpaque.objects.select_for_update()
            .filter(
                recepcion=recepcion,
                bodega=bodega,
                temporada=temporada,
            )
        )

        existing = {}
        for obj in existing_qs:
            k = (obj.material, str(obj.calidad).strip())
            existing[k] = obj

        created_ids, updated_ids = [], []

        # ✅ Server-truth: tipo_mango siempre viene de la recepción
        recepcion_tipo_mango = (getattr(recepcion, "tipo_mango", "") or "").strip()

        with transaction.atomic():
            for item in ser.validated_data["items"]:
                material = item["material"]
                calidad = str(item["calidad"]).strip()
                qty = int(item.get("cantidad_cajas") or 0)

                k = (material, calidad)

                if k in existing:
                    obj = existing[k]

                    if obj.surtidos.exists():
                        return self.notify(
                            key="clasificacion_con_consumos_inmutable",
                            data={"info": f"Línea {material}/{calidad} tiene consumos y no se puede modificar."},
                            status_code=status.HTTP_409_CONFLICT,
                        )

                    changed = (
                        obj.cantidad_cajas != qty
                        or obj.is_active is False
                        or obj.fecha != f
                        or obj.semana_id != (semana.id if semana else None)
                        or (str(getattr(obj, "tipo_mango", "") or "").strip() != recepcion_tipo_mango)
                    )

                    if changed:
                        obj.cantidad_cajas = qty
                        obj.is_active = True
                        obj.fecha = f
                        obj.semana = semana
                        obj.tipo_mango = recepcion_tipo_mango
                        obj.save(update_fields=["cantidad_cajas", "is_active", "fecha", "semana", "tipo_mango", "actualizado_en"])
                        updated_ids.append(obj.id)

                else:
                    obj = ClasificacionEmpaque.objects.create(
                        recepcion=recepcion,
                        bodega=bodega,
                        temporada=temporada,
                        fecha=f,
                        semana=semana,
                        material=material,
                        calidad=calidad,
                        tipo_mango=recepcion_tipo_mango,
                        cantidad_cajas=qty,
                    )
                    created_ids.append(obj.id)

        # Resumen para chip/tabla (MERMA exacta)
        agg = (
            ClasificacionEmpaque.objects
            .filter(recepcion=recepcion, is_active=True)
            .aggregate(
                packed=Sum("cantidad_cajas"),
                merma=Sum("cantidad_cajas", filter=Q(calidad__iexact="MERMA")),
            )
        )
        packed = int(agg.get("packed") or 0)
        merma = int(agg.get("merma") or 0)

        captured = int(getattr(recepcion, "cajas_campo", 0) or 0)

        summary = {
            "recepcion_id": recepcion.id,
            "empaque_status": _derive_empaque_status(captured, packed),
            "cajas_empaquetadas": packed,
            "cajas_disponibles": max(0, captured - packed),
            "cajas_merma": merma,
            "empaque_id": None,
        }

        return self.notify(
            key="clasificacion_bulk_upsert_ok",
            data={
                "created_ids": created_ids,
                "updated_ids": updated_ids,
                "summary": summary,
            },
            status_code=status.HTTP_200_OK if updated_ids else status.HTTP_201_CREATED,
        )
