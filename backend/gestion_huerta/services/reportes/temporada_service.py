# -*- coding: utf-8 -*-
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError, PermissionDenied
from django.db.models import Prefetch, Sum, F
from django.utils import timezone

from gestion_huerta.models import Temporada, Cosecha, InversionesHuerta, Venta
from gestion_huerta.services.exportacion_service import ExportacionService
from gestion_huerta.services.reportes.cosecha_service import (
    generar_reporte_cosecha, D as D_c, Flt as Flt_c, I as I_c, safe_str as safe_str_c
)
from gestion_huerta.utils.cache_keys import (
    REPORTES_CACHE_TIMEOUT,
    REPORTES_CACHE_VERSION,
    generate_cache_key,
)

# ========= Utilidades locales (copiadas para consistencia) =========
TWOPLACES = Decimal("0.01")

def D(x: Any) -> Decimal:
    try:
        if x is None:
            return Decimal("0")
        return Decimal(str(x))
    except Exception:
        return Decimal("0")

def Flt(x: Any) -> float:
    try:
        return float(D(x).quantize(TWOPLACES, rounding=ROUND_HALF_UP))
    except Exception:
        return 0.0

def I(x: Any) -> int:
    try:
        return int(D(x))
    except Exception:
        return 0

def safe_str(x: Any) -> str:
    return "" if x is None else str(x)

def _date_only(dt) -> Optional[str]:
    if not dt:
        return None
    try:
        return dt.strftime("%Y-%m-%d")
    except Exception:
        s = str(dt)
        return s.split("T", 1)[0] if s else None

def _group_by_date(items: List[Dict[str, Any]], date_key: str, value_key: str) -> List[Dict[str, Any]]:
    bucket: Dict[str, Decimal] = {}
    for it in items:
        f = it.get(date_key)
        v = D(it.get(value_key))
        if not f:
            continue
        bucket[f] = bucket.get(f, Decimal("0")) + v
    return [{"fecha": k, "valor": Flt(v)} for k, v in sorted(bucket.items())]

def _validar_permisos_temporada(usuario, temporada) -> bool:
    if getattr(usuario, "is_superuser", False) or getattr(usuario, "is_staff", False):
        return True
    return hasattr(usuario, "has_perm") and usuario.has_perm("gestion_huerta.view_temporada")

def _analizar_categorias_inversiones(inversiones_qs, total_inversiones: Decimal) -> List[Dict[str, Any]]:
    if total_inversiones <= 0:
        return []
    acc: Dict[str, Decimal] = {}
    for inv in inversiones_qs:
        nombre = safe_str(getattr(getattr(inv, "categoria", None), "nombre", "Sin categoría"))
        total = D(inv.gastos_insumos) + D(inv.gastos_mano_obra)
        acc[nombre] = acc.get(nombre, Decimal("0")) + total
    out = []
    for k, v in sorted(acc.items(), key=lambda x: x[1], reverse=True):
        porc = (v / total_inversiones * Decimal(100)) if total_inversiones > 0 else Decimal(0)
        out.append({"categoria": k, "total": Flt(v), "porcentaje": Flt(porc)})
    return out

def _analizar_variedades_ventas(ventas_qs, total_ventas: Decimal) -> List[Dict[str, Any]]:
    if total_ventas <= 0:
        return []
    acc: Dict[str, Dict[str, Any]] = {}
    for v in ventas_qs:
        variedad = safe_str(getattr(v, "tipo_mango", "Sin variedad")) or "Sin variedad"
        ingreso = D(v.precio_por_caja) * D(v.num_cajas)
        data = acc.get(variedad) or {"total_cajas": 0, "total_venta": Decimal("0"), "precios": []}
        data["total_cajas"] += I(v.num_cajas)
        data["total_venta"] = data["total_venta"] + ingreso
        data["precios"].append(D(v.precio_por_caja))
        acc[variedad] = data
    out = []
    for variedad, d in acc.items():
        prom = (sum(d["precios"], Decimal("0")) / D(len(d["precios"]))) if d["precios"] else Decimal("0")
        out.append(
            {
                "variedad": variedad,
                "total_cajas": int(d["total_cajas"]),
                "precio_promedio": Flt(prom),
                "total_venta": Flt(d["total_venta"]),
                "porcentaje": Flt((d["total_venta"] / total_ventas * Decimal(100)) if total_ventas > 0 else Decimal(0)),
            }
        )
    return sorted(out, key=lambda x: x["total_venta"], reverse=True)

def _build_ui_from_temporada(
    rep: Dict[str, Any],
    detalle_inversiones_all: List[Dict[str, Any]],
    detalle_ventas_all: List[Dict[str, Any]],
) -> Dict[str, Any]:
    re = rep.get("resumen_ejecutivo", {}) or {}
    kpis = [
        {"label": "Inversión Total", "value": re.get("inversion_total", 0.0), "format": "currency"},
        {"label": "Ventas Totales", "value": re.get("ventas_totales", 0.0), "format": "currency"},
        {"label": "Ganancia Neta", "value": re.get("ganancia_neta", 0.0), "format": "currency"},
        {"label": "ROI Temporada", "value": re.get("roi_temporada", 0.0), "format": "percentage"},
        {"label": "Productividad (cajas/ha)", "value": re.get("productividad", 0.0), "format": "number"},
        {"label": "Cajas Totales", "value": rep.get("resumen_ejecutivo", {}).get("cajas_totales", 0), "format": "number"},
    ]
    series_inv = _group_by_date(detalle_inversiones_all, "fecha", "total")
    series_ven = _group_by_date(detalle_ventas_all, "fecha", "total_venta")
    series_gan = _group_by_date(
        [{"fecha": v.get("fecha"), "valor": Flt(D(v.get("total_venta")) - D(v.get("gasto")))} for v in detalle_ventas_all],
        "fecha",
        "valor",
    )
    tablas = {
        "inversiones": [
            {
                "id": it.get("id"),
                "fecha": it.get("fecha"),
                "categoria": it.get("categoria"),
                "descripcion": it.get("descripcion"),
                "monto": it.get("total"),
            }
            for it in detalle_inversiones_all
        ],
        "ventas": [
            {
                "id": it.get("id"),
                "fecha": it.get("fecha"),
                "cantidad": it.get("num_cajas"),
                "precio_unitario": it.get("precio_por_caja"),
                "total": it.get("total_venta"),
            }
            for it in detalle_ventas_all
        ],
        "comparativo_cosechas": [
            {
                "cosecha": row.get("nombre"),
                "inversion": row.get("inversion"),
                "ventas": row.get("ventas"),
                "ganancia": row.get("ganancia"),
                "roi": row.get("roi"),
                "cajas": row.get("cajas"),
            }
            for row in rep.get("comparativo_cosechas", []) or []
        ],
    }
    return {"kpis": kpis, "series": {"inversiones": series_inv, "ventas": series_ven, "ganancias": series_gan}, "tablas": tablas}

def _validar_integridad_reporte(reporte_data: Dict[str, Any]) -> bool:
    try:
        # Para temporada aplicamos solo validaciones generales de fecha
        meta = reporte_data.get("metadata", {}) or {}
        fecha_str = meta.get("fecha_generacion")
        if fecha_str:
            if fecha_str.endswith("Z"):
                fecha_str = fecha_str[:-1] + "+00:00"
            dt = datetime.fromisoformat(fecha_str)
            if dt > timezone.now() + timedelta(minutes=5):
                raise ValidationError("Fecha de generación inválida")
        return True
    except Exception as e:
        raise ValidationError(f"Error en validación de integridad: {str(e)}")

# ========= API pública (TEMPORADA) =========
def generar_reporte_temporada(
    temporada_id: int,
    usuario,
    formato: str = "json",
    force_refresh: bool = False,
) -> Dict[str, Any]:
    cache_key = generate_cache_key("temporada", {"temporada_id": temporada_id, "formato": formato})
    if not force_refresh:
        cached = cache.get(cache_key)
        if cached:
            return cached

    try:
        temporada = (
            Temporada.objects.select_related(
                "huerta__propietario", "huerta_rentada__propietario", "huerta", "huerta_rentada"
            )
            .prefetch_related(
                Prefetch(
                    "cosechas",
                    queryset=Cosecha.objects.filter(is_active=True)
                    .select_related("huerta", "huerta_rentada", "temporada")
                    .prefetch_related(
                        Prefetch(
                            "inversiones",
                            queryset=InversionesHuerta.objects.filter(is_active=True).select_related("categoria"),
                        ),
                        Prefetch("ventas", queryset=Venta.objects.filter(is_active=True)),
                    ),
                )
            )
            .get(id=temporada_id)
        )
    except Temporada.DoesNotExist:
        raise ValidationError("Temporada no encontrada")

    if not _validar_permisos_temporada(usuario, temporada):
        raise PermissionDenied("Sin permisos para generar este reporte")

    cosechas = list(temporada.cosechas.all())
    origen = temporada.huerta or temporada.huerta_rentada
    origen_nombre = safe_str(getattr(origen, "nombre", None) or safe_str(origen)) if origen else "N/A"
    ubicacion = safe_str(getattr(origen, "ubicacion", "")) if origen else ""
    hectareas = D(getattr(origen, "hectareas", 0))

    total_inversiones = Decimal("0")
    total_ventas = Decimal("0")
    total_gastos_venta = Decimal("0")
    total_cajas = 0
    cosechas_data: List[Dict[str, Any]] = []

    detalle_inversiones_all: List[Dict[str, Any]] = []
    detalle_ventas_all: List[Dict[str, Any]] = []

    for c in cosechas:
        rep_c = generar_reporte_cosecha(c.id, usuario, "json", force_refresh=force_refresh)
        inv_c = D(rep_c["resumen_financiero"]["total_inversiones"])
        ven_c = D(rep_c["resumen_financiero"]["total_ventas"])
        gas_c = D(rep_c["resumen_financiero"]["total_gastos_venta"])
        gan_c = D(rep_c["resumen_financiero"]["ganancia_neta"])
        roi_c = D(rep_c["resumen_financiero"]["roi_porcentaje"])
        cajas_c = I(rep_c["metricas_rendimiento"]["cajas_totales"])

        cosechas_data.append(
            {
                "nombre": safe_str(c.nombre),
                "inversion": Flt(inv_c),
                "ventas": Flt(ven_c),
                "ganancia": Flt(gan_c),
                "roi": Flt(roi_c),
                "cajas": cajas_c,
            }
        )
        total_inversiones += inv_c
        total_ventas += ven_c
        total_gastos_venta += gas_c
        total_cajas += cajas_c

        detalle_inversiones_all.extend(rep_c.get("detalle_inversiones", []))
        detalle_ventas_all.extend(rep_c.get("detalle_ventas", []))

    ganancia_neta = total_ventas - total_gastos_venta - total_inversiones
    roi_temporada = (ganancia_neta / total_inversiones * Decimal(100)) if total_inversiones > 0 else Decimal(0)

    todas_inversiones = InversionesHuerta.objects.filter(temporada=temporada, is_active=True).select_related("categoria")
    todas_ventas = Venta.objects.filter(temporada=temporada, is_active=True)

    fi = _date_only(temporada.fecha_inicio)
    ff = _date_only(temporada.fecha_fin)
    periodo_txt = (f"{fi or ''} - {ff or ''}").strip()

    reporte: Dict[str, Any] = {
        "metadata": {
            "tipo": "temporada",
            "fecha_generacion": timezone.now().isoformat(),
            "generado_por": getattr(usuario, "username", safe_str(usuario)),
            "temporada_id": temporada.id,
            "version": REPORTES_CACHE_VERSION,
        },
        "informacion_general": {
            "huerta_nombre": origen_nombre,
            "huerta_tipo": "Rentada" if temporada.huerta_rentada_id else "Propia",
            "ubicacion": ubicacion,
            "propietario": safe_str(getattr(origen, "propietario", "")) if origen else "N/A",
            "temporada_año": getattr(temporada, "año", None),
            "periodo": periodo_txt,
            "fecha_inicio": fi,
            "fecha_fin": ff,
            "estado": "Finalizada" if getattr(temporada, "finalizada", False) else "Activa",
            "total_cosechas": len(cosechas_data),
            "hectareas": Flt(hectareas),
        },
        "resumen_ejecutivo": {
            "inversion_total": Flt(total_inversiones),
            "ventas_totales": Flt(total_ventas),
            "ganancia_neta": Flt(ganancia_neta),
            "roi_temporada": Flt(roi_temporada),
            "productividad": Flt(D(total_cajas) / hectareas) if hectareas > 0 else 0.0,
            "cajas_totales": total_cajas,
            "total_gastos_venta": Flt(total_gastos_venta),
        },
        "comparativo_cosechas": cosechas_data,
        "analisis_categorias": _analizar_categorias_inversiones(todas_inversiones, total_inversiones),
        "analisis_variedades": _analizar_variedades_ventas(todas_ventas, total_ventas),
        "metricas_eficiencia": {
            "costo_por_hectarea": Flt(total_inversiones / hectareas) if hectareas > 0 else 0.0,
            "ingreso_por_hectarea": Flt(total_ventas / hectareas) if hectareas > 0 else 0.0,
            "ganancia_por_hectarea": Flt(ganancia_neta / hectareas) if hectareas > 0 else 0.0,
            "cajas_por_hectarea": Flt(D(total_cajas) / hectareas) if hectareas > 0 else 0.0,
            "precio_promedio_caja": Flt(total_ventas / D(total_cajas)) if total_cajas > 0 else 0.0,
        },
    }

    reporte["ui"] = _build_ui_from_temporada(reporte, detalle_inversiones_all, detalle_ventas_all)
    _validar_integridad_reporte(reporte)

    cache.set(cache_key, reporte, REPORTES_CACHE_TIMEOUT)
    return reporte

def exportar_temporada(temporada_id: int, usuario, formato: str) -> bytes:
    rep = generar_reporte_temporada(temporada_id, usuario, "json", force_refresh=True)
    if formato.lower() == "pdf":
        return ExportacionService.generar_pdf_temporada(rep)
    if formato.lower() in ("excel", "xlsx"):
        return ExportacionService.generar_excel_temporada(rep)
    raise ValidationError("Formato no soportado para exportación")
