# backend/gestion_bodega/utils/kpis.py
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Sum, F, QuerySet
from django.utils import timezone

# Modelos reales disponibles en tu repo
from gestion_bodega.models import (
    Recepcion,
    ClasificacionEmpaque,
    CamionSalida,
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


# ──────────────────────────────────────────────────────────────────────────────
# KPIs — versión mínima funcional por CAJAS
# ──────────────────────────────────────────────────────────────────────────────

def kpi_recepcion(
    temporada_id: int,
    fecha_desde: Optional[str],
    fecha_hasta: Optional[str],
    huerta_id: Optional[int],
) -> Dict[str, Any]:
    """
    Suma de cajas de Recepcion.cajas_campo. Se expone como 'kg_total' para no
    romper el frontend; las etiquetas en UI luego se cambiarán a 'cajas'.
    Los porcentajes 'apto/merma' se devuelven como null (no hay fuente aún).
    """
    qs = Recepcion.objects.filter(temporada_id=temporada_id)
    # huerta_id no existe en el modelo actual; se ignora por ahora.
    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

    total_cajas = qs.aggregate(v=Sum(F("cajas_campo")))["v"] or 0

    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    hoy = Recepcion.objects.filter(temporada_id=temporada_id, fecha=today).aggregate(v=Sum("cajas_campo"))["v"] or 0
    semana = Recepcion.objects.filter(temporada_id=temporada_id).filter(
        fecha__gte=monday, fecha__lte=sunday
    ).aggregate(v=Sum("cajas_campo"))["v"] or 0

    return {
        "kg_total": float(total_cajas or 0.0),  # realmente 'cajas'
        "kg_apto": 0.0,
        "kg_merma": 0.0,
        "apto_pct": None,
        "merma_pct": None,
        "hoy": float(hoy or 0.0),
        "semana": float(semana or 0.0),
    }


def kpi_stock(temporada_id: int, huerta_id: Optional[int]) -> Dict[str, Any]:
    """
    Placeholder: sin modelo de inventario detallado disponible.
    """
    return {"total_kg": 0.0, "por_madurez": {}, "por_calidad": {}}


def kpi_ocupacion(temporada_id: int) -> Dict[str, Any]:
    """
    Placeholder: sin camaras parametrizadas.
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


def build_summary(
    temporada_id: int,
    fecha_desde: Optional[str],
    fecha_hasta: Optional[str],
    huerta_id: Optional[int],
) -> Dict[str, Any]:
    """
    Ensambla el objeto de KPIs esperado por el serializer del tablero.
    """
    return {
        "kpis": {
            "recepcion": kpi_recepcion(temporada_id, fecha_desde, fecha_hasta, huerta_id),
            "stock": kpi_stock(temporada_id, huerta_id),
            "ocupacion": kpi_ocupacion(temporada_id),
            "rotacion": kpi_rotacion(temporada_id),
            "fefo": kpi_fefo(temporada_id),
            "rechazos_qc": kpi_rechazos_qc(temporada_id),
            "lead_times": kpi_lead_times(temporada_id),
        }
    }


# ──────────────────────────────────────────────────────────────────────────────
# Colas (QuerySets) con filtros opcionales
# ──────────────────────────────────────────────────────────────────────────────

def queue_recepciones_qs(
    temporada_id: int,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    huerta_id: Optional[int] = None,           # no aplicable hoy (no hay FK huerta)
    estado_lote: Optional[str] = None,         # no aplicable hoy
    calidad: Optional[str] = None,             # no aplicable hoy
    madurez: Optional[str] = None,             # no aplicable hoy
    solo_pendientes: Optional[bool] = None,    # no aplicable hoy
) -> QuerySet:
    """
    Cola de recepciones basada en el modelo real Recepcion.
    Soporta rango de fechas; el resto de filtros no aplica al modelo actual.
    """
    qs = (
        Recepcion.objects
        .filter(temporada_id=temporada_id)
    )
    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

    # Selección plana para la cola
    return (
        qs.values("id", "fecha", "huertero_nombre", "cajas_campo", "tipo_mango")
          .order_by("-fecha", "-id")
    )


def queue_inventarios_qs(
    temporada_id: int,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    huerta_id: Optional[int] = None,   # no aplicable hoy
    calidad: Optional[str] = None,
    madurez: Optional[str] = None,     # si viene, lo mapeamos a calidad (MADURO/NINIO/...)
) -> QuerySet:
    """
    Usamos ClasificacionEmpaque como “inventarios” (cajas empacadas).
    Filtros soportados: fecha rango y calidad/madurez (mapeado a campo calidad).
    """
    qs = (
        ClasificacionEmpaque.objects
        .filter(temporada_id=temporada_id)
    )
    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

    # Filtros por calidad/madurez (ambos caen en el campo 'calidad')
    if madurez:
        qs = qs.filter(calidad=madurez)
    if calidad:
        qs = qs.filter(calidad=calidad)

    # Proyectamos plano (y traemos huertero vía FK a Recepcion)
    return (
        qs.values(
            "id", "fecha", "material", "calidad", "tipo_mango", "cantidad_cajas",
            "recepcion__huertero_nombre",
        )
        .order_by("-fecha", "-id")
    )


def queue_despachos_qs(
    temporada_id: int,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
) -> QuerySet:
    """
    Usa CamionSalida para la vista mínima de 'despachos':
    fecha_salida y suma de cajas del manifiesto (CamionItem).
    """
    qs = CamionSalida.objects.filter(temporada_id=temporada_id)
    qs = _apply_date_range(qs, "fecha_salida", fecha_desde, fecha_hasta)

    return (
        qs.values("id", "fecha_salida", "estado")
          .annotate(cajas_total=Sum("items__cantidad_cajas"))
          .order_by("fecha_salida", "id")
    )


def build_queue_items(tipo: str, raw_rows) -> List[Dict[str, Any]]:
    """
    Mapea filas crudas a shape unificado esperado por el front.
    Nota: 'kg' contiene número de CAJAS por compatibilidad con UI actual.
    """
    items: List[Dict[str, Any]] = []

    if tipo == "recepciones":
        for r in raw_rows:
            items.append({
                "id": r["id"],
                "ref": f"REC-{r['id']}",
                "fecha": r["fecha"],  # DateField → DRF lo serializa a ISO
                "huerta": r.get("huertero_nombre") or None,
                "kg": float(r.get("cajas_campo") or 0.0),  # realmente 'cajas'
                "estado": "REGISTRADA",
                "meta": {"tipo": r.get("tipo_mango")},
            })

    elif tipo == "inventarios":
        for r in raw_rows:
            items.append({
                "id": r["id"],
                "ref": f"EMP-{r['id']}",
                "fecha": r["fecha"],  # DateField
                # Mostramos huertero como "huerta" en UI mientras no exista FK real a Huerta
                "huerta": r.get("recepcion__huertero_nombre") or None,
                "kg": float(r.get("cantidad_cajas") or 0.0),
                "estado": "CLASIFICADO",
                "meta": {
                    "calidad": r.get("calidad"),
                    "madurez": r.get("calidad"),  # alias útil para chips
                    "tipo": r.get("tipo_mango"),
                    "material": r.get("material"),
                },
            })

    elif tipo == "despachos":
        for r in raw_rows:
            items.append({
                "id": r["id"],
                "ref": f"CAM-{r['id']}",
                "fecha": r["fecha_salida"],   # DateField
                "huerta": None,
                "kg": float(r.get("cajas_total") or 0.0),  # cajas totales del manifiesto
                "estado": r.get("estado") or "BORRADOR",
                "meta": {},
            })

    return items


# ──────────────────────────────────────────────────────────────────────────────
# Alertas del tablero (placeholder seguro por ahora)
# ──────────────────────────────────────────────────────────────────────────────

def build_alerts(temporada_id: int) -> List[Dict[str, Any]]:
    """
    Sin modelos de ocupación/FEFO/QC listos, devolvemos lista vacía.
    """
    return []
