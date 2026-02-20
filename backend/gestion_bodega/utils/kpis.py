# gestion_bodega/utils/kpis.py
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Sum, F, QuerySet, Q, Max
from django.db.models.functions import Coalesce
from django.utils import timezone

from gestion_bodega.models import (
    Recepcion,
    ClasificacionEmpaque,
    CamionSalida,
    CamionItem,
    CamionConsumoEmpaque,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Utilidades internas
# ──────────────────────────────────────────────────────────────────────────────

def _apply_date_range(qs: QuerySet, field: str, fecha_desde: Optional[str], fecha_hasta: Optional[str]) -> QuerySet:
    """
    Aplica filtro por rango (inclusive) a un campo Date/DateTime.
    Para DateField usa __gte/__lte directos.
    """
    if fecha_desde:
        qs = qs.filter(**{f"{field}__gte": fecha_desde})
    if fecha_hasta:
        qs = qs.filter(**{f"{field}__lte": fecha_hasta})
    return qs


def _path_with_bodega(base_tail: str, bodega_id: Optional[int]) -> str:
    """
    Construye rutas consistentes con tu frontend:
    - Con bodega:  /bodega/<id>/<tail>
    - Sin bodega:  /bodega
    """
    if bodega_id:
        tail = base_tail.lstrip("/")
        return f"/bodega/{bodega_id}/{tail}" if tail else f"/bodega/{bodega_id}"
    return "/bodega"


# ──────────────────────────────────────────────────────────────────────────────
# KPIs — alineados 100% al rango resuelto (sin cálculos ISO implícitos)
# ──────────────────────────────────────────────────────────────────────────────

def kpi_recepcion(
    temporada_id: int,
    bodega_id: Optional[int],
    fecha_desde: Optional[str],
    fecha_hasta: Optional[str],
    huerta_id: Optional[int],
    semana_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Suma de cajas de Recepcion.cajas_campo restringida EXCLUSIVAMENTE al rango recibido.
    NOTA: El campo fue renombrado de 'kg_total' a 'cajas_total' (se reportan cajas, no kg).
    """
    qs = Recepcion.objects.filter(temporada_id=temporada_id, is_active=True)
    if bodega_id:
        qs = qs.filter(bodega_id=bodega_id)

    # huerta_id no aplica hoy (no hay FK a huerta en el modelo actual)
    if semana_id:
        qs = qs.filter(semana_id=semana_id)

    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

    total_cajas = qs.aggregate(v=Sum(F("cajas_campo")))["v"] or 0

    return {
        "cajas_total": int(total_cajas or 0),  # F-07 FIX: nombre semántico correcto
        "apto_pct": None,
        "merma_pct": None,
    }


# F-12 FIX: Placeholder KPIs eliminados (stock, ocupacion, rotacion, fefo,
# rechazos_qc, lead_times). Se retornaban ceros/nulos que confundían a los
# usuarios. Se reincorporarán cuando tengan modelos reales.

from gestion_bodega.services.inventory_service import InventoryService

def kpi_empaque(
    temporada_id: int,
    bodega_id: Optional[int],
    fecha_desde: Optional[str],
    fecha_hasta: Optional[str],
    huerta_id: Optional[int],
    semana_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    KPIs de proceso de empaque para el periodo.
    Delegado a InventoryService para consistencia estricta.
    """
    # 1. Métricas de produccion (Volumen Cajas)
    snapshot = InventoryService.get_stock_snapshot(
        temporada_id=temporada_id,
        bodega_id=bodega_id,
        semana_id=semana_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )
    kpis = snapshot["kpis"]

    # 2. Métricas de estado (Recepciones)
    # Nota: filter por recepciones aplica fecha_desde a la RECEPCIÓN, no al empaque.
    # InventoryService.get_recepciones_kpi maneja esto.
    rec_metrics = InventoryService.get_recepciones_kpi(
        temporada_id=temporada_id,
        bodega_id=bodega_id,
        semana_id=semana_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )

    return {
        "pendientes": rec_metrics["pendientes"],
        "empacadas": rec_metrics["finalizadas"],
        "cajas_empacadas": int(kpis["produced_period"]),
        "merma": int(kpis["merma_period"]),
    }


def build_summary(
    temporada_id: int,
    bodega_id: Optional[int],
    fecha_desde: Optional[str],
    fecha_hasta: Optional[str],
    huerta_id: Optional[int],
    semana_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Ensambla el objeto de KPIs esperado por el serializer del tablero usando SOLO el rango resuelto.
    """
    # Notar que kpi_empaque ahora usa InventoryService internamente
    # F-12 FIX: Solo KPIs con datos reales (sin placeholders)
    return {
        "kpis": {
            "recepcion": kpi_recepcion(temporada_id, bodega_id, fecha_desde, fecha_hasta, huerta_id, semana_id=semana_id),
            "empaque": kpi_empaque(temporada_id, bodega_id, fecha_desde, fecha_hasta, huerta_id, semana_id=semana_id),
        }
    }


# ──────────────────────────────────────────────────────────────────────────────
# Colas (QuerySets) con filtros opcionales — respetan rango + soft-delete + semana
# ──────────────────────────────────────────────────────────────────────────────

def queue_recepciones_qs(
    temporada_id: int,
    bodega_id: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    huerta_id: Optional[int] = None,           # no aplicable hoy (no hay FK huerta)
    estado_lote: Optional[str] = None,         # no aplicable hoy
    calidad: Optional[str] = None,             # no aplicable hoy
    madurez: Optional[str] = None,             # no aplicable hoy
    solo_pendientes: Optional[bool] = None,    # no aplicable hoy
    semana_id: Optional[int] = None,
) -> QuerySet:
    """
    Cola de recepciones basada en el modelo real Recepcion.
    Soporta rango de fechas; el resto de filtros no aplica al modelo actual.
    """
    qs = Recepcion.objects.filter(temporada_id=temporada_id, is_active=True)
    if bodega_id:
        qs = qs.filter(bodega_id=bodega_id)

    if semana_id:
        qs = qs.filter(semana_id=semana_id)

    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

    if solo_pendientes:
        # Filtrar solo recepciones donde empacado < campo
        qs = qs.annotate(
            total_packed=Coalesce(
                Sum("clasificaciones__cantidad_cajas", filter=Q(clasificaciones__is_active=True)), 
                0
            )
        )
        qs = qs.filter(total_packed__lt=F("cajas_campo"))

    
    return (
        qs.values(
            "id", "fecha", "huertero_nombre", "cajas_campo", "tipo_mango",
            "semana_id", "bodega_id", "temporada_id"  # P3: IDs para trazabilidad
        ).order_by("-fecha", "-id")
    )


def queue_inventarios_qs(
    temporada_id: int,
    bodega_id: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    huerta_id: Optional[int] = None,   # no aplicable hoy
    calidad: Optional[str] = None,
    madurez: Optional[str] = None,
    semana_id: Optional[int] = None,
) -> QuerySet:
    """
    Agrupa ClasificacionEmpaque por lote para mostrar 'Empaque N' consolidado.
    Usa la MISMA base que el KPI de stock para garantizar consistencia.
    """
    snapshot = InventoryService.get_stock_snapshot(
        temporada_id=temporada_id,
        bodega_id=bodega_id,
        semana_id=semana_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )
    
    # Obtenemos el QS ya filtrado igual que el KPI
    qs = snapshot["qs_periodo"].exclude(calidad__iexact="MERMA")

    if madurez:
        qs = qs.filter(calidad=madurez)
    if calidad:
        qs = qs.filter(calidad=calidad)

    # Identificar campos válidos para agrupar (Lote o Recepcion)
    # Si usamos Lote FK:
    # P3 FIX: IDs extra como Max() para evitar duplicados en GROUP BY
    return (
        qs.values(
            "lote__id",
            "lote__codigo_lote",
            "recepcion__huertero_nombre",
            "semana_id",
        )
        .annotate(
            total_cajas=Sum("cantidad_cajas"),
            fecha=Max("actualizado_en"),
            id=Max("id"),
            # P3: IDs canónicos como Max() (1 fila por lote)
            recepcion_id=Max("recepcion_id"),
            bodega_id=Max("bodega_id"),
            temporada_id=Max("temporada_id"),
        )
        .order_by("-fecha", "-id")
    )


def queue_despachos_qs(
    temporada_id: int,
    bodega_id: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    estado: Optional[str] = None,
) -> QuerySet:
    """
    Usa CamionSalida para la vista mínima de 'despachos':
    fecha_salida y suma de cajas del manifiesto (CamionItem).
    """
    qs = CamionSalida.objects.filter(temporada_id=temporada_id, is_active=True)
    if bodega_id:
        qs = qs.filter(bodega_id=bodega_id)
        
    # Phase 3 Immutability: Drafts naturally have no depart date yet. They shouldn't be excluded 
    # when filtering by the current "abierta" week range. They mathematically exist "right now".
    if fecha_desde and fecha_hasta:
        qs = qs.filter(
            Q(fecha_salida__gte=fecha_desde, fecha_salida__lte=fecha_hasta) |
            Q(fecha_salida__isnull=True)
        )
    elif fecha_desde:
        qs = qs.filter(
            Q(fecha_salida__gte=fecha_desde) |
            Q(fecha_salida__isnull=True)
        )
    elif fecha_hasta:
        qs = qs.filter(
            Q(fecha_salida__lte=fecha_hasta) |
            Q(fecha_salida__isnull=True)
        )
    
    if estado:
        qs = qs.filter(estado=estado)

    return (
        qs.values(
            "id", "numero", "fecha_salida", "estado",
            "folio", "semana_id", "bodega_id", "temporada_id"  # P3: IDs para trazabilidad
        )
        .annotate(cajas_total=Sum(
            "cargas__cantidad",
            filter=Q(cargas__is_active=True)
        ))
        .order_by("estado", "-fecha_salida", "-id")
    )


def build_queue_items(tipo: str, raw_rows) -> List[Dict[str, Any]]:
    """
    Mapea filas crudas a shape unificado esperado por el front.
    Cada item devuelve 'cajas' con el número de cajas.
    """
    items: List[Dict[str, Any]] = []

    if tipo == "recepciones":
        for r in raw_rows:
            h = r.get("huertero_nombre") or None
            items.append({
                "id": r["id"],
                "ref": f"REC-{r['id']}",
                "fecha": r["fecha"],  # DateField → DRF lo serializa a ISO
                "huertero": h,
                "huerta": h,  # alias compat
                "cajas": float(r.get("cajas_campo") or 0.0),
                "estado": "REGISTRADA",
                # P3: IDs canónicos para trazabilidad
                "recepcion_id": r["id"],
                "semana_id": r.get("semana_id"),
                "bodega_id": r.get("bodega_id"),
                "temporada_id": r.get("temporada_id"),
                "meta": {
                    "tipo": r.get("tipo_mango"),
                    "semana_id": r.get("semana_id"),
                },
            })

    elif tipo == "inventarios":
        # F-09 FIX: Prefetch bulk en lugar de N+1 per-row queries
        lotes_ids = [r.get("lote__id") for r in raw_rows if r.get("lote__id")]
        recepciones_ids = [r.get("recepcion_id") for r in raw_rows if not r.get("lote__id")]

        # 1. Bulk prefetch de desgloses (clasificaciones por lote y por recepcion sin lote)
        desglose_cache: Dict[str, List[Dict]] = {}  # "lote:{id}" o "rec:{id}" → details
        if lotes_ids:
            for d in ClasificacionEmpaque.objects.filter(is_active=True, lote_id__in=lotes_ids).values('lote_id', 'calidad', 'material', 'cantidad_cajas'):
                key = f"lote:{d['lote_id']}"
                desglose_cache.setdefault(key, []).append(d)
        if recepciones_ids:
            for d in ClasificacionEmpaque.objects.filter(is_active=True, lote__isnull=True, recepcion_id__in=recepciones_ids).values('recepcion_id', 'calidad', 'material', 'cantidad_cajas'):
                key = f"rec:{d['recepcion_id']}"
                desglose_cache.setdefault(key, []).append(d)

        # 2. Bulk prefetch de despachados
        lotes_despachados = set(
            CamionConsumoEmpaque.objects.filter(
                is_active=True,
                clasificacion_empaque__is_active=True,
                clasificacion_empaque__lote_id__in=lotes_ids,
                camion__is_active=True,
                camion__estado__in=["BORRADOR", "CONFIRMADO", "DESPACHADO"],
            ).values_list("clasificacion_empaque__lote_id", flat=True).distinct()
        ) if lotes_ids else set()

        recepciones_null_despachadas = set(
            CamionConsumoEmpaque.objects.filter(
                is_active=True,
                clasificacion_empaque__is_active=True,
                clasificacion_empaque__lote__isnull=True,
                clasificacion_empaque__recepcion_id__in=recepciones_ids,
                camion__is_active=True,
                camion__estado__in=["BORRADOR", "CONFIRMADO", "DESPACHADO"],
            ).values_list("clasificacion_empaque__recepcion_id", flat=True).distinct()
        ) if recepciones_ids else set()

        for idx, r in enumerate(raw_rows, start=1):
            lote_id = r.get("lote__id")
            lote_cod = r.get("lote__codigo_lote") or f"??-{lote_id or 'X'}"
            recepcion_id = r.get("recepcion_id")

            # Lookup from cache instead of per-row query (F-09 FIX)
            cache_key = f"lote:{lote_id}" if lote_id else f"rec:{recepcion_id}"
            details_raw = desglose_cache.get(cache_key, [])

            desglose = []
            for d in details_raw:
                desglose.append(f"{d['calidad']}: {d['cantidad_cajas']}")

            is_despachado = False
            if lote_id:
                is_despachado = lote_id in lotes_despachados
            elif recepcion_id:
                is_despachado = recepcion_id in recepciones_null_despachadas

            ts = r.get("fecha")
            clasificacion_label = ", ".join(desglose) if desglose else "—"

            items.append({
                "id": lote_id or 0,
                "ref": f"Empaque #{idx}",
                "fecha": ts,
                "huertero": r.get("recepcion__huertero_nombre"),
                "huerta": r.get("recepcion__huertero_nombre"),
                "cajas": float(r.get("total_cajas") or 0.0),
                "estado": "CLASIFICADO",
                "lote_id": lote_id,
                "recepcion_id": r.get("recepcion_id"),
                "semana_id": r.get("semana_id"),
                "bodega_id": r.get("bodega_id"),
                "temporada_id": r.get("temporada_id"),
                "clasificacion_label": clasificacion_label,
                "meta": {
                    "semana_id": r.get("semana_id"),
                    "desglose": desglose,
                    "desglose_raw": details_raw,
                    "despachado": is_despachado,
                },
            })

    elif tipo == "despachos":
        camion_ids = [r["id"] for r in raw_rows]
        tipos_por_camion: Dict[int, List[str]] = {}
        if camion_ids:
            for row in (
                CamionItem.objects.filter(camion_id__in=camion_ids)
                .exclude(tipo_mango="")
                .values("camion_id", "tipo_mango")
            ):
                tipos_por_camion.setdefault(row["camion_id"], [])
                if row["tipo_mango"] not in tipos_por_camion[row["camion_id"]]:
                    tipos_por_camion[row["camion_id"]].append(row["tipo_mango"])
        for idx, r in enumerate(raw_rows, start=1):
            ref_str = f"Camión #{r.get('numero')}" if r.get('numero') else f"Camión #{idx}"
            items.append({
                "id": r["id"],
                "ref": ref_str,
                "fecha": r["fecha_salida"],
                "huertero": None,
                "huerta": None,  # alias compat
                "cajas": float(r.get("cajas_total") or 0.0),
                "estado": r.get("estado") or "BORRADOR",
                # P3: IDs canónicos para trazabilidad
                "camion_id": r["id"],
                "folio": r.get("folio", ""),
                "numero": r.get("numero"),
                "semana_id": r.get("semana_id"),
                "bodega_id": r.get("bodega_id"),
                "temporada_id": r.get("temporada_id"),
                "meta": {
                    "tipos_mango": tipos_por_camion.get(r["id"], []),
                },
            })

    return items


# ──────────────────────────────────────────────────────────────────────────────
# Alertas del tablero (con soft-delete)
# ──────────────────────────────────────────────────────────────────────────────

def build_alerts(
    *,
    temporada_id: int,
    bodega_id: Optional[int] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Genera la lista de alertas del tablero.
    Estructura esperada por el frontend:
    {
      "code": "ALERTA_X",
      "title": "Título corto",
      "description": "Detalle de la alerta",
      "severity": "info" | "warning" | "critical",
      "link": { "path": "/ruta", "query": { ... } }
    }

    Notas:
    - Las alertas se evalúan a nivel de temporada (no forzamos ISO semana aquí).
    - Usamos reglas conservadoras y seguras con los modelos disponibles.
    """
    alerts: List[Dict[str, Any]] = []

    today = timezone.localdate()
    d72 = today - timedelta(days=3)
    d24 = today - timedelta(days=1)
    d7 = today - timedelta(days=7)

    # 1) Sin recepciones en 72h
    rec_72h_qs = Recepcion.objects.filter(
        temporada_id=temporada_id,
        is_active=True,
        fecha__gte=d72,
    )
    if bodega_id:
        rec_72h_qs = rec_72h_qs.filter(bodega_id=bodega_id)
    rec_72h = rec_72h_qs.exists()
    if not rec_72h:
        alerts.append({
            "code": "NO_RECEPCIONES_72H",
            "title": "Sin recepciones en 72 horas",
            "description": "No se han registrado recepciones recientemente. Verifica capturas.",
            "severity": "warning",
            "link": {
                "path": _path_with_bodega("capturas", bodega_id),
                "query": {"hoy": 1},
            },
        })

    # 2) Despachos en BORRADOR con fecha pasada (>24h)
    despachos_qs = CamionSalida.objects.filter(
        temporada_id=temporada_id,
        is_active=True,
        estado="BORRADOR",
        fecha_salida__lt=d24,
    )
    if bodega_id:
        despachos_qs = despachos_qs.filter(bodega_id=bodega_id)
    despachos_atrasados = despachos_qs.exists()
    if despachos_atrasados:
        alerts.append({
            "code": "DESPACHOS_ATRASADOS",
            "title": "Despachos pendientes con fecha vencida",
            "description": "Hay camiones en estado Borrador con fecha ya vencida. Revisa logística.",
            "severity": "critical",
            "link": {
                "path": _path_with_bodega("logistica", bodega_id),
                "query": {"solo_pendientes": 1},
            },
        })

    # 3) Sin inventarios en los últimos 7 días
    emp_7d_qs = ClasificacionEmpaque.objects.filter(
        temporada_id=temporada_id,
        is_active=True,
        fecha__gte=d7,
    )
    if bodega_id:
        emp_7d_qs = emp_7d_qs.filter(bodega_id=bodega_id)
    emp_7d = emp_7d_qs.exists()
    if not emp_7d:
        alerts.append({
            "code": "SIN_INVENTARIO_7D",
            "title": "Sin registro de inventarios en 7 días",
            "description": "No se han registrado clasificaciones/empacado recientemente.",
            "severity": "info",
            "link": {
                "path": _path_with_bodega("inventarios", bodega_id),
                "query": {},
            },
        })

    return alerts
