# -*- coding: utf-8 -*-
"""
Servicio de Reportes: PERFIL DE HUERTA
--------------------------------------
Responsabilidad
- Generar la foto histórica de una huerta (propia o rentada) sobre N temporadas recientes.
- Consolidar KPIs: ROI promedio, variabilidad, tendencias, proyecciones.

Reglas de negocio
- Temporadas fuente: `is_active=True`, ordenadas por año (desc), tomando las N últimas.
- Tendencias: CAGR simple entre primer y último año válidos (ventas/ganancia/productividad).
- Proyecciones: promedio móvil de 3 años (si hay ≥2), alertas por ROI bajo y tendencia decreciente.

Cache/Permisos
- Cache por (huerta_id|huerta_rentada_id, años, formato, uid).
- Permisos: superuser/staff o `gestion_huerta.view_huerta`.
  > Recomendación: complementar con pertenencia (owner) si aplica.

Compatibilidad
- Salida preparada para exportadores (PDF/Excel) y frontend (ui.kpis/series).
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils import timezone

from gestion_huerta.models import Huerta, HuertaRentada
from gestion_huerta.services.exportacion_service import ExportacionService
from gestion_huerta.services.reportes.temporada_service import generar_reporte_temporada
from gestion_huerta.utils.cache_keys import (
    REPORTES_CACHE_TIMEOUT,
    REPORTES_CACHE_VERSION,
    generate_cache_key,
)

# ========= Utils locales =========
TWOPLACES = Decimal("0.01")

def D(x: Any) -> Decimal:
    """Decimal seguro (None→0)."""
    try:
        if x is None:
            return Decimal("0")
        return Decimal(str(x))
    except Exception:
        return Decimal("0")

def Flt(x: Any) -> float:
    """Decimal→float con redondeo HALF_UP a 2 decimales."""
    try:
        return float(D(x).quantize(TWOPLACES, rounding=ROUND_HALF_UP))
    except Exception:
        return 0.0

def safe_str(x: Any) -> str:
    return "" if x is None else str(x)

def _validar_permisos_huerta(usuario, huerta) -> bool:
    """Permite ver reporte si superuser/staff o `has_perm('gestion_huerta.view_huerta')`."""
    if getattr(usuario, "is_superuser", False) or getattr(usuario, "is_staff", False):
        return True
    return hasattr(usuario, "has_perm") and usuario.has_perm("gestion_huerta.view_huerta")

def _calcular_tendencias(datos_historicos: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calcula tendencias interanuales aproximadas:
    - CAGR de ventas, ganancia y productividad (entre primer y último año).
    - Mejora de ROI promedio por año (pendiente simple).
    """
    if len(datos_historicos) < 2:
        return {
            "crecimiento_ventas_anual": 0.0,
            "crecimiento_ganancia_anual": 0.0,
            "mejora_roi": 0.0,
            "incremento_productividad": 0.0,
        }
    datos_ordenados = sorted(datos_historicos, key=lambda x: x["año"])
    a0, aN = datos_ordenados[0], datos_ordenados[-1]
    years = max(1, int(aN["año"]) - int(a0["año"]))

    def cagr(v0, v1) -> float:
        v0d, v1d = Flt(v0), Flt(v1)
        if v0d <= 0 or v1d <= 0:
            return 0.0
        return (v1d / v0d) ** (1 / years) - 1

    return {
        "crecimiento_ventas_anual": round(cagr(a0["ventas"], aN["ventas"]) * 100, 2),
        "crecimiento_ganancia_anual": round(cagr(a0["ganancia"], aN["ganancia"]) * 100, 2),
        "mejora_roi": round((Flt(aN["roi"]) - Flt(a0["roi"])) / years, 2),
        "incremento_productividad": round(cagr(a0["productividad"], aN["productividad"]) * 100, 2),
    }

def _analizar_eficiencia_historica(datos_historicos: List[Dict[str, Any]], roi_promedio: Decimal) -> Dict[str, Any]:
    """
    Eficiencia histórica:
    - Mejor/peor temporada por ROI.
    - ROI promedio histórico, desviación tipo, y tendencia (pendiente de ROI).
    """
    if not datos_historicos:
        return {
            "mejor_temporada": {"año": None, "roi": 0.0},
            "peor_temporada": {"año": None, "roi": 0.0},
            "roi_promedio_historico": 0.0,
            "variabilidad_roi": 0.0,
            "tendencia": "Insuficientes datos",
        }
    mejor = max(datos_historicos, key=lambda x: Flt(x["roi"]))
    peor = min(datos_historicos, key=lambda x: Flt(x["roi"]))
    rois = [Flt(d["roi"]) for d in datos_historicos]
    if len(rois) < 2:
        std = 0.0
    else:
        prom = sum(rois) / len(rois)
        var = sum((x - prom) ** 2 for x in rois) / len(rois)
        std = var ** 0.5

    # Tendencia: comparar ROI inicial vs. final (robusto a negativos)
    try:
        primeros_ordenados = sorted(datos_historicos, key=lambda x: x["año"])
    except Exception:
        primeros_ordenados = datos_historicos
    if primeros_ordenados:
        roi_ini = Flt(primeros_ordenados[0].get("roi"))
        roi_fin = Flt(primeros_ordenados[-1].get("roi"))
        delta = roi_fin - roi_ini
        eps = 0.01
        if delta > eps:
            tendencia = "Creciente"
        elif delta < -eps:
            tendencia = "Decreciente"
        else:
            tendencia = "Estable"
    else:
        tendencia = "Estable"

    return {
        "mejor_temporada": {"año": mejores_ordenados[-1]["año"] if False else mejor["año"], "roi": Flt(mejor["roi"])},  # keep structure
        "peor_temporada": {"año": peor["año"], "roi": Flt(peor["roi"])},
        "roi_promedio_historico": Flt(roi_promedio),
        "variabilidad_roi": round(std, 2),
        "tendencia": tendencia,
    }

def _generar_proyecciones(datos_historicos: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Proyecciones heurísticas:
    - Promedio de ventas y ROI en los últimos ~3 años.
    - Reglas simples de recomendación/alerta según valores recientes.
    """
    if len(datos_historicos) < 2:
        return {
            "proyeccion_proxima_temporada": 0,
            "roi_esperado": 0,
            "recomendaciones": ["Insuficientes datos históricos para proyecciones"],
            "alertas": [],
        }
    datos_ordenados = sorted(datos_historicos, key=lambda x: x["año"], reverse=True)
    ult = datos_ordenados[:3]
    prom_ventas = sum(Flt(d["ventas"]) for d in ult) / len(ult)
    prom_roi = sum(Flt(d["roi"]) for d in ult) / len(ult)

    recs: List[str] = []
    alerts: List[str] = []
    if prom_roi < 50:
        alerts.append("ROI por debajo del 50% - Revisar estrategia de costos y precios")
    ult_crono = sorted(ult, key=lambda x: x["año"])
    if len(ult_crono) >= 3:
        rA = [Flt(x["roi"]) for x in ult_crono]
        if rA[0] > rA[1] > rA[2]:
            alerts.append("Tendencia decreciente en ROI en los últimos 3 años")
    if prom_roi > 70:
        recs.append("Excelente rendimiento - Considerar expansión controlada")
    elif prom_roi > 50:
        recs.append("Buen rendimiento - Mantener estrategia actual con seguimiento de costos")
    else:
        recs.append("Rendimiento bajo - Ajustar costos, mix de variedades y canales de venta")

    return {
        "proyeccion_proxima_temporada": round(prom_ventas, 2),
        "roi_esperado": round(prom_roi, 2),
        "recomendaciones": recs,
        "alertas": alerts,
    }

def _validar_integridad_reporte(reporte_data: Dict[str, Any]) -> bool:
    """Valida `fecha_generacion` (no >5 minutos en el futuro)."""
    try:
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

# ========= API pública (PERFIL HUERTA) =========
def generar_perfil_huerta(
    huerta_id: Optional[int],
    huerta_rentada_id: Optional[int],
    usuario,
    años: int = 5,
    formato: str = "json",
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """
    Genera el perfil histórico de una huerta (propia o rentada) sobre las últimas `años` temporadas activas.
    """
    if not huerta_id and not huerta_rentada_id:
        raise ValidationError("Debe especificar huerta_id o huerta_rentada_id")

    # Cache por usuario (uid) para evitar fugas de datos
    cache_key = generate_cache_key(
        "perfil_huerta",
        {
            "huerta_id": huerta_id,
            "huerta_rentada_id": huerta_rentada_id,
            "años": años,
            "formato": formato,
            "uid": getattr(usuario, "id", None),
        },
    )
    if not force_refresh:
        cached = cache.get(cache_key)
        if cached:
            return cached

    # Resolver origen y temporadas (últimos N años activos)
    if huerta_id:
        try:
            origen = Huerta.objects.select_related("propietario").get(id=huerta_id)
        except Huerta.DoesNotExist:
            raise ValidationError("Huerta no encontrada")
        temporadas = origen.temporadas.filter(is_active=True).order_by("-año")[:años]
    else:
        try:
            origen = HuertaRentada.objects.select_related("propietario").get(id=huerta_rentada_id)
        except HuertaRentada.DoesNotExist:
            raise ValidationError("Huerta rentada no encontrada")
        temporadas = origen.temporadas.filter(is_active=True).order_by("-año")[:años]

    if not _validar_permisos_huerta(usuario, origen):
        raise PermissionDenied("Sin permisos para generar este reporte")

    datos_historicos: List[Dict[str, Any]] = []
    suma_roi = Decimal("0")
    total_años_validos = 0
    for temporada in temporadas:
        rep_t = generar_reporte_temporada(
            temporada.id, usuario, "json", force_refresh=force_refresh, temporada_inst=temporada
        )
        datos_historicos.append(
            {
                "año": getattr(temporada, "año", None),
                "inversion": rep_t["resumen_ejecutivo"]["inversion_total"],
                "ventas": rep_t["resumen_ejecutivo"]["ventas_totales"],
                "ganancia": rep_t["resumen_ejecutivo"]["ganancia_neta"],
                "roi": rep_t["resumen_ejecutivo"]["roi_temporada"],
                "productividad": rep_t["resumen_ejecutivo"]["productividad"],
                "cosechas_count": rep_t["informacion_general"]["total_cosechas"],
                "cajas": rep_t["resumen_ejecutivo"].get("cajas_totales", 0),  # <-- añadido para PDF desde datos
                "tiene_perdida": bool(Decimal(str(rep_t["resumen_ejecutivo"]["ganancia_neta"])) < 0),
            }
        )
        suma_roi += Decimal(str(rep_t["resumen_ejecutivo"]["roi_temporada"]))
        total_años_validos += 1

    roi_promedio = (suma_roi / Decimal(str(total_años_validos))) if total_años_validos > 0 else Decimal("0")
    tendencias = _calcular_tendencias(datos_historicos)
    analisis_eficiencia = _analizar_eficiencia_historica(datos_historicos, roi_promedio)
    proyecciones = _generar_proyecciones(datos_historicos)

    reporte: Dict[str, Any] = {
        "metadata": {
            "tipo": "perfil_huerta",
            # Fecha local a zona configurada, sin microsegundos
            "fecha_generacion": timezone.localtime(timezone.now()).isoformat(timespec="seconds"),
            "generado_por": getattr(usuario, "username", safe_str(usuario)),
            "huerta_id": huerta_id,
            "huerta_rentada_id": huerta_rentada_id,
            "años_analizados": total_años_validos,
            # Se evita incluir 'version' para no confundir al usuario final
            "entidad": {
                "id": huerta_id or huerta_rentada_id,
                "nombre": safe_str(getattr(origen, "nombre", safe_str(origen))),
                "tipo": "perfil_huerta",
            },
        },
        "informacion_general": {
            "huerta_nombre": safe_str(getattr(origen, "nombre", safe_str(origen))),
            "huerta_tipo": "Rentada" if huerta_rentada_id else "Propia",
            "ubicacion": safe_str(getattr(origen, "ubicacion", "")),
            "propietario": safe_str(getattr(origen, "propietario", "")),
            "hectareas": float(getattr(origen, "hectareas", 0.0)),
            "variedades": safe_str(getattr(origen, "variedades", "")),
            "años_operacion": total_años_validos,
            "temporadas_analizadas": len(datos_historicos),
        },
        "resumen_historico": datos_historicos,
        "tendencias_crecimiento": tendencias,
        "analisis_eficiencia": analisis_eficiencia,
        "proyecciones": proyecciones,
    }

    reporte["ui"] = {
        "kpis": [
            {"label": "Años Analizados", "value": total_años_validos, "format": "number"},
            {"label": "ROI Promedio Histórico", "value": float(roi_promedio), "format": "percentage"},
            {"label": "Ingresos (últ. año)", "value": float(datos_historicos[0]["ventas"]) if datos_historicos else 0.0, "format": "currency"},
            {"label": "Ganancia (últ. año)", "value": float(datos_historicos[0]["ganancia"]) if datos_historicos else 0.0, "format": "currency"},
        ],
        "series": {
            "ventas": [{"fecha": str(d["año"]), "valor": float(d["ventas"])} for d in sorted(datos_historicos, key=lambda x: x["año"])],
            "ganancias": [{"fecha": str(d["año"]), "valor": float(d["ganancia"])} for d in sorted(datos_historicos, key=lambda x: x["año"])],
        },
        "tablas": {"comparativo_cosechas": [], "inversiones": [], "ventas": []},
    }

    # Serie de inversiones (derivada de resumen_historico)
    try:
        serie_inv = [
            {"fecha": str(d["año"]), "valor": float(d.get("inversion") or 0.0)}
            for d in sorted(datos_historicos, key=lambda x: x["año"])
        ]
        reporte["ui"]["series"]["inversiones"] = serie_inv
    except Exception:
        pass

    # KPIs estándar multi-año
    try:
        suma_inv = sum(float((d.get("inversion") or 0)) for d in datos_historicos)
        suma_ven = sum(float((d.get("ventas") or 0)) for d in datos_historicos)
        suma_gan = sum(float((d.get("ganancia") or 0)) for d in datos_historicos)
        gastos_venta = max(0.0, suma_ven - suma_inv - suma_gan)
        extra_kpis = [
            {"label": "Inversión Total", "value": suma_inv, "format": "currency"},
            {"label": "Ventas Totales", "value": suma_ven, "format": "currency"},
            {"label": "Gastos de Venta", "value": gastos_venta, "format": "currency"},
            {"label": "Ganancia Neta", "value": suma_gan, "format": "currency"},
        ]
        reporte["ui"]["kpis"] = extra_kpis + (reporte.get("ui", {}).get("kpis", []) or [])
    except Exception:
        pass

    _validar_integridad_reporte(reporte)
    cache.set(cache_key, reporte, REPORTES_CACHE_TIMEOUT)
    return reporte

def exportar_perfil_huerta(
    huerta_id: Optional[int],
    huerta_rentada_id: Optional[int],
    usuario,
    formato: str,
    años: int = 5,
) -> bytes:
    """
    Exporta el perfil de huerta:
      - pdf -> PDFExporter.generar_pdf_perfil_huerta(JSON)
      - excel/xlsx -> ExcelExporter.generar_excel_perfil_huerta(JSON)
    """
    rep = generar_perfil_huerta(huerta_id, huerta_rentada_id, usuario, años=años, formato="json", force_refresh=True)
    if formato.lower() == "pdf":
        return ExportacionService.generar_pdf_perfil_huerta(rep)
    if formato.lower() in ("excel", "xlsx"):
        return ExportacionService.generar_excel_perfil_huerta(rep)
    raise ValidationError("Formato no soportado para exportación")
