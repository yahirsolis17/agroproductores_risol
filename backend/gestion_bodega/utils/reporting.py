# backend/gestion_bodega/utils/reporting.py
"""
Módulo de Reporting para Gestión de Bodega.
============================================
Genera estructuras JSON ricas (KPIs, tablas, series) para los reportes
semanales y de temporada de la bodega, incluyendo:
  - Recepciones (entradas de mango de campo)
  - Clasificaciones / Empaques (producción por material y calidad)
  - Camiones de salida (embarques y consumos reales)
  - Gastos operativos (compras de madera y consumibles)

Adicionalmente, genera PDFs profesionales vía WeasyPrint con un
diseño tipo dashboard que emula el look & feel de los reportes de Huerta.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional
from datetime import date, datetime, time, timedelta
from io import BytesIO

from django.db.models import Sum, F, Count, Q
from django.utils import timezone
from django.utils.html import escape as html_escape

from gestion_bodega.models import (
    Bodega,
    TemporadaBodega,
    CierreSemanal,
    Recepcion,
    ClasificacionEmpaque,
    CompraMadera,
    Consumible,
    CamionSalida,
    CamionConsumoEmpaque,
)
from .semana import iso_week_code, rango_por_semana_id


# ═══════════════════════════════════════════════════════════════════════════
# UTILIDADES DE FORMATO
# ═══════════════════════════════════════════════════════════════════════════

def _flt(x: Any) -> float:
    try:
        return round(float(x or 0), 2)
    except Exception:
        return 0.0

def _int(x: Any) -> int:
    try:
        return int(x or 0)
    except Exception:
        return 0

def _fmt_money(x: Any) -> str:
    return f"${_flt(x):,.2f}"

def _fmt_int(x: Any) -> str:
    return f"{_int(x):,}"

def _fmt_pct(x: Any) -> str:
    return f"{_flt(x):.1f}%"

def _safe_str(x: Any) -> str:
    return "" if x is None else str(x)

def _date_str(d) -> str:
    try:
        return d.strftime("%Y-%m-%d")
    except Exception:
        return str(d or "")

def _local_now_str() -> str:
    try:
        return timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _local_datetime_bounds(d1: date, d2: date) -> tuple[datetime, datetime]:
    """
    Convierte un rango de fechas locales [d1, d2] a rango datetime aware:
    [d1 00:00:00 local, d2+1 00:00:00 local).
    Evita sesgos por UTC al filtrar DateTimeField (ej. creado_en).
    """
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(d1, time.min), tz)
    end = timezone.make_aware(datetime.combine(d2 + timedelta(days=1), time.min), tz)
    return start, end


# ═══════════════════════════════════════════════════════════════════════════
# RESOLUCIÓN DE RANGO
# ═══════════════════════════════════════════════════════════════════════════

def _resolve_week_range(
    bodega_id: int,
    temporada_id: int,
    iso_semana: Optional[str],
    semana_id: Optional[int],
) -> tuple[date, date, str]:
    if semana_id:
        d1, d2, code = rango_por_semana_id(semana_id)
        return d1, d2, code or iso_week_code(d1)

    if not iso_semana:
        raise ValueError("Se requiere 'semana_id' o 'iso_semana' para aggregates_for_semana")

    parts = iso_semana.split("-W")
    year = int(parts[0])
    week = int(parts[1])
    d1 = date.fromisocalendar(year, week, 1)
    d2 = date.fromisocalendar(year, week, 7)
    return d1, d2, iso_semana


# ═══════════════════════════════════════════════════════════════════════════
# AGGREGATES: REPORTE SEMANAL
# ═══════════════════════════════════════════════════════════════════════════

def aggregates_for_semana(
    bodega_id: int,
    temporada_id: int,
    iso_semana: Optional[str] = None,
    semana_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Genera un reporte JSON rico para una semana operativa de bodega.
    Incluye: recepciones, empaques, camiones, gastos, KPIs y series.
    """
    d1, d2, etiqueta_iso = _resolve_week_range(bodega_id, temporada_id, iso_semana, semana_id)

    # Contexto de bodega/temporada
    bodega = Bodega.objects.filter(pk=bodega_id).first()
    temporada = TemporadaBodega.objects.filter(pk=temporada_id).first()
    bodega_nombre = _safe_str(getattr(bodega, "nombre", ""))
    temporada_anio = getattr(temporada, "anio", getattr(temporada, "a\u00f1o", ""))

    # ── 1. RECEPCIONES ──────────────────────────────────────────────────
    recepciones_qs = Recepcion.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha__range=(d1, d2),
        is_active=True,
    )
    recepciones_count = recepciones_qs.count()
    total_cajas_campo = recepciones_qs.aggregate(t=Sum("cajas_campo"))["t"] or 0

    # Recepciones por tipo de mango
    rec_por_tipo = (
        recepciones_qs
        .values("tipo_mango")
        .annotate(total_cajas=Sum("cajas_campo"), conteo=Count("id"))
        .order_by("-total_cajas")
    )
    tabla_recepciones = {
        "columns": ["Tipo de Mango", "Recepciones", "Cajas Campo"],
        "rows": [
            [r["tipo_mango"], _fmt_int(r["conteo"]), _fmt_int(r["total_cajas"])]
            for r in rec_por_tipo
        ],
    }

    # Recepciones por día (para series)
    rec_por_dia = (
        recepciones_qs
        .values("fecha")
        .annotate(cajas=Sum("cajas_campo"))
        .order_by("fecha")
    )
    serie_recepciones = [
        {"x": _date_str(r["fecha"]), "y": _int(r["cajas"])}
        for r in rec_por_dia
    ]

    # ── 2. CLASIFICACIÓN / EMPAQUES ──────────────────────────────────────
    clasif_qs = ClasificacionEmpaque.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha__range=(d1, d2),
        is_active=True,
    )
    clasif_agg = (
        clasif_qs
        .values("material", "calidad")
        .annotate(cajas=Sum("cantidad_cajas"))
        .order_by("material", "calidad")
    )
    total_empacado = sum(_int(c["cajas"]) for c in clasif_agg)

    # Salidas por camión para cruzar con empaques
    salidas_camion = (
        CamionConsumoEmpaque.objects.filter(
            camion__bodega_id=bodega_id,
            camion__temporada_id=temporada_id,
            camion__fecha_salida__range=(d1, d2),
            is_active=True,
        )
        .values("clasificacion_empaque__material", "clasificacion_empaque__calidad")
        .annotate(total=Sum("cantidad"))
    )
    despachado_map = {}
    total_despachado = 0
    for s in salidas_camion:
        key = (s["clasificacion_empaque__material"], s["clasificacion_empaque__calidad"])
        val = _int(s["total"])
        despachado_map[key] = val
        total_despachado += val

    # Tabla de empaques cruzada con despachos
    report_map = {}
    for c in clasif_agg:
        key = (c["material"], c["calidad"])
        report_map[key] = {"prod": _int(c["cajas"]), "desp": 0}
    for key, val in despachado_map.items():
        if key not in report_map:
            report_map[key] = {"prod": 0, "desp": 0}
        report_map[key]["desp"] += val

    empaques_rows = sorted(
        [
            {
                "material": k[0], "calidad": k[1],
                "producido": v["prod"], "despachado": v["desp"],
                "saldo": v["prod"] - v["desp"],
            }
            for k, v in report_map.items()
        ],
        key=lambda x: (x["material"], x["calidad"]),
    )

    tabla_empaques = {
        "columns": ["Material", "Calidad", "Producido", "Despachado", "Saldo"],
        "rows": [
            [r["material"], r["calidad"], _fmt_int(r["producido"]), _fmt_int(r["despachado"]), _fmt_int(r["saldo"])]
            for r in empaques_rows
        ],
    }

    # Empaques por día (serie)
    emp_por_dia = (
        clasif_qs
        .values("fecha")
        .annotate(cajas=Sum("cantidad_cajas"))
        .order_by("fecha")
    )
    serie_empaques = [
        {"x": _date_str(e["fecha"]), "y": _int(e["cajas"])}
        for e in emp_por_dia
    ]

    # Distribución por calidad (pie)
    dist_calidad = [
        {"name": f"{r['material']}-{r['calidad']}", "value": r["producido"]}
        for r in empaques_rows
        if r["producido"] > 0
    ]

    # ── 3. CAMIONES DE SALIDA ────────────────────────────────────────────
    camiones_qs = CamionSalida.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha_salida__range=(d1, d2),
        is_active=True,
    )
    camiones_count = camiones_qs.count()
    camiones_confirmados = camiones_qs.filter(estado="CONFIRMADO").count()

    tabla_camiones = {
        "columns": ["#", "Folio", "Estado", "Fecha", "Destino", "Chofer", "Cajas"],
        "rows": [],
    }
    for cam in camiones_qs.order_by("numero"):
        total_carga = cam.cargas.aggregate(t=Sum("cantidad"))["t"] or 0
        tabla_camiones["rows"].append([
            _safe_str(cam.numero or "S/N"),
            _safe_str(cam.folio or "—"),
            _safe_str(cam.estado),
            _date_str(cam.fecha_salida),
            _safe_str(cam.destino or "—"),
            _safe_str(cam.chofer or "—"),
            _fmt_int(total_carga),
        ])

    # ── 4. GASTOS OPERATIVOS ─────────────────────────────────────────────
    compras_dt_from, compras_dt_to = _local_datetime_bounds(d1, d2)
    compras_madera_qs = CompraMadera.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        creado_en__gte=compras_dt_from,
        creado_en__lt=compras_dt_to,
        is_active=True,
    )
    compras_total = _flt(compras_madera_qs.aggregate(t=Sum("monto_total"))["t"])
    compras_cajas = _flt(compras_madera_qs.aggregate(t=Sum("cantidad_cajas"))["t"])

    consumibles_qs = Consumible.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha__range=(d1, d2),
        is_active=True,
    )
    consumibles_total = _flt(consumibles_qs.aggregate(t=Sum("total"))["t"])
    gasto_total_semana = compras_total + consumibles_total

    tabla_gastos = {
        "columns": ["Concepto", "Cantidad", "Costo Unitario", "Total"],
        "rows": [],
    }
    for cm in compras_madera_qs.order_by("-creado_en"):
        tabla_gastos["rows"].append([
            f"🪵 Madera — {_safe_str(cm.proveedor_nombre)}",
            _fmt_int(cm.cantidad_cajas),
            _fmt_money(cm.precio_unitario),
            _fmt_money(cm.monto_total),
        ])
    for con in consumibles_qs.order_by("-fecha"):
        tabla_gastos["rows"].append([
            f"📦 {_safe_str(con.concepto)}",
            _fmt_int(con.cantidad),
            _fmt_money(con.costo_unitario),
            _fmt_money(con.total),
        ])

    # ── 5. EFICIENCIA / MERMA ────────────────────────────────────────────
    eficiencia = (_flt(total_empacado) / _flt(total_cajas_campo) * 100) if total_cajas_campo > 0 else 0.0

    # ── KPIs ─────────────────────────────────────────────────────────────
    kpis = [
        {"id": "recepciones",       "label": "Recepciones",           "value": _fmt_int(recepciones_count), "icon": "📥"},
        {"id": "cajas_campo",       "label": "Cajas de Campo",        "value": _fmt_int(total_cajas_campo), "icon": "🥭"},
        {"id": "cajas_empacadas",   "label": "Cajas Empacadas",       "value": _fmt_int(total_empacado),    "icon": "📦"},
        {"id": "cajas_despachadas", "label": "Cajas Despachadas",     "value": _fmt_int(total_despachado),  "icon": "🚛"},
        {"id": "camiones",          "label": "Camiones Salida",       "value": _fmt_int(camiones_count),    "icon": "🚚"},
        {"id": "eficiencia",        "label": "Eficiencia Empaque",    "value": _fmt_pct(eficiencia),        "icon": "📊"},
        {"id": "gasto_madera",      "label": "Gasto en Madera",       "value": _fmt_money(compras_total),   "icon": "🪵"},
        {"id": "gasto_consumibles", "label": "Gasto en Consumibles",  "value": _fmt_money(consumibles_total), "icon": "🧹"},
        {"id": "gasto_total",       "label": "Gasto Total Semana",    "value": _fmt_money(gasto_total_semana), "icon": "💰"},
    ]

    # ── Series ───────────────────────────────────────────────────────────
    series = [
        {"id": "recepciones_dia",    "label": "Recepciones por Día",  "type": "bar",  "data": serie_recepciones},
        {"id": "empaques_dia",       "label": "Empaques por Día",     "type": "line", "data": serie_empaques},
        {"id": "dist_calidad",       "label": "Distribución Calidad", "type": "pie",  "data": dist_calidad},
    ]

    return {
        "metadata": {
            "tipo": "semanal_bodega",
            "bodega": {"id": bodega_id, "nombre": bodega_nombre},
            "temporada": {"id": temporada_id, "anio": temporada_anio},
            "fecha_generacion": _local_now_str(),
        },
        "rango": {"desde": d1.isoformat(), "hasta": d2.isoformat(), "iso": etiqueta_iso},
        "kpis": kpis,
        "tablas": {
            "recepciones": tabla_recepciones,
            "empaques": tabla_empaques,
            "camiones": tabla_camiones,
            "gastos": tabla_gastos,
        },
        "series": series,
        "totales": {
            "recepciones": recepciones_count,
            "cajas_campo": _int(total_cajas_campo),
            "cajas_empacadas": total_empacado,
            "cajas_despachadas": total_despachado,
            "camiones": camiones_count,
            "camiones_confirmados": camiones_confirmados,
            "eficiencia_empaque": _flt(eficiencia),
            "gasto_madera": compras_total,
            "gasto_consumibles": consumibles_total,
            "gasto_total": gasto_total_semana,
            "compras_cajas_madera": _flt(compras_cajas),
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
# AGGREGATES: REPORTE DE TEMPORADA
# ═══════════════════════════════════════════════════════════════════════════

def aggregates_for_temporada(bodega_id: int, temporada_id: int) -> Dict[str, Any]:
    """Consolidado de temporada completa para la bodega."""
    bodega = Bodega.objects.filter(pk=bodega_id).first()
    temporada = TemporadaBodega.objects.filter(pk=temporada_id).first()
    bodega_nombre = _safe_str(getattr(bodega, "nombre", ""))
    temporada_anio = getattr(temporada, "anio", getattr(temporada, "a\u00f1o", ""))

    # Recepciones totales de temporada
    rec_qs = Recepcion.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, is_active=True)
    total_recepciones = rec_qs.count()
    total_cajas_campo = _int(rec_qs.aggregate(t=Sum("cajas_campo"))["t"])

    # Clasificaciones
    clasif = (
        ClasificacionEmpaque.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, is_active=True)
        .values("material", "calidad")
        .annotate(cajas=Sum("cantidad_cajas"))
        .order_by("material", "calidad")
    )
    total_empacado = sum(_int(c["cajas"]) for c in clasif)

    # Camiones
    camiones_count = CamionSalida.objects.filter(
        bodega_id=bodega_id, temporada_id=temporada_id, is_active=True
    ).count()
    total_despachado = _int(
        CamionConsumoEmpaque.objects.filter(
            camion__bodega_id=bodega_id, camion__temporada_id=temporada_id, is_active=True
        ).aggregate(t=Sum("cantidad"))["t"]
    )

    # Gastos
    compras_total = _flt(
        CompraMadera.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, is_active=True)
        .aggregate(t=Sum("monto_total"))["t"]
    )
    consumibles_total = _flt(
        Consumible.objects.filter(bodega_id=bodega_id, temporada_id=temporada_id, is_active=True)
        .aggregate(t=Sum("total"))["t"]
    )
    gasto_total = compras_total + consumibles_total
    eficiencia = (_flt(total_empacado) / _flt(total_cajas_campo) * 100) if total_cajas_campo > 0 else 0.0

    # Semanas operadas
    semanas_qs = CierreSemanal.objects.filter(
        bodega_id=bodega_id, temporada_id=temporada_id, is_active=True
    ).order_by("fecha_desde")
    semanas_count = semanas_qs.count()

    # Tabla comparativa por semana
    tabla_por_semana = {
        "columns": ["Semana", "Período", "Recepciones", "Empacado", "Despachado", "Gasto"],
        "rows": [],
    }
    for sem in semanas_qs:
        sd1 = sem.fecha_desde
        sd2 = sem.fecha_hasta or (sd1 + timedelta(days=6))
        s_rec = _int(Recepcion.objects.filter(
            bodega_id=bodega_id, temporada_id=temporada_id,
            fecha__range=(sd1, sd2), is_active=True,
        ).aggregate(t=Sum("cajas_campo"))["t"])
        s_emp = _int(ClasificacionEmpaque.objects.filter(
            bodega_id=bodega_id, temporada_id=temporada_id,
            fecha__range=(sd1, sd2), is_active=True,
        ).aggregate(t=Sum("cantidad_cajas"))["t"])
        s_desp = _int(CamionConsumoEmpaque.objects.filter(
            camion__bodega_id=bodega_id, camion__temporada_id=temporada_id,
            camion__fecha_salida__range=(sd1, sd2), is_active=True,
        ).aggregate(t=Sum("cantidad"))["t"])
        sem_dt_from, sem_dt_to = _local_datetime_bounds(sd1, sd2)
        s_gasto = _flt(
            (CompraMadera.objects.filter(
                bodega_id=bodega_id, temporada_id=temporada_id,
                creado_en__gte=sem_dt_from, creado_en__lt=sem_dt_to, is_active=True,
            ).aggregate(t=Sum("monto_total"))["t"] or 0)
            + (Consumible.objects.filter(
                bodega_id=bodega_id, temporada_id=temporada_id,
                fecha__range=(sd1, sd2), is_active=True,
            ).aggregate(t=Sum("total"))["t"] or 0)
        )
        label = sem.iso_semana or iso_week_code(sd1)
        tabla_por_semana["rows"].append([
            label,
            f"{_date_str(sd1)} → {_date_str(sd2)}",
            _fmt_int(s_rec), _fmt_int(s_emp), _fmt_int(s_desp), _fmt_money(s_gasto),
        ])

    tabla_clasif = {
        "columns": ["Material", "Calidad", "Cajas"],
        "rows": [[c["material"], c["calidad"], _fmt_int(c["cajas"])] for c in clasif],
    }

    kpis = [
        {"id": "semanas",           "label": "Semanas Operadas",      "value": _fmt_int(semanas_count),      "icon": "📅"},
        {"id": "recepciones",       "label": "Total Recepciones",     "value": _fmt_int(total_recepciones),  "icon": "📥"},
        {"id": "cajas_campo",       "label": "Cajas de Campo",        "value": _fmt_int(total_cajas_campo),  "icon": "🥭"},
        {"id": "cajas_empacadas",   "label": "Cajas Empacadas",       "value": _fmt_int(total_empacado),     "icon": "📦"},
        {"id": "cajas_despachadas", "label": "Cajas Despachadas",     "value": _fmt_int(total_despachado),   "icon": "🚛"},
        {"id": "camiones",          "label": "Camiones Salida",       "value": _fmt_int(camiones_count),     "icon": "🚚"},
        {"id": "eficiencia",        "label": "Eficiencia Empaque",    "value": _fmt_pct(eficiencia),         "icon": "📊"},
        {"id": "gasto_madera",      "label": "Gasto en Madera",       "value": _fmt_money(compras_total),    "icon": "🪵"},
        {"id": "gasto_consumibles", "label": "Gasto Consumibles",     "value": _fmt_money(consumibles_total), "icon": "🧹"},
        {"id": "gasto_total",       "label": "Gasto Total",           "value": _fmt_money(gasto_total),      "icon": "💰"},
    ]

    # Distribución pie
    dist = [{"name": f"{c['material']}-{c['calidad']}", "value": _int(c["cajas"])} for c in clasif if _int(c["cajas"]) > 0]

    return {
        "metadata": {
            "tipo": "temporada_bodega",
            "bodega": {"id": bodega_id, "nombre": bodega_nombre},
            "temporada": {"id": temporada_id, "anio": temporada_anio},
            "fecha_generacion": _local_now_str(),
        },
        "kpis": kpis,
        "tablas": {
            "clasificacion": tabla_clasif,
            "por_semana": tabla_por_semana,
        },
        "series": [
            {"id": "dist_material_calidad", "label": "Distribución Material/Calidad", "type": "pie", "data": dist},
        ],
        "totales": {
            "semanas": semanas_count,
            "recepciones": total_recepciones,
            "cajas_campo": total_cajas_campo,
            "cajas_empacadas": total_empacado,
            "cajas_despachadas": total_despachado,
            "camiones": camiones_count,
            "eficiencia_empaque": _flt(eficiencia),
            "gasto_madera": compras_total,
            "gasto_consumibles": consumibles_total,
            "gasto_total": gasto_total,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
# SERIES (COMPAT)
# ═══════════════════════════════════════════════════════════════════════════

def series_for_temporada(bodega_id: int, temporada_id: int) -> List[Dict[str, Any]]:
    data = aggregates_for_temporada(bodega_id, temporada_id)
    return data.get("series", [])


# ═══════════════════════════════════════════════════════════════════════════
# GENERADOR PDF (WeasyPrint)
# ═══════════════════════════════════════════════════════════════════════════

# Logo corporativo (SVG embebido en base64)
_LOGO_B64 = (
    "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyZTdkMzIiLz48dGV4dCB4PSI2MCIgeT0iMjUiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlJpc29sPC90ZXh0Pjwvc3ZnPg=="
)
_LOGO_DATA_URI = "data:image/svg+xml;base64," + _LOGO_B64


def _base_css() -> str:
    return r"""
    @page {
      size: A4;
      margin: 18mm 14mm;
      @bottom-left  { content: "Agroproductores Risol — Confidencial"; font-size: 9px; color: #6b7280; }
      @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 9px; color: #6b7280; }
    }
    :root {
      --bg: #f7f9fc; --paper: #ffffff;
      --primary: #1a472a; --secondary: #2e6b87; --accent: #d4af37;
      --text: #0f172a; --muted: #6b7280; --border: #e5e7eb;
      --success: #16a34a; --danger: #dc2626; --warning: #f59e0b;
      --shadow: 0 8px 24px rgba(0,0,0,0.06);
      --radius: 12px; --radius-lg: 18px;
      --grad: linear-gradient(135deg, #1a472a, #2e6b87);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: var(--text); background: var(--bg);
      font-size: 12px; line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .wrapper {
      background: var(--paper); border: 1px solid var(--border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden;
    }
    /* Header */
    .header {
      padding: 28px 32px 24px; color: #fff; background: var(--grad);
      position: relative; overflow: hidden;
    }
    .header::after {
      content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px;
      background: rgba(255,255,255,0.04); border-radius: 50%;
    }
    .header .logo { position: absolute; top: 24px; right: 28px; height: 36px; }
    .header .title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header .subtitle { font-size: 14px; opacity: .9; margin-top: 4px; }
    .header .meta {
      display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;
    }
    .badge {
      display: inline-block; padding: 5px 12px;
      background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
      border-radius: 999px; font-size: 11px; font-weight: 600;
    }
    /* Content */
    .content { padding: 24px 28px; }
    .section-title {
      font-size: 16px; font-weight: 800; color: var(--primary);
      margin: 20px 0 12px; padding-bottom: 8px;
      border-bottom: 2px solid var(--border);
      page-break-after: avoid;
    }
    .section-subtitle { font-size: 13px; font-weight: 700; margin: 0 0 8px; color: var(--secondary); }
    /* KPI grid */
    .kpi-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 10px 0 20px;
    }
    .kpi-card {
      border: 1px solid var(--border); border-radius: var(--radius);
      padding: 14px 16px; background: linear-gradient(160deg, #ffffff, #f8fafc);
      page-break-inside: avoid;
    }
    .kpi-icon { font-size: 20px; margin-bottom: 4px; }
    .kpi-label { font-size: 10px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 20px; font-weight: 800; color: var(--primary); margin-top: 2px; }
    /* Tables */
    .table-block { margin: 14px 0; page-break-inside: avoid; }
    table.data-table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      border: 1px solid var(--border); border-radius: var(--radius);
      overflow: hidden; font-size: 11px; background: #fff;
    }
    .data-table thead th {
      background: #f1f5f9; color: var(--text); text-align: left;
      font-weight: 700; padding: 10px 12px; border-bottom: 1px solid var(--border);
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .data-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
    .data-table tbody tr:nth-child(even) td { background: #fafbff; }
    .data-table tbody tr:hover td { background: #f0f7ff; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .txt-left { text-align: left; }
    /* Distribution bars */
    .dist-container { display: grid; gap: 8px; margin: 8px 0; }
    .dist-row { display: grid; grid-template-columns: 120px 1fr auto; gap: 10px; align-items: center; }
    .dist-name { font-weight: 600; font-size: 11px; }
    .dist-bar { height: 8px; background: #eef2ff; border-radius: 999px; overflow: hidden; }
    .dist-fill { height: 100%; background: var(--grad); border-radius: 999px; }
    .dist-val { font-size: 11px; color: var(--muted); white-space: nowrap; }
    /* Footer */
    .footer {
      padding: 16px 28px; border-top: 1px solid var(--border);
      font-size: 10px; color: var(--muted); text-align: center;
      background: #fafbfc;
    }
    """


def _kpi_cards_html(kpis: List[Dict[str, str]]) -> str:
    items = []
    for k in kpis:
        icon = html_escape(str(k.get("icon", "")))
        label = html_escape(str(k.get("label", "")))
        value = html_escape(str(k.get("value", "")))
        items.append(f"""
        <div class="kpi-card">
            <div class="kpi-icon">{icon}</div>
            <div class="kpi-label">{label}</div>
            <div class="kpi-value">{value}</div>
        </div>
        """)
    return f'<section class="kpi-grid">{"".join(items)}</section>'


def _table_html(title: str, table: Dict[str, Any]) -> str:
    cols = table.get("columns", [])
    rows = table.get("rows", [])
    if not rows:
        return f'<div class="table-block"><h3 class="section-subtitle">{html_escape(title)}</h3><p style="color:var(--muted);font-size:11px;">Sin datos registrados.</p></div>'

    thead = "".join(f"<th>{html_escape(str(c))}</th>" for c in cols)
    trows = []
    for r in rows:
        tds = "".join(f"<td>{html_escape(str(c))}</td>" for c in r)
        trows.append(f"<tr>{tds}</tr>")
    tbody = "".join(trows)

    return f"""
    <div class="table-block">
      <h3 class="section-subtitle">{html_escape(title)}</h3>
      <table class="data-table">
        <thead><tr>{thead}</tr></thead>
        <tbody>{tbody}</tbody>
      </table>
    </div>
    """


def _dist_bars_html(title: str, data: List[Dict[str, Any]]) -> str:
    if not data:
        return ""
    total = sum(_flt(x.get("value", 0)) for x in data) or 1.0
    rows = []
    for x in data:
        name = html_escape(str(x.get("name", "")))
        val = _flt(x.get("value", 0))
        pct = (val / total) * 100.0
        rows.append(f"""
          <div class="dist-row">
            <div class="dist-name">{name}</div>
            <div class="dist-bar"><div class="dist-fill" style="width:{pct:.1f}%"></div></div>
            <div class="dist-val">{_fmt_int(val)} <span style="color:var(--muted)">({pct:.1f}%)</span></div>
          </div>
        """)
    return f"""
    <div class="table-block">
      <h3 class="section-subtitle">{html_escape(title)}</h3>
      <div class="dist-container">{"".join(rows)}</div>
    </div>
    """


def render_semana_pdf_from_data(reporte_data: Dict[str, Any]) -> bytes:
    """Genera un PDF profesional para el reporte semanal usando WeasyPrint (o ReportLab fallback)."""
    meta = reporte_data.get("metadata", {})
    rango = reporte_data.get("rango", {})
    kpis = reporte_data.get("kpis", [])
    tablas = reporte_data.get("tablas", {})
    series = reporte_data.get("series", [])
    bodega_nombre = meta.get("bodega", {}).get("nombre", "Bodega")
    temporada_anio = meta.get("temporada", {}).get("anio", "")
    iso = rango.get("iso", "")
    desde = rango.get("desde", "")
    hasta = rango.get("hasta", "")
    fecha_gen = meta.get("fecha_generacion", _local_now_str())
    
    try:
        from weasyprint import HTML
    except Exception as e:
        # Fallback a ReportLab si WeasyPrint no funca en Windows
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        story.append(Paragraph("Reporte Semanal de Bodega (Fallback)", styles['Title']))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Bodega: {bodega_nombre} | Temporada: {temporada_anio}", styles['Normal']))
        story.append(Paragraph(f"Período: {desde} a {hasta}", styles['Normal']))
        story.append(Spacer(1, 24))
        story.append(Paragraph("WeasyPrint no esta disponible completamente en este entorno. Se uso un render alterno. Para el PDF completo, instala las dependencias nativas de WeasyPrint o usa Linux/WSL/Docker.", styles['Italic']))
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    # Buscar serie tipo 'pie' para distribución
    dist_data = []
    for s in series:
        if s.get("type") == "pie":
            dist_data = s.get("data", [])
            break

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>{_base_css()}</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <img src="{_LOGO_DATA_URI}" alt="Logo" class="logo">
    <div class="title">Reporte Semanal de Bodega</div>
    <div class="subtitle">{html_escape(bodega_nombre)} — Temporada {html_escape(str(temporada_anio))}</div>
    <div class="meta">
      <span class="badge">{html_escape(iso)}</span>
      <span class="badge">{html_escape(str(desde))} → {html_escape(str(hasta))}</span>
      <span class="badge">Generado: {html_escape(fecha_gen)}</span>
    </div>
  </div>
  <div class="content">
    <h2 class="section-title">Indicadores Clave</h2>
    {_kpi_cards_html(kpis)}

    <h2 class="section-title">Recepciones de Mango</h2>
    {_table_html("Recepciones por Tipo de Mango", tablas.get("recepciones", {}))}

    <h2 class="section-title">Producción — Empaques</h2>
    {_table_html("Clasificación por Material y Calidad", tablas.get("empaques", {}))}
    {_dist_bars_html("Distribución de Producción", dist_data)}

    <h2 class="section-title">Embarques — Camiones de Salida</h2>
    {_table_html("Detalle de Camiones", tablas.get("camiones", {}))}

    <h2 class="section-title">Gastos Operativos</h2>
    {_table_html("Detalle de Gastos Semanales", tablas.get("gastos", {}))}
  </div>
  <div class="footer">
    Agroproductores Risol — Reporte generado automáticamente el {html_escape(fecha_gen)}
  </div>
</div>
</body>
</html>"""

    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes


def render_temporada_pdf_from_data(reporte_data: Dict[str, Any]) -> bytes:
    """Genera un PDF profesional para el reporte de temporada usando WeasyPrint (o ReportLab fallback)."""
    meta = reporte_data.get("metadata", {})
    kpis = reporte_data.get("kpis", [])
    tablas = reporte_data.get("tablas", {})
    series = reporte_data.get("series", [])
    bodega_nombre = meta.get("bodega", {}).get("nombre", "Bodega")
    temporada_anio = meta.get("temporada", {}).get("anio", "")
    fecha_gen = meta.get("fecha_generacion", _local_now_str())

    try:
        from weasyprint import HTML
    except Exception as e:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        story.append(Paragraph("Reporte de Temporada de Bodega (Fallback)", styles['Title']))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Bodega: {bodega_nombre} | Temporada: {temporada_anio}", styles['Normal']))
        story.append(Spacer(1, 24))
        story.append(Paragraph("WeasyPrint no esta disponible completamente en este entorno. Se uso un render alterno. Para el PDF completo, instala las dependencias nativas de WeasyPrint o usa Linux/WSL/Docker.", styles['Italic']))
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    dist_data = []
    for s in series:
        if s.get("type") == "pie":
            dist_data = s.get("data", [])
            break

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>{_base_css()}</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <img src="{_LOGO_DATA_URI}" alt="Logo" class="logo">
    <div class="title">Reporte de Temporada — Bodega</div>
    <div class="subtitle">{html_escape(bodega_nombre)} — Temporada {html_escape(str(temporada_anio))}</div>
    <div class="meta">
      <span class="badge">Generado: {html_escape(fecha_gen)}</span>
    </div>
  </div>
  <div class="content">
    <h2 class="section-title">Indicadores Clave de Temporada</h2>
    {_kpi_cards_html(kpis)}

    <h2 class="section-title">Clasificación Acumulada</h2>
    {_table_html("Empaques por Material y Calidad", tablas.get("clasificacion", {}))}
    {_dist_bars_html("Distribución de Producción", dist_data)}

    <h2 class="section-title">Comparativo Semanal</h2>
    {_table_html("Desempeño por Semana", tablas.get("por_semana", {}))}
  </div>
  <div class="footer">
    Agroproductores Risol — Reporte generado automáticamente el {html_escape(fecha_gen)}
  </div>
</div>
</body>
</html>"""

    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes


