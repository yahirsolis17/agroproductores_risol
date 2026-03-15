# backend/gestion_bodega/views/empaques_views.py
from datetime import timedelta
from typing import Any, Optional, Dict, List, Tuple, Set

from django.db import transaction
from django.db.models import Sum, Q, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.models import (
    ClasificacionEmpaque,
    Recepcion,
    CierreSemanal,
    CompraMadera,
)
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.serializers import (
    ClasificacionEmpaqueSerializer,
    ClasificacionEmpaqueBulkUpsertSerializer,
)
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.notification_handler import NotificationHandler
from gestion_bodega.utils.semana import semana_cerrada_ids
from gestion_bodega.utils.inventario_empaque import get_disponible_for_clasificacion
from gestion_bodega.services.inventory_service import InventoryService


class NotificationMixin:
    def notify(self, *, key: str, data: Optional[Dict[str, Any]]=None, status_code: int=status.HTTP_200_OK, extra_data: Optional[Dict[str, Any]]=None) -> Any:
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
            extra_data=extra_data
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
        # Uso seguro de getattr para evitar warnings de tipado estricto
        page_paginator = getattr(page, "paginator", None)
        req = getattr(self, "request") if hasattr(self, "request") else None
        get_page_size_fn = getattr(paginator, "get_page_size") if hasattr(paginator, "get_page_size") else None

        return {
            "count": getattr(page_paginator, "count", 0) if page_paginator else 0,
            "next": getattr(paginator, "get_next_link")() if hasattr(paginator, "get_next_link") else None,
            "previous": getattr(paginator, "get_previous_link")() if hasattr(paginator, "get_previous_link") else None,
            "page": getattr(page, "number", None),
            "page_size": get_page_size_fn(req) if get_page_size_fn and req else None,
            "total_pages": getattr(page_paginator, "num_pages", None) if page_paginator else None,
        }

    def validation_error_to_notify(
        self,
        exc: serializers.ValidationError,
        *,
        default_key: str = "clasificacion_validacion_error",
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Convierte ValidationError a envelope NotificationHandler, soportando
        message_key embebida dentro del detalle.
        """
        detail = getattr(exc, "detail", exc)
        if isinstance(detail, dict):
            raw_key = detail.get("message_key")
            if isinstance(raw_key, (list, tuple)) and raw_key:
                raw_key = raw_key[0]
            key = raw_key if isinstance(raw_key, str) and raw_key.strip() else default_key

            if "errors" in detail:
                payload: Dict[str, Any] = {"errors": detail["errors"]}
            else:
                payload = {"errors": {k: v for k, v in detail.items() if k != "message_key"}}

            if "faltantes_cajas" in detail:
                payload["faltantes_cajas"] = detail["faltantes_cajas"]
            return key, payload

        return default_key, {"errors": detail}


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
        "list": ["view_clasificacionempaque"],
        "retrieve": ["view_clasificacionempaque"],
        "create": ["add_clasificacionempaque"],
        "update": ["change_clasificacionempaque"],
        "partial_update": ["change_clasificacionempaque"],
        "destroy": ["delete_clasificacionempaque"],
        "disponibles": ["view_clasificacionempaque"],
        "bulk_upsert": ["add_clasificacionempaque"],
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
        # Default seguro: lectura de empaque si no esta mapeada la accion.
        self.required_permissions = self._perm_map.get(self.action, ["view_clasificacionempaque"])
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
            key="clasificacion_listado_consultado",
            data={
                "results": rows,
                "meta": meta,
            },
            status_code=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        row = self.get_serializer(obj).data
        return self.notify(
            key="clasificacion_detalle_consultado",
            data={"clasificacion": row},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def disponibles(self, request):
        """
        Retorna listado de clasificaciones con stock disponible > 0.
        Usado para selectores de carga de camión / surtido.
        """
        try:
            bodega_id = int(request.query_params.get("bodega"))
            temporada_id = int(request.query_params.get("temporada"))
            semana_raw = request.query_params.get("semana") or request.query_params.get("semana_id")
            semana_id = int(semana_raw) if semana_raw else None
        except (TypeError, ValueError):
             return self.notify(
                key="clasificacion_validacion_error",
                data={"detail": "bodega y temporada requeridos"},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        results = InventoryService.get_available_stock_for_truck(temporada_id, bodega_id, semana_id=semana_id)
        
        return self.notify(
            key="stock_disponible_fetched", 
            data={"results": results}, 
            status_code=status.HTTP_200_OK
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
                key="clasificacion_validacion_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        bodega = ser.validated_data["bodega"]
        temporada = ser.validated_data["temporada"]
        f = ser.validated_data["fecha"]

        # ✅ semana cerrada centralizada
        if semana_cerrada_ids(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                obj = ser.save()

                # Semana: prioriza la semana de la recepcion; si no, resuelve por fecha
                semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
                if semana != obj.semana:
                    obj.semana = semana
                    obj.save(update_fields=["semana", "actualizado_en"])
        except serializers.ValidationError as exc:
            key, payload = self.validation_error_to_notify(exc)
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        extra_data = None
        if obj.material == "MADERA":
            stock = CompraMadera.objects.filter(
                bodega=bodega, temporada=temporada, hay_stock=True, is_active=True
            ).aggregate(t=Sum('stock_actual'))['t'] or 0
            if stock < 50:
                extra_data = {"notification": {"message": f"Empaque registrado. ATENCIÓN: Quedan {int(stock)} cajas de madera disponibles.", "type": "warning", "key": "alerta_madera"}}

        return self.notify(
            key="clasificacion_creada",
            data={"clasificacion": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED,
            extra_data=extra_data
        )

    # ───────────────────────────────────────────────────────────────────────
    # UPDATE / PATCH
    # ───────────────────────────────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if InventoryService.has_active_consumption(obj):
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="clasificacion_validacion_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        bodega = ser.validated_data.get("bodega", obj.bodega)
        temporada = ser.validated_data.get("temporada", obj.temporada)
        f = ser.validated_data.get("fecha", obj.fecha)

        if semana_cerrada_ids(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                obj = ser.save()
                semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
                if semana != obj.semana:
                    obj.semana = semana
                    obj.save(update_fields=["semana", "actualizado_en"])
        except serializers.ValidationError as exc:
            key, payload = self.validation_error_to_notify(exc)
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        extra_data = None
        if obj.material == "MADERA":
            from gestion_bodega.models import CompraMadera
            from django.db.models import Sum
            stock = CompraMadera.objects.filter(
                bodega=bodega, temporada=temporada, hay_stock=True, is_active=True
            ).aggregate(t=Sum('stock_actual'))['t'] or 0
            if stock < 50:
                extra_data = {"notification": {"message": f"Empaque actualizado. ATENCIÓN: Quedan {int(stock)} cajas de madera disponibles.", "type": "warning", "key": "alerta_madera"}}

        return self.notify(
            key="clasificacion_actualizada",
            data={"clasificacion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK,
            extra_data=extra_data
        )

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if InventoryService.has_active_consumption(obj):
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="clasificacion_validacion_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        bodega = ser.validated_data.get("bodega", obj.bodega)
        temporada = ser.validated_data.get("temporada", obj.temporada)
        f = ser.validated_data.get("fecha", obj.fecha)

        if semana_cerrada_ids(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                obj = ser.save()
                semana = getattr(obj.recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)
                if semana != obj.semana:
                    obj.semana = semana
                    obj.save(update_fields=["semana", "actualizado_en"])
        except serializers.ValidationError as exc:
            key, payload = self.validation_error_to_notify(exc)
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        extra_data = None
        if obj.material == "MADERA":
            stock = CompraMadera.objects.filter(
                bodega=bodega, temporada=temporada, hay_stock=True, is_active=True
            ).aggregate(t=Sum('stock_actual'))['t'] or 0
            if stock < 50:
                extra_data = {"notification": {"message": f"Empaque actualizado. ATENCIÓN: Quedan {int(stock)} cajas de madera disponibles.", "type": "warning", "key": "alerta_madera"}}

        return self.notify(
            key="clasificacion_actualizada",
            data={"clasificacion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK,
            extra_data=extra_data
        )

    # ───────────────────────────────────────────────────────────────────────
    # DELETE (soft -> archivar)
    # ───────────────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()

        if InventoryService.has_active_consumption(obj):
            return self.notify(key="clasificacion_con_consumos_inmutable", status_code=status.HTTP_409_CONFLICT)

        if semana_cerrada_ids(obj.bodega_id, obj.temporada_id, obj.fecha):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj.archivar()

        return self.notify(key="clasificacion_archivada", status_code=status.HTTP_200_OK)

    # ───────────────────────────────────────────────────────────────────────
    # BULK UPSERT (captura rápida)
    # ───────────────────────────────────────────────────────────────────────

    def _process_upsert_snapshot(self, recepcion, bodega, temporada, f, items_payload):
        """
        Ejecuta la lógica de snapshot (full replace/merge) para UNA recepción.
        Retorna (success_bool, result_data_or_error_response).
        """
        semana = getattr(recepcion, "semana", None) or _resolve_semana_for_fecha(bodega, temporada, f)

        # -------------------------------------------------------------------
        # FASE 1.1: Validación (Snapshot)
        # -------------------------------------------------------------------
        payload_map: Dict[Tuple[str, str], int] = {}
        delete_keys: Set[Tuple[str, str]] = set()
        for item in items_payload:
            material = item["material"]
            calidad = str(item["calidad"]).strip()
            qty = int(item.get("cantidad_cajas") or 0)

            if material == "PLASTICO" and calidad in ["SEGUNDA", "EXTRA"]:
                calidad = "PRIMERA"

            key = (material, calidad)
            if qty == 0:
                if key not in payload_map:
                    delete_keys.add(key)
                continue

            payload_map[key] = payload_map.get(key, 0) + qty
            if key in delete_keys:
                delete_keys.discard(key)

        total_payload = sum(payload_map.values())
        max_cajas = int(getattr(recepcion, "cajas_campo", 0) or 0)
        
        # Validación de capacidad
        if total_payload > max_cajas:
            # En bulk automático, esto debería prevenir la asignación, pero aquí validamos integridad final.
            return False, self.notify(
                key="clasificacion_validacion_error",
                data={
                    "errors": {"items": f"La suma excede el disponible en recepción {recepcion.id} ({max_cajas})."},
                    "requested_total": total_payload,
                    "max_allowed": max_cajas,
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        created_ids, updated_ids = [], []
        recepcion_tipo_mango = (getattr(recepcion, "tipo_mango", "") or "").strip()

        with transaction.atomic():
            # Lock maestro
            recepcion_locked = Recepcion.objects.select_for_update().get(pk=recepcion.id)
            # Lock líneas
            existing_qs = (
                ClasificacionEmpaque.objects.select_for_update()
                .filter(recepcion=recepcion_locked, bodega=bodega, temporada=temporada)
            )

            existing: Dict[Tuple[str, str], ClasificacionEmpaque] = {}
            for obj in existing_qs:
                k = (obj.material, str(obj.calidad).strip())
                existing[k] = obj

            # Detectar bloqueos (consumos)
            bloqueadas = []
            keys_to_archive = (set(existing.keys()) - set(payload_map.keys())) | delete_keys
            for k in keys_to_archive:
                obj = existing.get(k)
                if not obj: continue
                # NEW LOCK CHECK
                if InventoryService.has_active_consumption(obj):
                    bloqueadas.append(obj)
            
            for (material, calidad), qty in payload_map.items():
                if (material, calidad) not in existing: continue
                obj = existing[(material, calidad)]
                cambio = (
                    getattr(obj, "cantidad_cajas", None) != qty
                    or getattr(obj, "is_active", None) is False
                    or getattr(obj, "fecha", None) != f
                    or getattr(obj, "semana_id", None) != getattr(semana, "id", None)
                    or (str(getattr(obj, "tipo_mango", "") or "").strip() != recepcion_tipo_mango)
                )
                if cambio and InventoryService.has_active_consumption(obj):
                    bloqueadas.append(obj)

            if bloqueadas:
                data_block = {
                    "recepcion_id": recepcion.id,
                    "bloqueadas": [{"id": o.id, "motivo": "Tiene consumos"} for o in bloqueadas]
                }
                return False, self.notify(
                    key="clasificacion_con_consumos_inmutable",
                    data=data_block,
                    status_code=status.HTTP_409_CONFLICT,
                )

            # 1) Archivar
            for k in keys_to_archive:
                obj = existing.get(k)
                if obj: 
                    # Revertir consumos de madera antes de archivar
                    if obj.material == "MADERA":
                        ClasificacionEmpaqueSerializer()._revertir_descuento_madera(obj)
                    obj.archivar()

            # 2) Upsert
            for (material, calidad), qty in payload_map.items():
                if (material, calidad) in existing:
                    obj = existing[(material, calidad)]
                    changed = (
                        getattr(obj, "cantidad_cajas", None) != qty
                        or getattr(obj, "is_active", None) is False
                        or getattr(obj, "fecha", None) != f
                        or getattr(obj, "semana_id", None) != getattr(semana, "id", None)
                        or (str(getattr(obj, "tipo_mango", "") or "").strip() != recepcion_tipo_mango)
                    )
                    if changed:
                        # Si es madera, revertimos su estado exacto para recalcular después
                        if obj.material == "MADERA":
                            ClasificacionEmpaqueSerializer()._revertir_descuento_madera(obj)
                            
                        obj.cantidad_cajas = qty
                        obj.is_active = True
                        obj.fecha = f
                        obj.semana = semana
                        obj.tipo_mango = recepcion_tipo_mango
                        obj.save(update_fields=["cantidad_cajas", "is_active", "fecha", "semana", "tipo_mango", "actualizado_en"])
                        updated_ids.append(obj.id)
                        
                        if obj.material == "MADERA":
                            try:
                                ClasificacionEmpaqueSerializer()._aplicar_descuento_madera(obj)
                            except serializers.ValidationError as e:
                                transaction.set_rollback(True)
                                key, payload = self.validation_error_to_notify(e)
                                return False, self.notify(
                                    key=key,
                                    data=payload,
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                )

                else:
                    obj = ClasificacionEmpaque.objects.create(
                        recepcion=recepcion_locked,
                        bodega=bodega,
                        temporada=temporada,
                        fecha=f,
                        semana=semana,
                        material=material,
                        calidad=calidad,
                        tipo_mango=recepcion_tipo_mango,
                        cantidad_cajas=qty,
                    )
                    if obj.material == "MADERA":
                        try:
                            ClasificacionEmpaqueSerializer()._aplicar_descuento_madera(obj)
                        except serializers.ValidationError as e:
                            transaction.set_rollback(True)
                            key, payload = self.validation_error_to_notify(e)
                            return False, self.notify(
                                key=key,
                                data=payload,
                                status_code=status.HTTP_400_BAD_REQUEST,
                            )
                            
                    created_ids.append(obj.id)

            # 3) Validación final (Balance Rule P1.2)
            total_final = (
                ClasificacionEmpaque.objects.filter(recepcion=recepcion_locked, is_active=True)
                .aggregate(total=Sum("cantidad_cajas"))
                .get("total") or 0
            )
            if total_final > max_cajas:
                transaction.set_rollback(True)
                return False, self.notify(
                    key="clasificacion_balance_invalido",
                    data={
                        "errors": {"items": f"Balance inválido: Total empacado ({total_final}) excede recepción ({max_cajas})."},
                        "max_allowed": max_cajas,
                        "current_total": total_final
                    },
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        # Build Summary
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
        return True, {
            "created_ids": created_ids,
            "updated_ids": updated_ids,
            "summary": summary,
        }

    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        """
        Si 'recepcion' viene: Snapshot normal.
        Si 'recepcion' falta: FIFO automatico (distribuye items en recepciones pendientes).
        """
        ser = ClasificacionEmpaqueBulkUpsertSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="clasificacion_validacion_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return self.notify(key="unexpected_error", data={"errors": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        recepcion = ser.validated_data.get("recepcion")
        bodega = ser.validated_data["bodega"]
        temporada = ser.validated_data["temporada"]
        f = ser.validated_data["fecha"]
        items = ser.validated_data["items"]

        if semana_cerrada_ids(bodega.id, temporada.id, f):
            return self.notify(key="clasificacion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        # MODO 1: EXPLÍCITO
        if recepcion:
            # P0.1 Integrity: Block creation if reception is locked by downstream consumption
            if InventoryService.recepcion_is_locked(recepcion):
                return self.notify(
                    key="recepcion_inmutable_por_consumo",
                    data={"error": "La recepción tiene consumos confirmados. No se pueden agregar ni modificar cajas."},
                    status_code=status.HTTP_409_CONFLICT
                )
            
            # -------- P0 FIX (R4): BALANCE DE MASA GLOBAL (NO NEGOCIABLE) --------
            try:
                cajas_campo = int(recepcion.cajas_campo or 0)
            except (TypeError, ValueError):
                cajas_campo = 0
            
            total_clasificado = 0
            for it in items:
                try:
                    total_clasificado += int(it.get("cantidad_cajas") or 0)
                except (TypeError, ValueError):
                    return self.notify(
                        key="clasificacion_balance_invalido",
                        data={"errors": {"items": ["cantidad_cajas inválida (debe ser entero)."]}},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )
            
            if total_clasificado > cajas_campo:
                return self.notify(
                    key="clasificacion_balance_invalido",
                    data={
                        "errors": {
                            "items": [
                                f"Balance inválido: total clasificado ({total_clasificado}) excede cajas de campo ({cajas_campo})."
                            ]
                        }
                    },
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            # -------------------------------------------------------------------
            
            success, result = self._process_upsert_snapshot(recepcion, bodega, temporada, f, items)
            if not success:
                return result # Es un Response de error
            
            extra_data = None
            if any(it.get("material") == "MADERA" for it in items):
                stock = CompraMadera.objects.filter(
                    bodega=bodega, temporada=temporada, hay_stock=True, is_active=True
                ).aggregate(t=Sum('stock_actual'))['t'] or 0
                if stock < 50:
                    extra_data = {"notification": {"message": f"Cajas empacadas. ATENCIÓN: Quedan solamente {int(stock)} cajas de madera.", "type": "warning", "key": "alerta_madera"}}

            return self.notify(
                key="clasificacion_bulk_upsert_ok",
                data=result,
                status_code=status.HTTP_200_OK if result["updated_ids"] else status.HTTP_201_CREATED,
                extra_data=extra_data
            )

        # MODO 2: FIFO AUTOMÁTICO
        # 1. Encontrar recepciones candidatas (fecha <= f, activas, con saldo > 0)
        candidates = (
            Recepcion.objects
            .filter(bodega=bodega, temporada=temporada, is_active=True, fecha__lte=f)
            .annotate(
                packed_calc=Coalesce(Sum("clasificaciones__cantidad_cajas", filter=Q(clasificaciones__is_active=True)), 0)
            )
            .annotate(saldo=F("cajas_campo") - F("packed_calc"))
            .filter(saldo__gt=0)
            .order_by("fecha", "id")
        )
        
        # 2. Calcular total requerido
        items_map: Dict[Tuple[str, str], int] = {} # (material, calidad) -> qty
        for it in items:
            key = (it["material"], str(it["calidad"]).strip())
            qty = int(it.get("cantidad_cajas") or 0)
            if qty > 0:
                items_map[key] = items_map.get(key, 0) + qty
        
        total_req = sum(items_map.values())
        if total_req == 0:
             return self.notify(key="clasificacion_validacion_error", data={"errors": "No hay items para distribuir."}, status_code=status.HTTP_400_BAD_REQUEST)

        # 3. Distribuir
        # Queremos distribuir proporcionalmente o agotar rec por rec? FIFO => Agotar rec por rec.
        # PERO tenemos N tipos de items (Primera, Segunda, Merma...). 
        # Estrategia: Llenar la primera recepción con LO QUE QUEPA, priorizando mantener la proporción? NO.
        # Simplemente "dump" items into reception until full.
        # Problema: Si tengo 100 Primera, 10 Merma. Rec A cabe 50. ¿Meto 50 Primera? ¿O 45 Primera + 5 Merma?
        # FIFO estricto de cajas: Llenamos huecos. El orden de items importa?
        # Decisión: Iterar items y tratar de meterlos en order FIFO de recepciones.

        distribution_plan = [] # list of (recepcion, item_list_for_snapshot)
        
        # Pre-fetch existing content of candidates to know exact state purely?
        # Actually candidates QuerySet gave us 'saldo'. We can trust it for planning.
        
        # Flatten items to chunks? No, just keep counters.
        # Mutable copies
        remaining_items = items_map.copy()
        
        # Fetch full objects to avoid reinstatiating in loop? candidates is QuerySet.
        # We need to iterate candidates.
        
        processed_recs = []
        
        for rec in candidates:
            if sum(remaining_items.values()) == 0:
                break
                
            capacity = int(getattr(rec, "saldo", 0) or 0)
            if capacity <= 0: continue
            
            # Sacar items hasta llenar capacity
            my_batch: Dict[Tuple[str, str], int] = {} # (mat, cal) -> qty
            filled: int = 0
            
            # Sort items keys to be deterministic?
            for key in sorted(remaining_items.keys()):
                if filled >= capacity: break
                
                qty_needed = remaining_items[key]
                if qty_needed <= 0: continue
                
                space = capacity - filled
                take = min(qty_needed, space)
                
                my_batch[key] = take
                remaining_items[key] -= take
                filled += take
            
            if filled > 0:
                # Reconstruir items dict list para _process
                # OJO: _process hace REPLACE (Snapshot).
                # Por tanto, debemos MERGEAR con lo que ya tiene la recepción.
                # Necesitamos saber qué tiene la recepción AHORA.
                
                # Fetch current items (DB read inside loop ok, transaction implicit in view logic?)
                # We are not in transaction yet for the whole loop? Ideally yes.
                current_items = ClasificacionEmpaque.objects.filter(recepcion=rec, is_active=True)
                current_map: Dict[Tuple[str, str], int] = {}
                for obj in current_items:
                    k = (obj.material, str(obj.calidad).strip())
                    current_map[k] = current_map.get(k, 0) + obj.cantidad_cajas
                
                # Merge my_batch into current_map
                for k, qty in my_batch.items():
                    current_map[k] = current_map.get(k, 0) + qty
                
                # Convert back to list payload
                final_payload = []
                for (mat, cal), quantity in current_map.items():
                    final_payload.append({
                        "material": mat, 
                        "calidad": cal, 
                        "cantidad_cajas": quantity
                    })
                
                processed_recs.append((rec, final_payload))

        if sum(remaining_items.values()) > 0:
             return self.notify(
                key="clasificacion_validacion_error", 
                data={"errors": f"No hay suficiente saldo en recepciones anteriores a {f}. Faltan {sum(remaining_items.values())} cajas por asignar."}, 
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # 4. Ejecutar
        consolidated_summary = []
        with transaction.atomic(): # Global atomicity for bulk
            for rec, payload in processed_recs:
                success, result = self._process_upsert_snapshot(rec, bodega, temporada, f, payload)
                if not success:
                    # abort all
                    transaction.set_rollback(True)
                    return result
                consolidated_summary.append(result["summary"])

        extra_data = None
        if any(it.get("material") == "MADERA" for it in items):
            stock = CompraMadera.objects.filter(
                bodega=bodega, temporada=temporada, hay_stock=True, is_active=True
            ).aggregate(t=Sum('stock_actual'))['t'] or 0
            if stock < 50:
                extra_data = {"notification": {"message": f"Lotes empacados (FIFO). ATENCIÓN: Quedan únicamente {int(stock)} cajas de madera.", "type": "warning", "key": "alerta_madera"}}

        return self.notify(
            key="clasificacion_bulk_fifo_ok",
            data={
                "distributed_count": len(processed_recs),
                "summaries": consolidated_summary
            },
            status_code=status.HTTP_200_OK,
            extra_data=extra_data
        )

