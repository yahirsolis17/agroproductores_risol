# -*- coding: utf-8 -*-
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError, PermissionDenied
from django.db.models import Prefetch, Sum, F
from django.utils import timezone

from gestion_huerta.models import Cosecha, InversionesHuerta, Venta
from gestion_huerta.services.exportacion_service import ExportacionService
from gestion_huerta.utils.cache_keys import (
    REPORTES_CACHE_TIMEOUT,
    REPORTES_CACHE_VERSION,
    generate_cache_key,
)

# ========= Utilidades numéricas/seguras =========
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

# ========= Permisos / análisis / validación =========
def _validar_permisos_cosecha(usuario, cosecha) -> bool:
    if getattr(usuario, "is_superuser", False) or getattr(usuario, "is_staff", False):
        return True
    if hasattr(usuario, "has_perm") and usuario.has_perm("gestion_huerta.view_cosecha"):
        return True
    return False

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

def _build_ui_from_cosecha(rep: Dict[str, Any]) -> Dict[str, Any]:
    rf = rep.get("resumen_financiero", {}) or {}
    det_inv = rep.get("detalle_inversiones", []) or []
    det_ven = rep.get("detalle_ventas", []) or []
    met = rep.get("metricas_rendimiento", {}) or {}

    kpis = [
        {"label": "Inversión Total", "value": rf.get("total_inversiones", 0.0), "format": "currency"},
        {"label": "Ventas Totales", "value": rf.get("total_ventas", 0.0), "format": "currency"},
        {"label": "Gastos de Venta", "value": rf.get("total_gastos_venta", 0.0), "format": "currency"},
        {"label": "Ganancia Neta", "value": rf.get("ganancia_neta", 0.0), "format": "currency"},
        {"label": "ROI", "value": rf.get("roi_porcentaje", 0.0), "format": "percentage"},
        {"label": "Cajas Totales", "value": met.get("cajas_totales", 0), "format": "number"},
    ]
    series_inv = _group_by_date(det_inv, "fecha", "total")
    series_ven = _group_by_date(det_ven, "fecha", "total_venta")
    series_gan = _group_by_date(
        [{"fecha": v["fecha"], "valor": Flt(D(v["total_venta"]) - D(v["gasto"]))} for v in det_ven],
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
            for it in det_inv
        ],
        "ventas": [
            {
                "id": it.get("id"),
                "fecha": it.get("fecha"),
                "cantidad": it.get("num_cajas"),
                "precio_unitario": it.get("precio_por_caja"),
                "total": it.get("total_venta"),
            }
            for it in det_ven
        ],
        "comparativo_cosechas": [],
    }
    return {"kpis": kpis, "series": {"inversiones": series_inv, "ventas": series_ven, "ganancias": series_gan}, "tablas": tablas}

def _validar_integridad_reporte(reporte_data: Dict[str, Any]) -> bool:
    try:
        meta = reporte_data.get("metadata", {}) or {}
        tipo = meta.get("tipo")
        if tipo == "cosecha":
            rf = reporte_data.get("resumen_financiero", {}) or {}
            if "detalle_inversiones" in reporte_data:
                total_calc_inv = sum(Flt(x.get("total")) for x in (reporte_data.get("detalle_inversiones") or []))
                total_rep_inv = Flt(rf.get("total_inversiones"))
                if abs(total_calc_inv - total_rep_inv) > 0.01:
                    raise ValidationError("Inconsistencia en totales de inversiones")
            if "detalle_ventas" in reporte_data:
                total_calc_ven = sum(Flt(x.get("total_venta")) for x in (reporte_data.get("detalle_ventas") or []))
                total_rep_ven = Flt(rf.get("total_ventas"))
                if abs(total_calc_ven - total_rep_ven) > 0.01:
                    raise ValidationError("Inconsistencia en totales de ventas")
        # Fecha de generación (no >5 minutos en el futuro)
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

# ========= API pública (COSECHA) =========
def generar_reporte_cosecha(
    cosecha_id: int,
    usuario,
    formato: str = "json",
    force_refresh: bool = False,
    cosecha_inst: Optional[Cosecha] = None,
) -> Dict[str, Any]:
    # Cache por usuario para evitar fugas de datos entre usuarios con distintos permisos
    cache_key = generate_cache_key(
        "cosecha",
        {"cosecha_id": cosecha_id, "formato": formato, "uid": getattr(usuario, "id", None)},
    )
    if not force_refresh:
        cached = cache.get(cache_key)
        if cached:
            return cached

    if cosecha_inst is not None:
        cosecha = cosecha_inst
    else:
        try:
            cosecha = (
                Cosecha.objects.select_related(
                    "temporada__huerta__propietario",
                    "temporada__huerta_rentada__propietario",
                    "huerta",
                    "huerta_rentada",
                    "temporada",
                )
                .prefetch_related(
                    Prefetch(
                        "inversiones",
                        queryset=InversionesHuerta.objects.filter(is_active=True).select_related("categoria"),
                    ),
                    Prefetch(
                        "ventas",
                        queryset=Venta.objects.filter(is_active=True),
                    ),
                )
                .get(id=cosecha_id)
            )
        except Cosecha.DoesNotExist:
            raise ValidationError("Cosecha no encontrada")

    if not _validar_permisos_cosecha(usuario, cosecha):
        raise PermissionDenied("Sin permisos para generar este reporte")

    origen = cosecha.huerta or cosecha.huerta_rentada
    origen_nombre = safe_str(getattr(origen, "nombre", None) or safe_str(origen)) if origen else "N/A"
    ubicacion = safe_str(getattr(origen, "ubicacion", "")) if origen else ""
    hectareas = D(getattr(origen, "hectareas", 0))

    inv_qs = cosecha.inversiones.all()
    ven_qs = cosecha.ventas.all()

    inv_tot = inv_qs.aggregate(
        total_insumos=Sum("gastos_insumos"),
        total_mano=Sum("gastos_mano_obra"),
    )
    total_inversiones = D(inv_tot["total_insumos"]) + D(inv_tot["total_mano"])

    ven_tot = ven_qs.aggregate(
        total_ingreso=Sum(F("num_cajas") * F("precio_por_caja")),
        total_cajas=Sum("num_cajas"),
        total_gastos_venta=Sum("gasto"),
    )
    total_ventas = D(ven_tot["total_ingreso"])
    total_cajas = I(ven_tot["total_cajas"])
    total_gastos_venta = D(ven_tot["total_gastos_venta"])

    ganancia_bruta = total_ventas - total_gastos_venta
    ganancia_neta = ganancia_bruta - total_inversiones
    roi = (ganancia_neta / total_inversiones * Decimal(100)) if total_inversiones > 0 else Decimal(0)

    detalle_inversiones: List[Dict[str, Any]] = []
    for inv in inv_qs.order_by("fecha"):
        gi = D(inv.gastos_insumos)
        gm = D(inv.gastos_mano_obra)
        total = gi + gm
        detalle_inversiones.append(
            {
                "id": inv.id,
                "fecha": _date_only(getattr(inv, "fecha", None)),
                "categoria": safe_str(getattr(getattr(inv, "categoria", None), "nombre", "Sin categoría")),
                "gastos_insumos": Flt(gi),
                "gastos_mano_obra": Flt(gm),
                "total": Flt(total),
                "descripcion": safe_str(getattr(inv, "descripcion", "")),
            }
        )

    detalle_ventas: List[Dict[str, Any]] = []
    for v in ven_qs.order_by("fecha_venta"):
        nc = I(v.num_cajas)
        pxc = D(v.precio_por_caja)
        gasto = D(v.gasto)
        ingreso = pxc * D(nc)
        utilidad_neta_venta = ingreso - gasto
        detalle_ventas.append(
            {
                "id": v.id,
                "fecha": _date_only(getattr(v, "fecha_venta", None)),
                "tipo_mango": safe_str(v.tipo_mango),
                "num_cajas": nc,
                "precio_por_caja": Flt(pxc),
                "total_venta": Flt(ingreso),
                "gasto": Flt(gasto),
                "ganancia_neta": Flt(utilidad_neta_venta),
                "tiene_perdida": bool(utilidad_neta_venta < 0),
            }
        )

    fi = _date_only(cosecha.fecha_inicio)
    ff = _date_only(cosecha.fecha_fin)
    periodo_txt = (f"{fi or ''} - {ff or ''}").strip()

    reporte: Dict[str, Any] = {
        "metadata": {
            "tipo": "cosecha",
            "fecha_generacion": timezone.now().isoformat(),
            "generado_por": getattr(usuario, "username", safe_str(usuario)),
            "cosecha_id": cosecha.id,
            "version": REPORTES_CACHE_VERSION,
        },
        "informacion_general": {
            "huerta_nombre": origen_nombre,
            "huerta_tipo": "Rentada" if cosecha.huerta_rentada_id else "Propia",
            "ubicacion": ubicacion,
            "propietario": safe_str(getattr(origen, "propietario", "")) if origen else "N/A",
            "temporada_año": getattr(cosecha.temporada, "año", None),
            "cosecha_nombre": safe_str(cosecha.nombre),
            "periodo": periodo_txt,
            "fecha_inicio": fi,
            "fecha_fin": ff,
            "estado": "Finalizada" if getattr(cosecha, "finalizada", False) else "Activa",
            "hectareas": Flt(hectareas),
        },
        "resumen_financiero": {
            "total_inversiones": Flt(total_inversiones),
            "total_ventas": Flt(total_ventas),
            "total_gastos_venta": Flt(total_gastos_venta),
            "ganancia_bruta": Flt(ganancia_bruta),
            "ganancia_neta": Flt(ganancia_neta),
            "roi_porcentaje": Flt(roi),
            "ganancia_por_hectarea": Flt(ganancia_neta / hectareas) if hectareas > 0 else 0.0,
        },
        "explicativo": {
            "ventas_brutas": Flt(total_ventas),
            "gastos_venta": Flt(total_gastos_venta),
            "ventas_netas": Flt(ganancia_bruta),
            "inversion_total": Flt(total_inversiones),
            "ganancia_neta": Flt(ganancia_neta),
            "roi_porcentaje": Flt(roi),
        },
        "flags": {
            "tiene_perdida": bool(ganancia_neta < 0),
        },
        "detalle_inversiones": detalle_inversiones,
        "detalle_ventas": detalle_ventas,
        "analisis_categorias": _analizar_categorias_inversiones(inv_qs, total_inversiones),
        "analisis_variedades": _analizar_variedades_ventas(ven_qs, total_ventas),
        "metricas_rendimiento": {
            "cajas_totales": total_cajas,
            "cajas_por_hectarea": Flt(D(total_cajas) / hectareas) if hectareas > 0 else 0.0,
            "precio_promedio_caja": Flt(total_ventas / D(total_cajas)) if total_cajas > 0 else 0.0,
            "costo_por_caja": Flt((total_inversiones + total_gastos_venta) / D(total_cajas)) if total_cajas > 0 else 0.0,
            "margen_por_caja": Flt(ganancia_neta / D(total_cajas)) if total_cajas > 0 else 0.0,
        },
    }

    reporte["ui"] = _build_ui_from_cosecha(reporte)
    _validar_integridad_reporte(reporte)

    cache.set(cache_key, reporte, REPORTES_CACHE_TIMEOUT)
    return reporte

def exportar_cosecha(cosecha_id: int, usuario, formato: str) -> bytes:
    rep = generar_reporte_cosecha(cosecha_id, usuario, "json", force_refresh=True)
    if formato.lower() == "pdf":
        return ExportacionService.generar_pdf_cosecha(rep)
    if formato.lower() in ("excel", "xlsx"):
        return ExportacionService.generar_excel_cosecha(rep)
    raise ValidationError("Formato no soportado para exportación")
