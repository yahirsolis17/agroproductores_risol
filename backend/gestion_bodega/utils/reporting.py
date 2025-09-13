"""
Contrato de reporting para bodega (JSON primero).
Exportadores (PDF/Excel) se conectarán después usando services/exportacion/*.

Diseño:
- aggregates_for_semana(...) -> KPIs + tablas mínimas
- aggregates_for_temporada(...) -> consolidado
- series_* -> series ligeras para dashboards

No accede a huerta; sólo a modelos de gestion_bodega.
"""
from __future__ import annotations

from typing import Any, Dict, List
from datetime import date

from django.db.models import Sum, F
from django.utils import timezone

from gestion_bodega.models import (
    Bodega,
    CierreSemanal,
    ClasificacionEmpaque,
    Pedido,
    PedidoRenglon,
    CompraMadera,
    Consumible,
)

# =========================
# Helpers
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
# Aggregates por semana
# =========================

def aggregates_for_semana(bodega_id: int, temporada_id: int, iso_semana: str) -> Dict[str, Any]:
    """
    Devuelve KPIs y tablas resumen para una semana ISO (lunes–domingo).
    Esta función NO bloquea ni escribe nada, sólo agrega.
    """
    # Rangos desde el cierre (si existe) o inferidos por iso_semana (pendiente de util).
    cierre = CierreSemanal.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        iso_semana=iso_semana
    ).first()
    if cierre:
        d1, d2 = cierre.fecha_desde, cierre.fecha_hasta
    else:
        # fallback: tomamos lunes-domingo aproximado (simple; puedes sustituir por util ISO real)
        # iso_semana formato "YYYY-WNN"
        parts = iso_semana.split("-W")
        year = int(parts[0])
        week = int(parts[1])
        # aproximación: lunes de la semana ISO => usamos fromisocalendar
        d1 = date.fromisocalendar(year, week, 1)
        d2 = date.fromisocalendar(year, week, 7)

    # Clasificación total por material/calidad
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

    # Pedidos surtidos vs abiertos
    pedidos = (
        Pedido.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, fecha__range=(d1, d2))
        .values("estado")
        .annotate(total=Sum(1 * 1))  # conteo barato
    )
    ped_map = {x["estado"]: x["total"] for x in pedidos}
    ped_abiertos = int(ped_map.get("BORRADOR", 0) + ped_map.get("PARCIAL", 0))
    ped_cerrados = int(ped_map.get("SURTIDO", 0))

    # Compras de madera $ y consumibles $
    compras_monto = (
        CompraMadera.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, creado_en__date__range=(d1, d2))
        .aggregate(total=Sum(F("monto_total")))["total"] or 0.0
    )
    consumibles_monto = (
        Consumible.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, fecha__range=(d1, d2))
        .aggregate(total=Sum(F("total")))["total"] or 0.0
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
        "rango": {"desde": d1.isoformat(), "hasta": d2.isoformat()},
        "kpis": kpis,
        "tabla_clasificacion": tabla_clasif,
    }


# =========================
# Aggregates de temporada
# =========================

def aggregates_for_temporada(bodega_id: int, temporada_id: int) -> Dict[str, Any]:
    """
    Consolidado anual de la bodega (sin huerta).
    """
    # Clasificación total del año
    clasif = (
        ClasificacionEmpaque.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id)
        .values("material", "calidad")
        .annotate(cajas=Sum("cantidad_cajas"))
    )
    total_cajas = sum(int(x["cajas"] or 0) for x in clasif)

    # Pedidos cerrados
    pedidos_sur = (
        Pedido.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, estado="SURTIDO")
        .count()
    )

    # Gasto total
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
    # Distribución por material-calidad
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
