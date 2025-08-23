# backend/gestion_huerta/utils/reporting.py
# -*- coding: utf-8 -*-
"""
Punto único para construir el contrato de reportes para el front.

Funciones expuestas (drop-in):
- aggregates_for_cosecha(cosecha_id: int) -> Dict
- series_for_cosecha(cosecha_id: int) -> List[Dict]
- aggregates_for_temporada(temporada_id: int) -> Dict
- series_for_temporada(temporada_id: int) -> List[Dict]
- aggregates_for_huerta(huerta_id: int) -> Dict
- series_for_huerta(huerta_id: int) -> List[Dict]

Estructuras devueltas:
- Aggregates de cosecha: {"kpis": [...], "tabla_inversiones": {...}, "tabla_ventas": {...}}
- Series de cosecha/temporada/huerta: [{"id","label","type","data"}]
- Aggregates de temporada: {"kpis": [...], "tabla": {...}}
- Aggregates de huerta: {"kpis": [...], "tabla": {...}}
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from django.db.models import Sum, F, Q
from django.db.models.functions import TruncMonth

from gestion_huerta.models import (
    Cosecha,
    Temporada,
    Huerta,
    HuertaRentada,
    InversionesHuerta,
    Venta,
)

# =========================
# Utilidades seguras
# =========================

def D(x: Any) -> Decimal:
    try:
        if x is None:
            return Decimal("0")
        return Decimal(str(x))
    except Exception:
        return Decimal("0")


def Flt(x: Any) -> float:
    try:
        return float(D(x))
    except Exception:
        return 0.0


def fmt_money(x: Any) -> str:
    return f"${Flt(x):,.2f}"


def fmt_num(x: Any) -> str:
    try:
        return f"{int(x)}"
    except Exception:
        return "0"


def _hectareas_de_cosecha(cosecha: Cosecha) -> float:
    origen = cosecha.huerta or cosecha.huerta_rentada
    return Flt(getattr(origen, "hectareas", 0))


def _nombre_propietario(origen) -> str:
    try:
        return str(getattr(origen, "propietario", "")) if origen else ""
    except Exception:
        return ""


# =========================
# Aggregates/series de COSECHA
# =========================

def aggregates_for_cosecha(cosecha_id: int) -> Dict[str, Any]:
    """Calcula KPI y datos de tabla para una cosecha (robusto y performante)."""
    try:
        cosecha = (
            Cosecha.objects.select_related("temporada", "huerta", "huerta_rentada")
            .prefetch_related(
                # No hace falta select_related('categoria') aquí; las tablas muestran nombre ya guardado
                # pero lo añadimos para evitar N+1 si el front lo requiere.
                # (No rompe si la relación no existe en tu modelo).
                # Comentado por compatibilidad estricta:
                # Prefetch("inversiones", queryset=InversionesHuerta.objects.filter(is_active=True).select_related("categoria")),
                # Prefetch("ventas", queryset=Venta.objects.filter(is_active=True)),
            )
            .get(pk=cosecha_id)
        )
    except Cosecha.DoesNotExist:
        raise ValueError("Cosecha no encontrada")

    # Totales financieros por agregación
    inv_totales = cosecha.inversiones.filter(is_active=True).aggregate(
        total_insumos=Sum("gastos_insumos"),
        total_mano=Sum("gastos_mano_obra"),
    )
    total_inversiones = D(inv_totales["total_insumos"]) + D(inv_totales["total_mano"])

    ventas_tot = cosecha.ventas.filter(is_active=True).aggregate(
        total_ingreso=Sum(F("num_cajas") * F("precio_por_caja")),
        total_cajas=Sum("num_cajas"),
        total_gastos_ventas=Sum("gasto"),
    )
    total_ventas = D(ventas_tot["total_ingreso"])
    total_cajas = int(ventas_tot["total_cajas"] or 0)
    gastos_ventas = D(ventas_tot["total_gastos_ventas"])
    ganancia_bruta = total_ventas - gastos_ventas
    ganancia_neta = ganancia_bruta - total_inversiones
    roi = (ganancia_neta / total_inversiones * D(100)) if total_inversiones > 0 else D(0)

    hectareas = _hectareas_de_cosecha(cosecha)
    ganancia_ha = (Flt(ganancia_neta) / hectareas) if hectareas > 0 else 0.0
    precio_promedio = Flt(total_ventas / D(total_cajas)) if total_cajas > 0 else 0.0
    costo_unitario = Flt((total_inversiones + gastos_ventas) / D(total_cajas)) if total_cajas > 0 else 0.0
    margen_unitario = Flt(ganancia_neta / D(total_cajas)) if total_cajas > 0 else 0.0

    kpis = [
        {"id": "inv_total", "label": "Total Inversiones", "value": fmt_money(total_inversiones)},
        {"id": "ventas_total", "label": "Total Ventas", "value": fmt_money(total_ventas)},
        {"id": "gastos_venta", "label": "Gastos de Venta", "value": fmt_money(gastos_ventas)},
        {"id": "ganancia_bruta", "label": "Ganancia Bruta", "value": fmt_money(ganancia_bruta)},
        {"id": "ganancia_neta", "label": "Ganancia Neta", "value": fmt_money(ganancia_neta)},
        {"id": "roi", "label": "ROI", "value": f"{Flt(roi):.1f}%"},
        {"id": "ganancia_hectarea", "label": "Ganancia/Ha", "value": fmt_money(ganancia_ha)},
        {"id": "cajas_totales", "label": "Cajas Totales", "value": fmt_num(total_cajas)},
        {"id": "precio_promedio_caja", "label": "Precio Prom. Caja", "value": fmt_money(precio_promedio)},
        {"id": "costo_unitario", "label": "Costo por Caja", "value": fmt_money(costo_unitario)},
        {"id": "margen_unitario", "label": "Margen por Caja", "value": fmt_money(margen_unitario)},
    ]

    # Detalle de inversiones
    inversiones = cosecha.inversiones.filter(is_active=True).select_related("categoria").order_by("fecha")
    tabla_inv = {"columns": ["Fecha", "Categoría", "Insumos", "Mano de Obra", "Total"], "rows": []}
    for inv in inversiones:
        gi = D(getattr(inv, "gastos_insumos", 0))
        gm = D(getattr(inv, "gastos_mano_obra", 0))
        fecha = inv.fecha.strftime("%Y-%m-%d") if getattr(inv, "fecha", None) else ""
        categoria = getattr(getattr(inv, "categoria", None), "nombre", "Sin categoría")
        tabla_inv["rows"].append(
            [fecha, categoria, fmt_money(gi), fmt_money(gm), fmt_money(gi + gm)]
        )

    # Detalle de ventas
    ventas = cosecha.ventas.filter(is_active=True).order_by("fecha_venta")
    tabla_ventas = {"columns": ["Fecha", "Variedad", "Cajas", "Precio/Caja", "Total"], "rows": []}
    for v in ventas:
        fecha = v.fecha_venta.strftime("%Y-%m-%d") if getattr(v, "fecha_venta", None) else ""
        ingreso = D(getattr(v, "precio_por_caja", 0)) * D(getattr(v, "num_cajas", 0))
        tabla_ventas["rows"].append(
            [
                fecha,
                getattr(v, "tipo_mango", "") or "",
                fmt_num(getattr(v, "num_cajas", 0)),
                fmt_money(getattr(v, "precio_por_caja", 0)),
                fmt_money(ingreso),
            ]
        )

    return {"kpis": kpis, "tabla_inversiones": tabla_inv, "tabla_ventas": tabla_ventas}


def series_for_cosecha(cosecha_id: int) -> List[Dict[str, Any]]:
    """Series visuales para una cosecha (distribución de inversiones por categoría)."""
    try:
        cosecha = Cosecha.objects.get(pk=cosecha_id)
    except Cosecha.DoesNotExist:
        raise ValueError("Cosecha no encontrada")

    distribucion = (
        cosecha.inversiones.filter(is_active=True)
        .values("categoria__nombre")
        .annotate(total=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
    )
    data_pie = [{"name": item["categoria__nombre"] or "Sin categoría", "value": Flt(item["total"])} for item in distribucion]

    return [{"id": "dist_inversion", "label": "Distribución Inversiones", "type": "pie", "data": data_pie}]


# =========================
# Aggregates/series de TEMPORADA
# =========================

def aggregates_for_temporada(temporada_id: int) -> Dict[str, Any]:
    """KPI consolidados y tabla comparativa por cosecha para una temporada."""
    try:
        temp = Temporada.objects.select_related("huerta", "huerta_rentada").get(pk=temporada_id)
    except Temporada.DoesNotExist:
        raise ValueError("Temporada no encontrada")

    inv_tot = (
        InversionesHuerta.objects.filter(is_active=True, temporada=temp)
        .aggregate(total=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
    )
    ventas_tot = (
        Venta.objects.filter(is_active=True, temporada=temp)
        .aggregate(
            ingreso=Sum(F("num_cajas") * F("precio_por_caja")),
            gasto_ventas=Sum("gasto"),
            cajas=Sum("num_cajas"),
        )
    )
    total_inversiones = D(inv_tot["total"] or 0)
    total_ventas = D(ventas_tot["ingreso"] or 0)
    gastos_ventas = D(ventas_tot["gasto_ventas"] or 0)
    total_cajas = int(ventas_tot["cajas"] or 0)
    ganancia_neta = total_ventas - total_inversiones - gastos_ventas
    roi_temp = (ganancia_neta / total_inversiones * D(100)) if total_inversiones > 0 else D(0)

    origen = temp.huerta or temp.huerta_rentada
    hect = Flt(getattr(origen, "hectareas", 0))
    productividad = (total_cajas / hect) if (hect and total_cajas > 0) else 0.0

    kpis = [
        {"id": "inv_total", "label": "Inversión Total", "value": fmt_money(total_inversiones)},
        {"id": "ventas_total", "label": "Ventas Totales", "value": fmt_money(total_ventas)},
        {"id": "gastos_venta", "label": "Gastos de Venta", "value": fmt_money(gastos_ventas)},
        {"id": "ganancia_neta", "label": "Ganancia Neta", "value": fmt_money(ganancia_neta)},
        {"id": "roi", "label": "ROI Temporada", "value": f"{Flt(roi_temp):.1f}%"},
        {"id": "productividad", "label": "Productividad", "value": f"{productividad:.1f} cajas/ha"},
        {"id": "cajas_totales", "label": "Cajas Totales", "value": fmt_num(total_cajas)},
    ]

    # Tabla comparativa por cosecha (consultas agregadas para evitar N+1)
    cosechas = temp.cosechas.filter(is_active=True).order_by("id").values("id", "nombre")
    tabla = {"columns": ["Cosecha", "Inversión", "Ventas", "Ganancia", "ROI", "Cajas"], "rows": []}
    ids = [c["id"] for c in cosechas]

    invs_por_cosecha = (
        InversionesHuerta.objects.filter(is_active=True, cosecha_id__in=ids)
        .values("cosecha_id")
        .annotate(total=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
    )
    inv_map = {x["cosecha_id"]: D(x["total"] or 0) for x in invs_por_cosecha}

    ventas_por_cosecha = (
        Venta.objects.filter(is_active=True, cosecha_id__in=ids)
        .values("cosecha_id")
        .annotate(
            ingreso=Sum(F("num_cajas") * F("precio_por_caja")),
            gasto=Sum("gasto"),
            cajas=Sum("num_cajas"),
        )
    )
    ven_map = {
        x["cosecha_id"]: {
            "ingreso": D(x["ingreso"] or 0),
            "gasto": D(x["gasto"] or 0),
            "cajas": int(x["cajas"] or 0),
        }
        for x in ventas_por_cosecha
    }

    for c in cosechas:
        inv = inv_map.get(c["id"], D(0))
        vdat = ven_map.get(c["id"], {"ingreso": D(0), "gasto": D(0), "cajas": 0})
        ingreso = vdat["ingreso"]
        gasto = vdat["gasto"]
        cajas = vdat["cajas"]
        gan = ingreso - inv - gasto
        roi = (gan / inv * D(100)) if inv > 0 else D(0)
        tabla["rows"].append(
            [c["nombre"], fmt_money(inv), fmt_money(ingreso), fmt_money(gan), f"{Flt(roi):.1f}%", fmt_num(cajas)]
        )

    return {"kpis": kpis, "tabla": tabla}


def series_for_temporada(temporada_id: int) -> List[Dict[str, Any]]:
    """Series de evolución mensual, distribución por categoría y variedades para una temporada."""
    try:
        temp = Temporada.objects.get(pk=temporada_id)
    except Temporada.DoesNotExist:
        raise ValueError("Temporada no encontrada")

    # Inversiones por mes
    inv_mensuales = (
        InversionesHuerta.objects.filter(is_active=True, temporada=temp)
        .annotate(mes=TruncMonth("fecha"))
        .values("mes")
        .annotate(total=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
        .order_by("mes")
    )
    data_inv_mes = [{"x": item["mes"].strftime("%Y-%m"), "y": Flt(item["total"])} for item in inv_mensuales]

    # Ventas por mes
    ventas_mens = (
        Venta.objects.filter(is_active=True, temporada=temp)
        .annotate(mes=TruncMonth("fecha_venta"))
        .values("mes")
        .annotate(total=Sum(F("num_cajas") * F("precio_por_caja")))
        .order_by("mes")
    )
    data_ventas_mes = [{"x": item["mes"].strftime("%Y-%m"), "y": Flt(item["total"])} for item in ventas_mens]

    # Distribución inversiones por categoría (pie)
    dist_inv = (
        InversionesHuerta.objects.filter(is_active=True, temporada=temp)
        .values("categoria__nombre")
        .annotate(total=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
    )
    data_pie = [{"name": cat["categoria__nombre"] or "Sin categoría", "value": Flt(cat["total"])} for cat in dist_inv]

    # Variedades (barras)
    var_stats = (
        Venta.objects.filter(is_active=True, temporada=temp)
        .values("tipo_mango")
        .annotate(cajas=Sum("num_cajas"), ingreso=Sum(F("num_cajas") * F("precio_por_caja")))
    )
    total_ingreso = sum(Flt(v["ingreso"]) for v in var_stats) or 1.0
    data_var = []
    for v in var_stats:
        ingreso = Flt(v["ingreso"])
        cajas = int(v["cajas"] or 0)
        prom_precio = (ingreso / cajas) if cajas > 0 else 0.0
        data_var.append(
            {
                "variedad": v["tipo_mango"] or "Sin variedad",
                "cajas": cajas,
                "precio_prom": round(prom_precio, 2),
                "ingreso": round(ingreso, 2),
                "porcentaje": round((ingreso / total_ingreso) * 100, 1),
            }
        )

    return [
        {"id": "inv_mensuales", "label": "Inversiones por Mes", "type": "bar", "data": data_inv_mes},
        {"id": "ventas_mensuales", "label": "Ventas por Mes", "type": "line", "data": data_ventas_mes},
        {"id": "dist_inversion", "label": "Distribución Inversiones", "type": "pie", "data": data_pie},
        {"id": "variedades", "label": "Ventas por Variedad", "type": "bar", "data": data_var},
    ]


# =========================
# Aggregates/series de HUERTA (perfil)
# =========================

def _resolver_huerta(huerta_id: int):
    """Obtiene Huerta propia o rentada según exista; lanza error si ninguna coincide."""
    try:
        return Huerta.objects.get(pk=huerta_id)
    except Huerta.DoesNotExist:
        try:
            return HuertaRentada.objects.get(pk=huerta_id)
        except HuertaRentada.DoesNotExist:
            raise ValueError("Huerta no encontrada (propia ni rentada)")


def aggregates_for_huerta(huerta_id: int) -> Dict[str, Any]:
    """KPIs históricos y tabla por año para el perfil de huerta (propia o rentada)."""
    huerta = _resolver_huerta(huerta_id)

    # Todas las temporadas de esta huerta (propia o rentada)
    temporadas = Temporada.objects.filter(Q(huerta=huerta) | Q(huerta_rentada=huerta), is_active=True).order_by("-año")

    # Resumen por año
    resumen: Dict[int, Dict[str, float]] = {}

    # Agregamos inversiones/ventas/cajas por temporada y resumimos por año
    invs = (
        InversionesHuerta.objects.filter(is_active=True)
        .filter(Q(huerta=huerta) | Q(huerta_rentada=huerta) | Q(temporada__huerta=huerta) | Q(temporada__huerta_rentada=huerta))
        .values("temporada__año")
        .annotate(total=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
    )
    inv_map = {x["temporada__año"]: Flt(x["total"] or 0) for x in invs}

    vts = (
        Venta.objects.filter(is_active=True)
        .filter(Q(huerta=huerta) | Q(huerta_rentada=huerta) | Q(temporada__huerta=huerta) | Q(temporada__huerta_rentada=huerta))
        .values("temporada__año")
        .annotate(
            ingreso=Sum(F("num_cajas") * F("precio_por_caja")),
            gasto=Sum("gasto"),
            cajas=Sum("num_cajas"),
        )
    )
    ven_map = {
        x["temporada__año"]: {"ingreso": Flt(x["ingreso"] or 0), "gasto": Flt(x["gasto"] or 0), "cajas": int(x["cajas"] or 0)}
        for x in vts
    }

    years = set([t.año for t in temporadas])
    for y in years:
        inv = inv_map.get(y, 0.0)
        ven = ven_map.get(y, {"ingreso": 0.0, "gasto": 0.0, "cajas": 0})
        gan = ven["ingreso"] - inv - ven["gasto"]
        roi = (gan / inv * 100.0) if inv > 0 else 0.0
        resumen[y] = {
            "inversion": inv,
            "ventas": ven["ingreso"],
            "ganancia": gan,
            "cajas": ven["cajas"],
            "roi": roi,
        }

    # Tabla (últimos 5 años)
    years_sorted = sorted(years, reverse=True)[:5]
    tabla = {"columns": ["Año", "Inversión", "Ventas", "Ganancia", "ROI", "Cajas"], "rows": []}
    for y in years_sorted:
        data = resumen.get(y, {"inversion": 0, "ventas": 0, "ganancia": 0, "roi": 0, "cajas": 0})
        tabla["rows"].append(
            [str(y), fmt_money(data["inversion"]), fmt_money(data["ventas"]), fmt_money(data["ganancia"]), f"{data['roi']:.1f}%", f"{data['cajas']} cajas"]
        )

    # KPIs históricos
    if years_sorted:
        roi_vals = [resumen[yr]["roi"] for yr in years_sorted]
        avg_roi = sum(roi_vals) / len(roi_vals)
        var_roi = sum((r - avg_roi) ** 2 for r in roi_vals) / len(roi_vals) if len(roi_vals) > 1 else 0.0
        std_roi = var_roi ** 0.5
        mejor_año = max(years_sorted, key=lambda yr: resumen[yr]["roi"])
        peor_año = min(years_sorted, key=lambda yr: resumen[yr]["roi"])
        tendencia = (
            "Creciente"
            if resumen[years_sorted[0]]["roi"] > resumen[years_sorted[-1]]["roi"]
            else ("Decreciente" if resumen[years_sorted[0]]["roi"] < resumen[years_sorted[-1]]["roi"] else "Estable")
        )
    else:
        avg_roi = std_roi = 0.0
        mejor_año = peor_año = None
        tendencia = "Insuficientes datos"

    kpis = [
        {
            "id": "mejor_temp",
            "label": "Mejor Temporada",
            "value": f"{mejor_año} (ROI {resumen[mejor_año]['roi']:.1f}%)" if mejor_año is not None else "N/A",
        },
        {
            "id": "peor_temp",
            "label": "Peor Temporada",
            "value": f"{peor_año} (ROI {resumen[peor_año]['roi']:.1f}%)" if peor_año is not None else "N/A",
        },
        {"id": "roi_prom", "label": "ROI Promedio Histórico", "value": f"{avg_roi:.1f}%"},
        {"id": "roi_var", "label": "Variabilidad ROI (desv.)", "value": f"±{std_roi:.1f}%"},
        {"id": "tendencia", "label": "Tendencia ROI", "value": tendencia},
    ]
    return {"kpis": kpis, "tabla": tabla}


def series_for_huerta(huerta_id: int) -> List[Dict[str, Any]]:
    """Series históricas para huerta (ingresos vs inversiones, ROI anual, productividad, etc.)."""
    huerta = _resolver_huerta(huerta_id)

    inv_por_anio = (
        InversionesHuerta.objects.filter(is_active=True)
        .filter(Q(huerta=huerta) | Q(huerta_rentada=huerta) | Q(temporada__huerta=huerta) | Q(temporada__huerta_rentada=huerta))
        .values("temporada__año")
        .annotate(total_inv=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
    )
    ventas_por_anio = (
        Venta.objects.filter(is_active=True)
        .filter(Q(huerta=huerta) | Q(huerta_rentada=huerta) | Q(temporada__huerta=huerta) | Q(temporada__huerta_rentada=huerta))
        .values("temporada__año")
        .annotate(total_ventas=Sum(F("num_cajas") * F("precio_por_caja")))
    )
    data_ingresos = {item["temporada__año"]: Flt(item["total_ventas"] or 0) for item in ventas_por_anio}
    data_gastos = {item["temporada__año"]: Flt(item["total_inv"] or 0) for item in inv_por_anio}
    anios = sorted(set(list(data_ingresos.keys()) + list(data_gastos.keys())))
    data_line = [{"year": str(year), "inversion": data_gastos.get(year, 0.0), "ventas": data_ingresos.get(year, 0.0)} for year in anios]

    # ROI por año
    roi_por_anio = []
    for year in anios:
        inv = data_gastos.get(year, 0.0)
        ventas = data_ingresos.get(year, 0.0)
        roi = ((ventas - inv) / inv * 100.0) if inv > 0 else 0.0
        roi_por_anio.append({"year": str(year), "roi": round(roi, 1)})

    # Cajas por hectárea (productividad)
    cajas_por_anio = (
        Venta.objects.filter(is_active=True)
        .filter(Q(huerta=huerta) | Q(huerta_rentada=huerta) | Q(temporada__huerta=huerta) | Q(temporada__huerta_rentada=huerta))
        .values("temporada__año")
        .annotate(total_cajas=Sum("num_cajas"))
    )
    hectareas = Flt(getattr(huerta, "hectareas", 0))
    data_prod = []
    for item in cajas_por_anio:
        year = item["temporada__año"]
        cajas = int(item["total_cajas"] or 0)
        prod = (cajas / hectareas) if hectareas > 0 else 0.0
        data_prod.append({"year": str(year), "cajas_por_ha": round(prod, 1)})

    # Distribución histórica de inversiones por categoría
    dist_cat = (
        InversionesHuerta.objects.filter(is_active=True)
        .filter(Q(huerta=huerta) | Q(huerta_rentada=huerta) | Q(temporada__huerta=huerta) | Q(temporada__huerta_rentada=huerta))
        .values("categoria__nombre")
        .annotate(total=Sum(F("gastos_insumos") + F("gastos_mano_obra")))
    )
    data_pie = [{"name": cat["categoria__nombre"] or "Sin categoría", "value": Flt(cat["total"])} for cat in dist_cat]

    # Estacionalidad (ingreso por mes consolidado)
    ventas_por_mes = (
        Venta.objects.filter(is_active=True)
        .filter(Q(huerta=huerta) | Q(huerta_rentada=huerta) | Q(temporada__huerta=huerta) | Q(temporada__huerta_rentada=huerta))
        .annotate(mes=TruncMonth("fecha_venta"))
        .values("mes")
        .annotate(total=Sum(F("num_cajas") * F("precio_por_caja")))
    )
    data_mes = [{"mes": item["mes"].strftime("%m"), "ingreso": Flt(item["total"])} for item in ventas_por_mes]

    return [
        {"id": "ingresos_vs_gastos", "label": "Ingresos vs Inversiones por Año", "type": "line", "data": data_line},
        {"id": "roi_anual", "label": "ROI por Año", "type": "bar", "data": roi_por_anio},
        {"id": "productividad", "label": "Cajas por Ha por Año", "type": "area", "data": data_prod},
        {"id": "dist_inversion_hist", "label": "Distribución Hist. Inversiones", "type": "pie", "data": data_pie},
        {"id": "estacionalidad", "label": "Estacionalidad de Ventas", "type": "line", "data": data_mes},
    ]
