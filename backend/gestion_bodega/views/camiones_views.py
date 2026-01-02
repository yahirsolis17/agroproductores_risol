# gestion_bodega/views/camiones_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import timedelta

from gestion_bodega.models import CamionSalida, CamionItem, CierreSemanal, CamionConsumoEmpaque
from gestion_bodega.serializers import CamionSalidaSerializer, CamionItemSerializer, CamionConsumoEmpaqueSerializer
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from agroproductores_risol.utils.notification_handler import NotificationHandler
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

def _semana_cerrada(bodega_id: int, temporada_id: int, fecha):
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id, temporada_id=temporada_id,
        fecha_desde__lte=fecha, fecha_hasta__gte=fecha, is_active=True
    ).exists()

def _resolve_semana_for_fecha(bodega, temporada, fecha):
    qs = (
        CierreSemanal.objects.filter(
            bodega=bodega,
            temporada=temporada,
            is_active=True,
        )
        .order_by("-fecha_desde")
    )

    for cierre in qs:
        start = cierre.fecha_desde
        end = cierre.fecha_hasta or (cierre.fecha_desde + timedelta(days=6))
        if start <= fecha <= end:
            return cierre
    return None


class CamionSalidaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Camiones de salida (embarques) con manifiesto (CamionItem).
    - Acción confirmar asigna número correlativo por (bodega, temporada).
    - Bloqueo por semana cerrada en fecha_salida.
    """
    queryset = CamionSalida.objects.all().order_by("-fecha_salida", "-id")
    serializer_class = CamionSalidaSerializer
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list":     ["view_camion"],
        "retrieve": ["view_camion"],
        "create":   ["add_camion"],
        "update":   ["change_camion"],
        "partial_update": ["change_camion"],
        "destroy":  ["delete_camion"],
        "confirmar": ["confirm_camion"],
        "add_item": ["change_camion"],
        "remove_item": ["change_camion"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "numero": ["exact", "gte", "lte"],
        "estado": ["exact"],
        "fecha_salida": ["exact", "gte", "lte"],
        "is_active": ["exact"],
    }
    search_fields = ["placas", "chofer", "destino", "receptor", "observaciones"]
    ordering_fields = ["fecha_salida", "numero", "id"]
    ordering = ["-fecha_salida", "-id"]

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(getattr(self, "action", ""), [])
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if _semana_cerrada(data["bodega"].id, data["temporada"].id, data["fecha_salida"]):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        semana = data.get("semana")
        if not semana:
            semana = _resolve_semana_for_fecha(data["bodega"], data["temporada"], data["fecha_salida"])
            if not semana:
                return self.notify(
                    key="validation_error",
                    data={"errors": {"semana": ["No hay semana activa para la fecha."]}},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            obj = ser.save(semana=semana)

        return self.notify(key="camion_creado", data={"camion": self.get_serializer(obj).data}, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        # Phase 3: Immutability - CONFIRMADO trucks cannot be edited
        if obj.estado == "CONFIRMADO":
            return self.notify(key="camion_inmutable", status_code=status.HTTP_409_CONFLICT)
        
        ser = self.get_serializer(obj, data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha_salida", obj.fecha_salida)):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="camion_actualizado", data={"camion": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        # Phase 3: Immutability
        if obj.estado == "CONFIRMADO":
            return self.notify(key="camion_inmutable", status_code=status.HTTP_409_CONFLICT)
        
        ser = self.get_serializer(obj, data=request.data, partial=True)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if _semana_cerrada(data.get("bodega", obj.bodega).id, data.get("temporada", obj.temporada).id, data.get("fecha_salida", obj.fecha_salida)):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            obj = ser.save()

        return self.notify(key="camion_actualizado", data={"camion": self.get_serializer(obj).data}, status_code=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        # Phase 3: Immutability - CONFIRMADO trucks cannot be deleted
        if obj.estado == "CONFIRMADO":
            return self.notify(key="camion_inmutable", status_code=status.HTTP_409_CONFLICT)
        
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        with transaction.atomic():
            obj.archivar()
        return self.notify(key="camion_archivado", status_code=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def confirmar(self, request, pk=None):
        obj = self.get_object()
        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        # P1 FIX: Collect reconciliation data BEFORE confirmation
        lotes_affected = []
        total_cajas = 0
        
        if hasattr(obj, 'cargas') and obj.cargas.exists():
            from django.db.models import Sum
            cargas_data = (
                obj.cargas
                .filter(is_active=True)
                .select_related('clasificacion_empaque__lote')
                .values('clasificacion_empaque__lote_id')
                .annotate(total=Sum('cantidad'))
            )
            lotes_affected = [c['clasificacion_empaque__lote_id'] for c in cargas_data if c['clasificacion_empaque__lote_id']]
            total_cajas = sum(c['total'] or 0 for c in cargas_data)

        with transaction.atomic():
            try:
                # P2 FIX: Generate folio AFTER confirmation (assigns numero)
                obj.confirmar()
                
                # P2 FINAL (R1): Derive semana from actual consumptions
                semanas_consumidas = set()
                if hasattr(obj, 'cargas') and obj.cargas.exists():
                    semanas_consumidas = set(
                        obj.cargas
                        .filter(is_active=True)
                        .select_related('clasificacion_empaque')
                        .values_list('clasificacion_empaque__semana_id', flat=True)
                        .distinct()
                    )
                    # Remove None if exists
                    semanas_consumidas.discard(None)
                
                # Validación de consistencia de semana
                if len(semanas_consumidas) > 1:
                    return self.notify(
                        key="camion_semana_inconsistente",
                        data={
                            "reason": "El camión tiene consumos de múltiples semanas",
                            "semanas": list(semanas_consumidas),
                        },
                        status_code=status.HTTP_409_CONFLICT
                    )
                
                # Usar semana derivada o fallback
                semana_id = (
                    list(semanas_consumidas)[0] if len(semanas_consumidas) == 1
                    else obj.semana_id if obj.semana_id
                    else 0  # Solo si está vacío o sin consumos
                )
                
                folio = f"BOD-{obj.bodega_id}-T{obj.temporada_id}-W{semana_id}-C{obj.numero:05d}"
                obj.folio = folio
                obj.save(update_fields=['folio', 'actualizado_en'])
                
            except serializers.ValidationError as e:
                return self.notify(
                    key="camion_no_confirmable", 
                    data={"errors": e.detail if hasattr(e, "detail") else str(e)}, 
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        return self.notify(
            key="camion_confirmado", 
            data={
                "camion": self.get_serializer(obj).data,
                "affected": {
                    "lotes_despachados": lotes_affected,
                    "total_cajas": total_cajas,
                }
            }, 
            status_code=status.HTTP_200_OK
        )

    # ----- Items del camión (manifiesto) -----
    @action(detail=True, methods=["post"], url_path="items/add")
    def add_item(self, request, pk=None):
        obj = self.get_object()
        ser = CamionItemSerializer(data={**request.data, "camion": obj.id})
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
        
        # P0.3 Integrity: Seal manifest if confirmed
        if obj.estado == "CONFIRMADO":
            return self.notify(key="camion_inmutable", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            item = ser.save()

        return self.notify(key="camion_item_creado", data={"item": CamionItemSerializer(item).data}, status_code=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="items/remove")
    def remove_item(self, request, pk=None):
        obj = self.get_object()
        item_id = request.data.get("item_id")
        if not item_id:
            return self.notify(key="validation_error", data={"errors": {"item_id": ["Este campo es requerido."]}}, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            item = obj.items.get(pk=item_id)
        except CamionItem.DoesNotExist:
            return self.notify(key="camion_item_no_encontrado", status_code=status.HTTP_404_NOT_FOUND)

        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        # P0.3 Integrity: Seal manifest if confirmed
        if obj.estado == "CONFIRMADO":
            return self.notify(key="camion_inmutable", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            item.archivar()

        return self.notify(key="camion_item_archivado", status_code=status.HTTP_200_OK)

    # ----- Cargas reales (consumo de stock) -----
    @action(detail=True, methods=["post"], url_path="cargas/add")
    def add_carga(self, request, pk=None):
        """
        Agrega carga (consumo de stock) a un camión.
        
        Soporta DOS contratos:
        1. LEGACY: {"clasificacion_id": <int>, "cantidad": <int>} - asigna a empaque específico
        2. NUEVO (Enterprise FEFO): {"calidad": <str>, "material": <str>, "tipo_mango": <str>, "cantidad": <int>}
           - Asigna automáticamente por FEFO (First Expired, First Out)
           - Puede crear múltiples consumos si la cantidad requiere varios empaques
        """
        from gestion_bodega.services.inventory_service import InventoryService
        
        obj = self.get_object()
        
        # Phase 3: Immutability - cannot add cargas to CONFIRMADO truck
        if obj.estado == "CONFIRMADO":
            return self.notify(key="camion_inmutable", status_code=status.HTTP_409_CONFLICT)
        
        data = request.data
        clasificacion_id = data.get("clasificacion_id")
        
        # ============================================================
        # NUEVO PATH: Asignación por combinación (FEFO)
        # ============================================================
        if not clasificacion_id:
            calidad = data.get("calidad")
            material = data.get("material")
            tipo_mango = data.get("tipo_mango")
            cantidad = data.get("cantidad")
            
            # Validar que vengan todos los campos requeridos
            if not all([calidad, material, tipo_mango, cantidad]):
                return self.notify(
                    key="validation_error",
                    data={
                        "errors": {
                            "detail": "Debe enviar clasificacion_id O (calidad + material + tipo_mango + cantidad)"
                        }
                    },
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            
            try:
                cantidad_int = int(cantidad)
                if cantidad_int <= 0:
                    raise ValueError("Cantidad debe ser mayor a 0")
            except (ValueError, TypeError):
                return self.notify(
                    key="validation_error",
                    data={"errors": {"cantidad": ["Cantidad inválida"]}},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            
            # Validar semana cerrada
            if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
                return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)
            
            # Delegar a InventoryService para asignar por FEFO
            try:
                consumos_creados = InventoryService.allocate_stock_fefo(
                    camion=obj,
                    calidad=calidad,
                    material=material,
                    tipo_mango=tipo_mango,
                    cantidad=cantidad_int,
                    user=request.user
                )
            except DjangoValidationError as e:
                return self.notify(
                    key="validation_error",
                    data={"errors": {"detail": str(e)}},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            
            # Retornar MÚLTIPLES consumos creados (puede ser 1 o N)
            return self.notify(
                key="camion_cargas_creadas",
                data={
                    "cargas": CamionConsumoEmpaqueSerializer(consumos_creados, many=True).data,
                    "count": len(consumos_creados),
                    "total_cantidad": sum(c.cantidad for c in consumos_creados)
                },
                status_code=status.HTTP_201_CREATED,
            )
        
        # ============================================================
        # LEGACY PATH: clasificacion_id directo (mantener para compatibilidad)
        # ============================================================
        data_with_camion = {**data, "camion_id": obj.id}
        
        # Compatibilidad: mapear clasificacion_empaque_id -> clasificacion_id
        if "clasificacion_empaque_id" in data_with_camion and "clasificacion_id" not in data_with_camion:
            data_with_camion["clasificacion_id"] = data_with_camion["clasificacion_empaque_id"]

        ser = CamionConsumoEmpaqueSerializer(data=data_with_camion)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error", data={"errors": ser.errors}, status_code=status.HTTP_400_BAD_REQUEST)

        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            carga = ser.save()

        return self.notify(
            key="camion_carga_creada", 
            data={"carga": CamionConsumoEmpaqueSerializer(carga).data}, 
            status_code=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="cargas/remove")
    def remove_carga(self, request, pk=None):
        obj = self.get_object()
        # Phase 3: Immutability - cannot remove cargas from CONFIRMADO truck
        if obj.estado == "CONFIRMADO":
            return self.notify(key="camion_inmutable", status_code=status.HTTP_409_CONFLICT)
        
        carga_id = request.data.get("carga_id")
        if not carga_id:
            return self.notify(key="validation_error", data={"errors": {"carga_id": ["Requerido"]}}, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            carga = obj.cargas.get(pk=carga_id)
        except CamionConsumoEmpaque.DoesNotExist:
            return self.notify(key="recurso_no_encontrado", status_code=status.HTTP_404_NOT_FOUND)

        if _semana_cerrada(obj.bodega_id, obj.temporada_id, obj.fecha_salida):
            return self.notify(key="camion_semana_cerrada", status_code=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            if hasattr(carga, "archivar"):
                carga.archivar()
            else:
                carga.delete()

        return self.notify(key="recurso_eliminado", status_code=status.HTTP_200_OK)

