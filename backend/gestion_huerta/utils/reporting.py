# -*- coding: utf-8 -*-
"""
Punto único para construir el contrato de reportes del front:
{
  "kpis": [{ id, label, value, hint? }],
  "series": [{ id, label, type, data }],
  "tabla": { columns: [...], rows: [...] }
}
Implementaremos:
 - aggregates_for_cosecha(), aggregates_for_temporada(), aggregates_for_huerta()
 - series_for_cosecha(), series_for_temporada(), series_for_huerta()
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Iterable, List, Union

from django.db.models import F, Sum, Value, ExpressionWrapper, DecimalField
from django.db.models.functions import Coalesce

from gestion_huerta.models import (
    Cosecha,
    Temporada,
    Huerta,
    HuertaRentada,
    InversionesHuerta,
    Venta,
)


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _money(value: Decimal | None) -> float:
    """Convierte Decimals a float para el contrato JSON."""
    if value is None:
        return 0.0
    return float(value)


def _sum_inversiones(qs: Iterable[InversionesHuerta]) -> Decimal:
    expr = F("gastos_insumos") + F("gastos_mano_obra")
    return qs.aggregate(total=Coalesce(Sum(expr), Value(Decimal("0"))))["total"]


def _sum_ventas(qs: Iterable[Venta]) -> Decimal:
    expr = ExpressionWrapper(
        F("num_cajas") * F("precio_por_caja"),
        output_field=DecimalField(max_digits=18, decimal_places=2),
    )
    return qs.aggregate(total=Coalesce(Sum(expr), Value(Decimal("0"))))["total"]


def _sum_gastos_venta(qs: Iterable[Venta]) -> Decimal:
    return qs.aggregate(total=Coalesce(Sum("gasto"), Value(Decimal("0"))))["total"]


# ---------------------------------------------------------------------------
#  Construcción de reportes
# ---------------------------------------------------------------------------

def aggregates_for_cosecha(cosecha: Cosecha) -> List[Dict[str, Any]]:
    """Devuelve KPIs principales para una cosecha."""
    inversiones = cosecha.inversiones.filter(is_active=True)
    ventas = cosecha.ventas.filter(is_active=True)

    total_inv = _sum_inversiones(inversiones)
    total_ven = _sum_ventas(ventas)
    gasto_ven = _sum_gastos_venta(ventas)
    ganancia = total_ven - total_inv - gasto_ven
    roi = (ganancia / total_inv * 100) if total_inv else Decimal("0")

    return [
        {"id": "inversiones", "label": "Inversiones", "value": _money(total_inv)},
        {"id": "ventas", "label": "Ventas", "value": _money(total_ven)},
        {"id": "ganancia", "label": "Ganancia neta", "value": _money(ganancia)},
        {
            "id": "roi",
            "label": "ROI %",
            "value": float(roi),
            "hint": "Ganancia / Inversiones",
        },
    ]


def aggregates_for_temporada(temporada: Temporada) -> List[Dict[str, Any]]:
    """KPIs de una temporada completa."""
    inversiones = temporada.inversiones.filter(is_active=True)
    ventas = temporada.ventas.filter(is_active=True)

    total_inv = _sum_inversiones(inversiones)
    total_ven = _sum_ventas(ventas)
    gasto_ven = _sum_gastos_venta(ventas)
    ganancia = total_ven - total_inv - gasto_ven
    roi = (ganancia / total_inv * 100) if total_inv else Decimal("0")

    return [
        {"id": "inversiones", "label": "Inversiones", "value": _money(total_inv)},
        {"id": "ventas", "label": "Ventas", "value": _money(total_ven)},
        {"id": "ganancia", "label": "Ganancia neta", "value": _money(ganancia)},
        {
            "id": "roi",
            "label": "ROI %",
            "value": float(roi),
            "hint": "Ganancia / Inversiones",
        },
    ]


def aggregates_for_huerta(origen: Union[Huerta, HuertaRentada]) -> List[Dict[str, Any]]:
    """KPIs históricos de una huerta (propia o rentada)."""
    temporadas = origen.temporadas.filter(is_active=True)
    inversiones = InversionesHuerta.objects.filter(temporada__in=temporadas, is_active=True)
    ventas = Venta.objects.filter(temporada__in=temporadas, is_active=True)

    total_inv = _sum_inversiones(inversiones)
    total_ven = _sum_ventas(ventas)
    gasto_ven = _sum_gastos_venta(ventas)
    ganancia = total_ven - total_inv - gasto_ven
    roi = (ganancia / total_inv * 100) if total_inv else Decimal("0")

    return [
        {"id": "inversiones", "label": "Inversiones", "value": _money(total_inv)},
        {"id": "ventas", "label": "Ventas", "value": _money(total_ven)},
        {"id": "ganancia", "label": "Ganancia neta", "value": _money(ganancia)},
        {
            "id": "roi",
            "label": "ROI %",
            "value": float(roi),
            "hint": "Ganancia / Inversiones",
        },
    ]


def series_for_cosecha(cosecha: Cosecha) -> List[Dict[str, Any]]:
    ventas = (
        cosecha.ventas.filter(is_active=True)
        .values("fecha_venta")
        .annotate(total=Sum(F("num_cajas") * F("precio_por_caja")))
        .order_by("fecha_venta")
    )
    data = [{"x": v["fecha_venta"].isoformat(), "y": float(v["total"])} for v in ventas]
    return [{"id": "ventas", "label": "Ventas", "type": "bar", "data": data}]


def series_for_temporada(temporada: Temporada) -> List[Dict[str, Any]]:
    ventas = (
        temporada.ventas.filter(is_active=True)
        .values("cosecha__nombre")
        .annotate(total=Sum(F("num_cajas") * F("precio_por_caja")))
        .order_by("cosecha__nombre")
    )
    data = [{"x": v["cosecha__nombre"], "y": float(v["total"])} for v in ventas]
    return [{"id": "ventas", "label": "Ventas por Cosecha", "type": "bar", "data": data}]


def series_for_huerta(origen: Union[Huerta, HuertaRentada]) -> List[Dict[str, Any]]:
    ventas = (
        Venta.objects.filter(temporada__in=origen.temporadas.filter(is_active=True), is_active=True)
        .values("temporada__año")
        .annotate(total=Sum(F("num_cajas") * F("precio_por_caja")))
        .order_by("temporada__año")
    )
    data = [{"x": v["temporada__año"], "y": float(v["total"])} for v in ventas]
    return [{"id": "ventas", "label": "Ventas por Año", "type": "line", "data": data}]


def tabla_for_cosecha(cosecha: Cosecha) -> Dict[str, Any]:
    rows = [
        {
            "fecha": v.fecha_venta.isoformat(),
            "tipo": v.tipo_mango,
            "cajas": v.num_cajas,
            "precio": float(v.precio_por_caja),
            "total": float(v.total_venta),
        }
        for v in cosecha.ventas.filter(is_active=True).order_by("fecha_venta")
    ]
    columns = [
        {"id": "fecha", "label": "Fecha"},
        {"id": "tipo", "label": "Tipo Mango"},
        {"id": "cajas", "label": "Cajas", "align": "right"},
        {"id": "precio", "label": "Precio/Caja", "align": "right"},
        {"id": "total", "label": "Total", "align": "right"},
    ]
    return {"columns": columns, "rows": rows}


def tabla_for_temporada(temporada: Temporada) -> Dict[str, Any]:
    rows = []
    for cosecha in temporada.cosechas.filter(is_active=True).order_by("nombre"):
        inv = _sum_inversiones(cosecha.inversiones.filter(is_active=True))
        ven = _sum_ventas(cosecha.ventas.filter(is_active=True))
        rows.append(
            {
                "cosecha": cosecha.nombre,
                "inversiones": _money(inv),
                "ventas": _money(ven),
                "ganancia": _money(ven - inv),
            }
        )
    columns = [
        {"id": "cosecha", "label": "Cosecha"},
        {"id": "inversiones", "label": "Inversiones", "align": "right"},
        {"id": "ventas", "label": "Ventas", "align": "right"},
        {"id": "ganancia", "label": "Ganancia", "align": "right"},
    ]
    return {"columns": columns, "rows": rows}


def tabla_for_huerta(origen: Union[Huerta, HuertaRentada]) -> Dict[str, Any]:
    rows = []
    for temp in origen.temporadas.filter(is_active=True).order_by("año"):
        inv = _sum_inversiones(temp.inversiones.filter(is_active=True))
        ven = _sum_ventas(temp.ventas.filter(is_active=True))
        rows.append(
            {
                "año": temp.año,
                "inversiones": _money(inv),
                "ventas": _money(ven),
                "ganancia": _money(ven - inv),
            }
        )
    columns = [
        {"id": "año", "label": "Año"},
        {"id": "inversiones", "label": "Inversiones", "align": "right"},
        {"id": "ventas", "label": "Ventas", "align": "right"},
        {"id": "ganancia", "label": "Ganancia", "align": "right"},
    ]
    return {"columns": columns, "rows": rows}


def build_cosecha_report(cosecha: Cosecha) -> Dict[str, Any]:
    return {
        "kpis": aggregates_for_cosecha(cosecha),
        "series": series_for_cosecha(cosecha),
        "tabla": tabla_for_cosecha(cosecha),
    }


def build_temporada_report(temporada: Temporada) -> Dict[str, Any]:
    return {
        "kpis": aggregates_for_temporada(temporada),
        "series": series_for_temporada(temporada),
        "tabla": tabla_for_temporada(temporada),
    }


def build_huerta_report(origen: Union[Huerta, HuertaRentada]) -> Dict[str, Any]:
    return {
        "kpis": aggregates_for_huerta(origen),
        "series": series_for_huerta(origen),
        "tabla": tabla_for_huerta(origen),
    }

