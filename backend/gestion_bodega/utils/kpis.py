from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Sum, F, QuerySet
from django.utils import timezone

# Modelos disponibles en tu repo
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
    fecha_desde: Optional[str],
    fecha_hasta: Optional[str],
    huerta_id: Optional[int],
) -> Dict[str, Any]:
    """
    Suma de cajas de Recepcion.cajas_campo restringida EXCLUSIVAMENTE al rango recibido.
    Mantiene shape esperado por el FE:
      - 'kg_total' → realmente CAJAS (se renombrará en UI)
      - 'hoy' y 'semana' quedan en None (para no inducir a error con ISO implícito).
    """
    qs = Recepcion.objects.filter(temporada_id=temporada_id)
    # huerta_id no aplica hoy (no hay FK a huerta en el modelo actual)
    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

    total_cajas = qs.aggregate(v=Sum(F("cajas_campo")))["v"] or 0

    return {
        "kg_total": float(total_cajas or 0.0),  # realmente 'cajas'
        "kg_apto": 0.0,
        "kg_merma": 0.0,
        "apto_pct": None,
        "merma_pct": None,
        "hoy": None,     # ahora no inferimos ISO (evita inconsistencias con semanas manuales)
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


def build_summary(
    temporada_id: int,
    fecha_desde: Optional[str],
    fecha_hasta: Optional[str],
    huerta_id: Optional[int],
) -> Dict[str, Any]:
    """
    Ensambla el objeto de KPIs esperado por el serializer del tablero usando SOLO el rango resuelto.
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
# Colas (QuerySets) con filtros opcionales — ya respetan el rango entrante
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
    qs = Recepcion.objects.filter(temporada_id=temporada_id)
    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

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
    madurez: Optional[str] = None,
) -> QuerySet:
    """
    Usamos ClasificacionEmpaque como “inventarios” (cajas empacadas).
    Filtros soportados: rango y calidad/madurez (ambos caen en 'calidad').
    """
    qs = ClasificacionEmpaque.objects.filter(temporada_id=temporada_id)
    qs = _apply_date_range(qs, "fecha", fecha_desde, fecha_hasta)

    if madurez:
        qs = qs.filter(calidad=madurez)
    if calidad:
        qs = qs.filter(calidad=calidad)

    return (
        qs.values(
            "id", "fecha", "material", "calidad", "tipo_mango", "cantidad_cajas",
            "recepcion__huertero_nombre",
        ).order_by("-fecha", "-id")
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
                "fecha": r["fecha"],
                "huerta": r.get("recepcion__huertero_nombre") or None,
                "kg": float(r.get("cantidad_cajas") or 0.0),
                "estado": "CLASIFICADO",
                "meta": {
                    "calidad": r.get("calidad"),
                    "madurez": r.get("calidad"),
                    "tipo": r.get("tipo_mango"),
                    "material": r.get("material"),
                },
            })

    elif tipo == "despachos":
        for r in raw_rows:
            items.append({
                "id": r["id"],
                "ref": f"CAM-{r['id']}",
                "fecha": r["fecha_salida"],
                "huerta": None,
                "kg": float(r.get("cajas_total") or 0.0),
                "estado": r.get("estado") or "BORRADOR",
                "meta": {},
            })

    return items


# ──────────────────────────────────────────────────────────────────────────────
# Alertas del tablero
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
    d7  = today - timedelta(days=7)

    # 1) Sin recepciones en 72h
    rec_72h = Recepcion.objects.filter(temporada_id=temporada_id, fecha__gte=d72).exists()
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
    despachos_atrasados = CamionSalida.objects.filter(
        temporada_id=temporada_id,
        estado="BORRADOR",
        fecha_salida__lt=d24,
    ).exists()
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
    emp_7d = ClasificacionEmpaque.objects.filter(temporada_id=temporada_id, fecha__gte=d7).exists()
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
