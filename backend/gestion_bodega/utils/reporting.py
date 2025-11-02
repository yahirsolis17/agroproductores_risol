# backend/gestion_bodega/utils/reporting.py
"""
Contrato de reporting para bodega (JSON primero).
Exportadores (PDF/Excel) se conectarán después usando services/exportacion/*.

Ajustes clave:
- `aggregates_for_semana` ahora puede aceptar `semana_id` (manual) además de `iso_semana`.
- Si hay `semana_id`, resolvemos el rango por CierreSemanal (abierta: hasta hoy o desde+6).
- Si no hay `semana_id`, mantenemos compat con `iso_semana` (lunes–domingo ISO).
- Todas las agregaciones respetan EXCLUSIVAMENTE el rango resuelto (sin ISO implícito extra).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import date, timedelta

from django.db.models import Sum, F
from django.utils import timezone

from gestion_bodega.models import (
    CierreSemanal,
    ClasificacionEmpaque,
    Pedido,
    CompraMadera,
    Consumible,
)
from .semana import iso_week_code, rango_por_semana_id

# =========================
# Helpers de formato
# =========================

def _fmt_money(x: float | int | None) -> str:
    try:
        return f"${float(x or 0):,.2f}"
    except Exception:
        return "$0.00"

def _fmt_int(x: int | None) -> str:
    try:
        return f"{int(x or 0)}"
    except Exception:
        return "0"


# =========================
# Resolución de rango
# =========================

def _resolve_week_range(
    bodega_id: int,
    temporada_id: int,
    iso_semana: Optional[str],
    semana_id: Optional[int],
) -> tuple[date, date, str]:
    """
    Devuelve (desde, hasta, etiqueta_iso) para la semana a consultar.
    Prioridad:
      1) semana_id (semana manual): usa CierreSemanal (si abierta: hasta hoy o desde+6)
      2) iso_semana (fallback): lunes–domingo ISO derivado del código
    """
    if semana_id:
        d1, d2, code = rango_por_semana_id(semana_id)
        # etiqueta: si el cierre no tiene iso_semana, derivamos del lunes de d1
        return d1, d2, code or iso_week_code(d1)

    if not iso_semana:
        raise ValueError("Se requiere 'semana_id' o 'iso_semana' para aggregates_for_semana")

    # Fallback ISO (compatibilidad)
    parts = iso_semana.split("-W")
    year = int(parts[0])
    week = int(parts[1])
    d1 = date.fromisocalendar(year, week, 1)
    d2 = date.fromisocalendar(year, week, 7)
    return d1, d2, iso_semana


# =========================
# Aggregates por semana
# =========================

def aggregates_for_semana(
    bodega_id: int,
    temporada_id: int,
    iso_semana: Optional[str] = None,
    semana_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Devuelve KPIs y tablas resumen para una semana (manual por `semana_id` o ISO por `iso_semana`).
    Esta función NO bloquea ni escribe nada, sólo agrega.
    """
    d1, d2, etiqueta_iso = _resolve_week_range(bodega_id, temporada_id, iso_semana, semana_id)

    # Clasificación total por material/calidad en rango
    clasif = (
        ClasificacionEmpaque.objects.filter(
            bodega_id=bodega_id,
            temporada_id=temporada_id,
            fecha__range=(d1, d2),
        )
        .values("material", "calidad")
        .annotate(cajas=Sum("cantidad_cajas"))
        .order_by("material", "calidad")
    )

    # Pedidos por estado en rango
    pedidos = (
        Pedido.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, fecha__range=(d1, d2))
        .values("estado")
        .annotate(total=Sum(1 * 1))  # conteo barato/compatible
    )
    ped_map = {x["estado"]: x["total"] for x in pedidos}
    ped_abiertos = int(ped_map.get("BORRADOR", 0) + ped_map.get("PARCIAL", 0))
    ped_cerrados = int(ped_map.get("SURTIDO", 0))

    # Compras de madera $ y consumibles $ en rango
    compras_monto = (
        CompraMadera.objects.filter(
            bodega_id=bodega_id,
            temporada_id=temporada_id,
            creado_en__date__range=(d1, d2)
        ).aggregate(total=Sum(F("monto_total")))["total"] or 0.0
    )
    consumibles_monto = (
        Consumible.objects.filter(
            bodega_id=bodega_id,
            temporada_id=temporada_id,
            fecha__range=(d1, d2)
        ).aggregate(total=Sum(F("total")))["total"] or 0.0
    )

    # KPIs
    kpis = [
        {"id": "k_clasif_rows", "label": "Líneas Clasificadas", "value": _fmt_int(sum(int(x["cajas"] or 0) > 0 for x in clasif))},
        {"id": "k_ped_abiertos", "label": "Pedidos Abiertos", "value": _fmt_int(ped_abiertos)},
        {"id": "k_ped_cerrados", "label": "Pedidos Cerrados", "value": _fmt_int(ped_cerrados)},
        {"id": "k_compra_madera", "label": "Gasto en Madera", "value": _fmt_money(compras_monto)},
        {"id": "k_consumibles", "label": "Gasto en Consumibles", "value": _fmt_money(consumibles_monto)},
    ]

    # Tabla de clasificación
    tabla_clasif = {
        "columns": ["Material", "Calidad", "Cajas"],
        "rows": [[c["material"], c["calidad"], _fmt_int(c["cajas"])] for c in clasif],
    }

    return {
        "rango": {"desde": d1.isoformat(), "hasta": d2.isoformat(), "iso": etiqueta_iso},
        "kpis": kpis,
        "tabla_clasificacion": tabla_clasif,
    }


# =========================
# Aggregates de temporada (sin cambios de contrato)
# =========================

def aggregates_for_temporada(bodega_id: int, temporada_id: int) -> Dict[str, Any]:
    """
    Consolidado anual de la bodega (sin huerta).
    """
    clasif = (
        ClasificacionEmpaque.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id)
        .values("material", "calidad")
        .annotate(cajas=Sum("cantidad_cajas"))
    )
    total_cajas = sum(int(x["cajas"] or 0) for x in clasif)

    pedidos_sur = (
        # estado = SURTIDO
        # (el resto de estados no cuentan como cerrados)
        Pedido.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, estado="SURTIDO")
        .count()
    )

    compras_monto = (
        CompraMadera.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id)
        .aggregate(total=Sum(F("monto_total")))["total"] or 0.0
    )
    consumibles_monto = (
        Consumible.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id)
        .aggregate(total=Sum(F("total")))["total"] or 0.0
    )

    kpis = [
        {"id": "cajas_totales", "label": "Cajas Clasificadas", "value": _fmt_int(total_cajas)},
        {"id": "pedidos_cerrados", "label": "Pedidos Cerrados", "value": _fmt_int(pedidos_sur)},
        {"id": "gasto_madera", "label": "Gasto Madera", "value": _fmt_money(compras_monto)},
        {"id": "gasto_consumibles", "label": "Gasto Consumibles", "value": _fmt_money(consumibles_monto)},
    ]

    tabla_clasif = {
        "columns": ["Material", "Calidad", "Cajas"],
        "rows": [[c["material"], c["calidad"], _fmt_int(c["cajas"])] for c in clasif],
    }

    return {"kpis": kpis, "tabla_clasificacion": tabla_clasif}


# =========================
# Series (placeholder útiles)
# =========================

def series_for_temporada(bodega_id: int, temporada_id: int) -> List[Dict[str, Any]]:
    """
    Series básicas (listas) para el dashboard de bodega por temporada.
    """
    dist = (
        ClasificacionEmpaque.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id)
        .values("material", "calidad")
        .annotate(cajas=Sum("cantidad_cajas"))
        .order_by("material", "calidad")
    )
    pie = [{"name": f"{d['material']}-{d['calidad']}", "value": int(d["cajas"] or 0)} for d in dist]
    return [
        {"id": "dist_material_calidad", "label": "Distribución por Material/Calidad", "type": "pie", "data": pie}
    ]
