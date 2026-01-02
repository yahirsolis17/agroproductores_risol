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
    NOTA: 'kg_total' aquí representa CAJAS (compat con UI actual).
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
        "kg_total": float(total_cajas or 0.0),  # realmente 'cajas'
        "kg_apto": 0.0,
        "kg_merma": 0.0,
        "apto_pct": None,
        "merma_pct": None,
        "hoy": None,     # no inferimos ISO (evita inconsistencias con semanas manuales)
        "semana": None,  # idem
    }


def kpi_stock(temporada_id: int, huerta_id: Optional[int]) -> Dict[str, Any]:
    """
    Placeholder: sin modelo de inventario detallado disponible.
    """
    return {"total_kg": 0.0, "por_madurez": {}, "por_calidad": {}}


def kpi_ocupacion(temporada_id: int) -> Dict[str, Any]:
    """
    Placeholder: sin cámaras parametrizadas.
    """
    return {"total_pct": 0.0, "por_camara": []}


def kpi_rotacion(temporada_id: int) -> Dict[str, Any]:
    """
    Placeholder: sin lotes/fechas de ingreso.
    """
    return {"dias_promedio_bodega": 0.0}


def kpi_fefo(temporada_id: int) -> Dict[str, Any]:
    """
    Placeholder: no hay FEFO sin lotes/fechas de caducidad.
    """
    return {"compliance_pct": None}


def kpi_rechazos_qc(temporada_id: int) -> Dict[str, Any]:
    """
    Placeholder: no hay QC/mermas en el modelo actual.
    """
    return {"tasa_pct": 0.0, "top_causas": []}


def kpi_lead_times(temporada_id: int) -> Dict[str, Any]:
    """
    Placeholder: sin modelo de lotes/despachos detallados.
    """
    return {"recepcion_a_inventario_h": None, "inventario_a_despacho_h": None}

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
    return {
        "kpis": {
            "recepcion": kpi_recepcion(temporada_id, bodega_id, fecha_desde, fecha_hasta, huerta_id, semana_id=semana_id),
            "empaque": kpi_empaque(temporada_id, bodega_id, fecha_desde, fecha_hasta, huerta_id, semana_id=semana_id),
            "stock": kpi_stock(temporada_id, huerta_id),
            "ocupacion": kpi_ocupacion(temporada_id),
            "rotacion": kpi_rotacion(temporada_id),
            "fefo": kpi_fefo(temporada_id),
            "rechazos_qc": kpi_rechazos_qc(temporada_id),
            "lead_times": kpi_lead_times(temporada_id),
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
        qs.values("id", "fecha", "huertero_nombre", "cajas_campo", "tipo_mango", "semana_id")
          .order_by("-fecha", "-id")
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
    qs = _apply_date_range(qs, "fecha_salida", fecha_desde, fecha_hasta)
    
    if estado:
        qs = qs.filter(estado=estado)

    return (
        qs.values("id", "numero", "fecha_salida", "estado")
          .annotate(cajas_total=Sum("items__cantidad_cajas"))
          .order_by("estado", "-fecha_salida", "-id")
    )


def build_queue_items(tipo: str, raw_rows) -> List[Dict[str, Any]]:
    """
    Mapea filas crudas a shape unificado esperado por el front.
    Nota: 'kg' contiene número de CAJAS por compatibilidad con UI actual.
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
                "kg": float(r.get("cajas_campo") or 0.0),  # realmente 'cajas'
                "estado": "REGISTRADA",
                "meta": {
                    "tipo": r.get("tipo_mango"),
                    "semana_id": r.get("semana_id"),
                },
            })

    elif tipo == "inventarios":
        # Grouping strategy: raw_rows son Headers de Lote.
        for r in raw_rows:
            lote_id = r.get("lote__id")
            lote_cod = r.get("lote__codigo_lote") or f"??-{lote_id or 'X'}"
            
            # Subquery para breakdown (solo para los visualizados)
            desglose = []
            details_raw = []
            if lote_id:
                details = (
                    ClasificacionEmpaque.objects
                    .filter(lote_id=lote_id, is_active=True)
                    .values('calidad', 'material', 'cantidad_cajas')
                )
                details_raw = list(details)
                for d in details_raw:
                    mat = (d['material'] or "?")[:1]
                    desglose.append(f"{d['calidad']} ({mat}): {d['cantidad_cajas']}")
            
            # Timestamp: preferencia actualizado_en > fecha
            ts = r.get("fecha")

            # Check si alguna clasificación del lote ya fue despachada en un camión confirmado
            despachado = False
            if lote_id:
                # Importación local para evitar ciclos si fuera necesario, 
                # pero idealmente arriba. Como es utils, mejor usar lo que hay.
                # Aseguramos que CamionConsumoEmpaque esté importado.
                despachado = CamionConsumoEmpaque.objects.filter(
                    clasificacion_empaque__lote_id=lote_id,
                    camion__estado="CONFIRMADO",
                    is_active=True
                ).exists()

            items.append({
                "id": lote_id or 0, 
                "ref": f"Empaque {lote_cod}",
                "fecha": ts, 
                "huertero": r.get("recepcion__huertero_nombre"),
                "huerta": r.get("recepcion__huertero_nombre"),
                "kg": float(r.get("total_cajas") or 0.0),
                "estado": "CLASIFICADO",
                "meta": {
                    "semana_id": r.get("semana_id"),
                    "desglose": desglose,
                    "desglose_raw": details_raw,
                    "despachado": despachado,
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
        for r in raw_rows:
            ref_str = f"Camión {r.get('numero')}" if r.get('numero') else f"Camión {r['id']}"
            items.append({
                "id": r["id"],
                "ref": ref_str,
                "fecha": r["fecha_salida"],
                "huertero": None,
                "huerta": None,  # alias compat
                "kg": float(r.get("cajas_total") or 0.0),
                "estado": r.get("estado") or "BORRADOR",
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
