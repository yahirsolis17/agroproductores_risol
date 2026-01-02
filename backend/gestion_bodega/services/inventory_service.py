from __future__ import annotations

from typing import Dict, Any, List, Optional
from django.db.models import Sum, F, Q, QuerySet
from django.db.models.functions import Coalesce
from django.utils import timezone

from gestion_bodega.models import (
    ClasificacionEmpaque,
    CamionConsumoEmpaque,
    Recepcion
)

class InventoryService:
    """
    Fuente de Verdad Única para el inventario de bodega.
    Centraliza el cálculo de:
    1. Stock Producido (Empacado total)
    2. Stock Consumido (Cargado en camiones)
    3. Stock Disponible (Producido - Consumido)
    """

    @staticmethod
    def get_stock_snapshot(
        temporada_id: int,
        bodega_id: Optional[int] = None,
        semana_id: Optional[int] = None,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Devuelve una foto completa del stock para el contexto dado.
        Calcula disponibilidad real restando lo consumido por camiones.
        """
        
        # 1. Base Query: Todo lo empacado en el contexto
        # Nota: El stock disponible se calcula sobre el ACUMULADO de la temporada si no hay rango de fechas restrictivo.
        # Si dashboard filtra por semana, ¿queremos ver stock producido ESA semana o stock disponible TOTAL?
        # Regla de negocio: "Stock Disponible" suele ser acumulado. "Producción" es por periodo.
        # Para evitar confusión, calcularemos ambos contextos si es necesario.
        # Por ahora, respetamos los filtros pasados estrictamente.
        
        qs_emp = ClasificacionEmpaque.objects.filter(
            temporada_id=temporada_id, 
            is_active=True
        )
        if bodega_id:
            qs_emp = qs_emp.filter(bodega_id=bodega_id)
        
        # Filtros temporales (afectan "Producción del periodo")
        qs_periodo = qs_emp.all()
        if semana_id:
            qs_periodo = qs_periodo.filter(semana_id=semana_id)
        
        if fecha_desde:
            qs_periodo = qs_periodo.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs_periodo = qs_periodo.filter(fecha__lte=fecha_hasta)

        # 2. Agregación Global (Periodo) - Para KPIs de "Producción Reciente"
        agg_periodo = qs_periodo.aggregate(
            produced=Coalesce(Sum("cantidad_cajas"), 0),
            merma=Coalesce(Sum("cantidad_cajas", filter=Q(calidad__iexact="MERMA")), 0)
        )
        produced_period = agg_periodo["produced"]
        merma_period = agg_periodo["merma"]

        # 3. Stock Disponible Real (Acumulado hasta la fecha)
        # Para disponibilidad, ignoramos filtro de "semana actual" si queremos mostrar todo lo que hay en bodega.
        # Pero si el usuario filtra por semana, la tabla suele mostrar "lo que se hizo en esa semana".
        # DILEMA: El usuario reportó tabla vacía.
        # SOLUCIÓN: La tabla de "Stock Disponible" debe mostrar TODO lo que hay en piso, 
        # independientemente de cuándo se produjo, SALVO que se quiera auditar producción.
        #
        # AQUI FASE 1: Unificamos lógica. Vamos a devolver datos desglosados para que la View decida.
        
        # Consumo de camiones (Solo Borrador/Confirmado descuentan? O Completado también?
        # Normalmente: Todo consumo registrado descuenta.
        qs_consumo = CamionConsumoEmpaque.objects.filter(
            camion__temporada_id=temporada_id,
            camion__is_active=True,
            is_active=True
        )
        if bodega_id:
            qs_consumo = qs_consumo.filter(camion__bodega_id=bodega_id)
            
        total_consumed = qs_consumo.aggregate(t=Coalesce(Sum("cantidad"), 0))["t"]

        # 4. Desglose por Clasificación (Para Autocomplete y Tablas)
        # Agrupamos todo el inventario de la temporada (sin filtrar semana) para saber disponibilidad real
        # OJO: Si filtramos por semana en el KPI, el KPI dice "Producción Semana X".
        # La tabla debería decir "Inventario Generado en Semana X" O "Todo el Inventario"?
        # El título dice "Stock disponible".
        # Asumiremos: Tabla Inventarios = Producción del Periodo (con columna de disponibilidad si aplica).
        
        # Vamos a retornar el QuerySet base del periodo para que la vista agrupe si quiere.
        # Y también el 'global_availability' para validaciones.

        return {
            "kpis": {
                "produced_period": produced_period,  # Cajas empacadas (filtro activo)
                "merma_period": merma_period,        # Merma (filtro activo)
                "total_consumed_season": total_consumed, # Consumo global temporada
            },
            "qs_periodo": qs_periodo, # QuerySet filtrado para listar en tabla
        }

    @staticmethod
    def get_recepciones_kpi(
        temporada_id: int,
        bodega_id: Optional[int],
        semana_id: Optional[int],
        fecha_desde: Optional[str],
        fecha_hasta: Optional[str]
    ) -> Dict[str, int]:
        """
        Calcula pendientes vs finalizadas unificadamente.
        """
        qs = Recepcion.objects.filter(temporada_id=temporada_id, is_active=True)
        if bodega_id: qs = qs.filter(bodega_id=bodega_id)
        if semana_id: qs = qs.filter(semana_id=semana_id)
        
        if fecha_desde: qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta: qs = qs.filter(fecha__lte=fecha_hasta)
        
        # Anotamos lo empacado REAL (histórico total de esa recepción)
        qs = qs.annotate(
            total_packed=Coalesce(
                Sum("clasificaciones__cantidad_cajas", filter=Q(clasificaciones__is_active=True)), 
                0
            )
        )
        
        total = qs.count()
        pendientes = qs.filter(total_packed__lt=F("cajas_campo")).count()
        empacadas = qs.filter(total_packed__gte=F("cajas_campo"), cajas_campo__gt=0).count()
        
        return {
            "total_recepciones": total,
            "pendientes": pendientes,
            "finalizadas": empacadas
        }

    @staticmethod
    def get_available_stock_for_truck(temporada_id: int, bodega_id: int, semana_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Para el Autocomplete: Retorna items de stock específicos (ClasificacionEmpaque) con saldo > 0.
        Calculado como: Item.cantidad - (Sum(ConsumoCamiones) + Sum(ConsumoSurtidos)).
        Devuelve el ID real de la clasificación para garantizar trazabilidad y contrato correcto.
        """
        from gestion_bodega.models import SurtidoRenglon, CamionConsumoEmpaque

        # 1. Base Query: Stock producido (items individuales)
        # Traemos campos extra para armar un label útil en el frontend (fecha, lote, recepción)
        qs_emp = ClasificacionEmpaque.objects.filter(
            temporada_id=temporada_id, 
            bodega_id=bodega_id, 
            is_active=True
        ).exclude(calidad__iexact="MERMA").select_related("lote", "recepcion").order_by("fecha", "id")

        if semana_id:
            qs_emp = qs_emp.filter(semana_id=semana_id)

        results = []

        # Para eficiencia, podríamos hacer esto con annotate/subqueries, pero dado el volumen operativo
        # y la necesidad de lógica exacta en Python, un loop con prefetch o validación puntual es aceptable
        # si el número de lotes activos no es gigante.
        #
        # MEJORA: Usar annotate para traer consumos db-side.
        
        qs_emp = qs_emp.annotate(
            consumed_trucks=Coalesce(
                Sum("consumos_camion__cantidad", filter=Q(consumos_camion__is_active=True, consumos_camion__camion__is_active=True)), 
                0
            ),
            consumed_orders=Coalesce(
                Sum("surtidos__cantidad", filter=Q(surtidos__is_active=True, surtidos__renglon__pedido__is_active=True)),
                0
            )   
        )

        for item in qs_emp:
            disponible = (item.cantidad_cajas or 0) - (item.consumed_trucks + item.consumed_orders)
            
            if disponible > 0:
                # Construimos el DTO
                results.append({
                    "id": item.id,  # Integer real
                    "material": item.material or "",
                    "calidad": item.calidad or "",
                    "tipo_mango": item.tipo_mango or "",
                    "disponible": disponible,
                    "fecha": item.fecha.isoformat() if item.fecha else "",
                    "lote_codigo": item.lote.codigo_lote if item.lote else "",
                    "recepcion_id": item.recepcion_id,
                    "_debug_initial": item.cantidad_cajas,
                })

        return results

    @staticmethod
    def has_active_consumption(clasificacion: ClasificacionEmpaque) -> bool:
        """
        Retorna True si la clasificación ya fue consumida por algo 'confirmado' o 'activo'.
        Regla de Inmutabilidad:
        - Camiones CONFIRMADOS
        - Pedidos (Surtidos) ACTIVOS (asumimos que cualquier surtido ya "aparta" el stock)
        """
        from gestion_bodega.models import CamionConsumoEmpaque
        
        # 1. Camiones CONFIRMADOS
        has_camion = CamionConsumoEmpaque.objects.filter(
            clasificacion_empaque=clasificacion,
            is_active=True,
            camion__estado="CONFIRMADO",
            camion__is_active=True
        ).exists()
        
        if has_camion:
            return True

        # 2. Surtidos (Pedidos)
        if clasificacion.surtidos.filter(is_active=True).exists():
            return True

        return False

    @staticmethod
    def recepcion_is_locked(recepcion: Recepcion) -> bool:
        """
        Retorna True si la recepción tiene al menos una clasificación con consumo confirmado.
        Si es True, la recepción no se debe editar (ni fecha, ni lote, ni bodega) 
        porque invalidaría la trazabilidad de lo que ya salió.
        """
        from gestion_bodega.models import CamionConsumoEmpaque
        
        # Check 1: Camiones
        locked_by_truck = CamionConsumoEmpaque.objects.filter(
            clasificacion_empaque__recepcion=recepcion,
            clasificacion_empaque__is_active=True,
            is_active=True,
            camion__estado="CONFIRMADO",
            camion__is_active=True
        ).exists()
        
        if locked_by_truck:
            return True

        # Check 2: Surtidos
        # Opción query eficiente:
        locked_by_orders = ClasificacionEmpaque.objects.filter(
            recepcion=recepcion, 
            is_active=True,
            surtidos__is_active=True
        ).exists()
        
        if locked_by_orders:
            return True
            
        return False
