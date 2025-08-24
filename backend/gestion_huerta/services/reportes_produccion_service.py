# -*- coding: utf-8 -*-
"""
Servicio robusto para generar, validar y exportar reportes de producción.
Compatibilidad hacia atrás garantizada (no se eliminan claves); se añaden:
- Bloque "ui" con kpis/series/tablas listos para el frontend
- Fechas normalizadas 'YYYY-MM-DD'
- Cálculo con Decimal para exactitud
- Cache corto con force_refresh y versionado de clave
- Permisos: superuser/staff bypass + permisos granulares
- Exportación PDF/Excel reutilizando el JSON recién calculado
- Validaciones de integridad (suma de detalles vs. totales)
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import hashlib
import json
import itertools

from django.core.cache import cache
from django.core.exceptions import ValidationError, PermissionDenied
from django.db.models import Prefetch, Sum, F, Avg
from django.utils import timezone

from gestion_huerta.models import (
    Cosecha,
    Temporada,
    Huerta,
    HuertaRentada,
    InversionesHuerta,
    Venta,
)
from gestion_huerta.services.exportacion_service import ExportacionService


# =========================
# Utilidades numéricas/seguras
# =========================

TWOPLACES = Decimal("0.01")


def D(x: Any) -> Decimal:
    """Convierte a Decimal de forma segura (acepta None, int, float, str)."""
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
    """Devuelve fecha en 'YYYY-MM-DD' o None si no hay valor."""
    if not dt:
        return None
    try:
        return dt.strftime("%Y-%m-%d")
    except Exception:
        s = str(dt)
        return s.split("T", 1)[0] if s else None


def _sum_decimal(values: List[Any]) -> Decimal:
    acc = Decimal("0")
    for v in values:
        acc += D(v)
    return acc


def _group_by_date(items: List[Dict[str, Any]], date_key: str, value_key: str) -> List[Dict[str, Any]]:
    """Agrupa por fecha (YYYY-MM-DD) sumando 'valor'."""
    bucket: Dict[str, Decimal] = {}
    for it in items:
        f = it.get(date_key)
        v = D(it.get(value_key))
        if not f:
            continue
        bucket[f] = bucket.get(f, Decimal("0")) + v
    out = [{"fecha": k, "valor": Flt(v)} for k, v in sorted(bucket.items())]
    return out


# =========================
# Servicio principal
# =========================

class ReportesProduccionService:
    """Servicio para generar/exportar reportes de producción con vista UI incluida."""

    CACHE_TIMEOUT = 10  # segundos
    _CACHE_VERSION = "1.3.2"

    # --------------------------
    # COSECHA
    # --------------------------
    @staticmethod
    def generar_reporte_cosecha(
        cosecha_id: int,
        usuario,
        formato: str = "json",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Genera reporte detallado de una cosecha.
        Mantiene las claves históricas y añade bloque "ui" para el frontend.
        """
        cache_key = ReportesProduccionService._generar_cache_key(
            "cosecha", {"cosecha_id": cosecha_id, "formato": formato}
        )
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached:
                return cached

        # Carga optimizada con prefetch
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

        # Permisos
        if not ReportesProduccionService._validar_permisos_cosecha(usuario, cosecha):
            raise PermissionDenied("Sin permisos para generar este reporte")

        # Origen y hectáreas
        origen = cosecha.huerta or cosecha.huerta_rentada
        origen_nombre = safe_str(getattr(origen, "nombre", None) or safe_str(origen)) if origen else "N/A"
        ubicacion = safe_str(getattr(origen, "ubicacion", "")) if origen else ""
        hectareas = D(getattr(origen, "hectareas", 0))

        # Querysets ya filtrados por is_active
        inv_qs = cosecha.inversiones.all()
        ven_qs = cosecha.ventas.all()

        # Totales por agregación
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

        # Derivados
        ganancia_bruta = total_ventas - total_gastos_venta
        ganancia_neta = ganancia_bruta - total_inversiones
        roi = (ganancia_neta / total_inversiones * Decimal(100)) if total_inversiones > 0 else Decimal(0)

        # Detalles (normalizando fecha a 'YYYY-MM-DD')
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
                }
            )

        # Fechas y periodo
        fi = _date_only(cosecha.fecha_inicio)
        ff = _date_only(cosecha.fecha_fin)
        periodo_txt = (f"{fi or ''} - {ff or ''}").strip()

        # Reporte base (compatibilidad)
        reporte: Dict[str, Any] = {
            "metadata": {
                "tipo": "cosecha",
                "fecha_generacion": timezone.now().isoformat(),
                "generado_por": getattr(usuario, "username", safe_str(usuario)),
                "cosecha_id": cosecha.id,
                "version": ReportesProduccionService._CACHE_VERSION,
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
            "detalle_inversiones": detalle_inversiones,
            "detalle_ventas": detalle_ventas,
            "analisis_categorias": ReportesProduccionService._analizar_categorias_inversiones(inv_qs, total_inversiones),
            "analisis_variedades": ReportesProduccionService._analizar_variedades_ventas(ven_qs, total_ventas),
            "metricas_rendimiento": {
                "cajas_totales": total_cajas,
                "cajas_por_hectarea": Flt(D(total_cajas) / hectareas) if hectareas > 0 else 0.0,
                "precio_promedio_caja": Flt(total_ventas / D(total_cajas)) if total_cajas > 0 else 0.0,
                "costo_por_caja": Flt((total_inversiones + total_gastos_venta) / D(total_cajas)) if total_cajas > 0 else 0.0,
                "margen_por_caja": Flt(ganancia_neta / D(total_cajas)) if total_cajas > 0 else 0.0,
            },
        }

        # ---- Bloque UI (nuevo) ----
        ui = ReportesProduccionService._build_ui_from_cosecha(reporte)
        reporte["ui"] = ui

        # Validaciones integridad
        ReportesProduccionService._validar_integridad_reporte(reporte)

        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        return reporte

    # --------------------------
    # TEMPORADA
    # --------------------------
    @staticmethod
    def generar_reporte_temporada(
        temporada_id: int,
        usuario,
        formato: str = "json",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Genera reporte consolidado de una temporada (con bloque 'ui')."""
        cache_key = ReportesProduccionService._generar_cache_key(
            "temporada", {"temporada_id": temporada_id, "formato": formato}
        )
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

        if not ReportesProduccionService._validar_permisos_temporada(usuario, temporada):
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

        # Acumuladores para series de temporada (por fecha)
        detalle_inversiones_all: List[Dict[str, Any]] = []
        detalle_ventas_all: List[Dict[str, Any]] = []

        for c in cosechas:
            # Reutilizamos el generador de cosecha para consistencia
            rep_c = ReportesProduccionService.generar_reporte_cosecha(c.id, usuario, "json", force_refresh=force_refresh)
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

            # Extender detalles para series globales
            detalle_inversiones_all.extend(rep_c.get("detalle_inversiones", []))
            detalle_ventas_all.extend(rep_c.get("detalle_ventas", []))

        ganancia_neta = total_ventas - total_gastos_venta - total_inversiones
        roi_temporada = (ganancia_neta / total_inversiones * Decimal(100)) if total_inversiones > 0 else Decimal(0)

        # Agregados a nivel temporada (para análisis)
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
                "version": ReportesProduccionService._CACHE_VERSION,
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
            "analisis_categorias": ReportesProduccionService._analizar_categorias_inversiones(
                todas_inversiones, total_inversiones
            ),
            "analisis_variedades": ReportesProduccionService._analizar_variedades_ventas(todas_ventas, total_ventas),
            "metricas_eficiencia": {
                "costo_por_hectarea": Flt(total_inversiones / hectareas) if hectareas > 0 else 0.0,
                "ingreso_por_hectarea": Flt(total_ventas / hectareas) if hectareas > 0 else 0.0,
                "ganancia_por_hectarea": Flt(ganancia_neta / hectareas) if hectareas > 0 else 0.0,
                "cajas_por_hectarea": Flt(D(total_cajas) / hectareas) if hectareas > 0 else 0.0,
                "precio_promedio_caja": Flt(total_ventas / D(total_cajas)) if total_cajas > 0 else 0.0,
            },
        }

        # ---- Bloque UI (nuevo) ----
        ui = ReportesProduccionService._build_ui_from_temporada(reporte, detalle_inversiones_all, detalle_ventas_all)
        reporte["ui"] = ui

        ReportesProduccionService._validar_integridad_reporte(reporte)
        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        return reporte

    # --------------------------
    # PERFIL DE HUERTA (histórico)
    # --------------------------
    @staticmethod
    def generar_perfil_huerta(
        huerta_id: Optional[int],
        huerta_rentada_id: Optional[int],
        usuario,
        años: int = 5,
        formato: str = "json",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Perfil histórico de huerta (propia o rentada) para los últimos N años."""
        if not huerta_id and not huerta_rentada_id:
            raise ValidationError("Debe especificar huerta_id o huerta_rentada_id")

        cache_key = ReportesProduccionService._generar_cache_key(
            "perfil_huerta",
            {"huerta_id": huerta_id, "huerta_rentada_id": huerta_rentada_id, "años": años, "formato": formato},
        )
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached:
                return cached

        # Resolver origen y temporadas
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

        if not ReportesProduccionService._validar_permisos_huerta(usuario, origen):
            raise PermissionDenied("Sin permisos para generar este reporte")

        datos_historicos: List[Dict[str, Any]] = []
        suma_roi = Decimal("0")
        total_años_validos = 0
        for temporada in temporadas:
            rep_t = ReportesProduccionService.generar_reporte_temporada(temporada.id, usuario, "json", force_refresh=force_refresh)
            datos_historicos.append(
                {
                    "año": getattr(temporada, "año", None),
                    "inversion": rep_t["resumen_ejecutivo"]["inversion_total"],
                    "ventas": rep_t["resumen_ejecutivo"]["ventas_totales"],
                    "ganancia": rep_t["resumen_ejecutivo"]["ganancia_neta"],
                    "roi": rep_t["resumen_ejecutivo"]["roi_temporada"],
                    "productividad": rep_t["resumen_ejecutivo"]["productividad"],
                    "cosechas_count": rep_t["informacion_general"]["total_cosechas"],
                }
            )
            suma_roi += D(rep_t["resumen_ejecutivo"]["roi_temporada"])
            total_años_validos += 1

        roi_promedio = suma_roi / (D(total_años_validos) or Decimal("1"))
        tendencias = ReportesProduccionService._calcular_tendencias(datos_historicos)
        analisis_eficiencia = ReportesProduccionService._analizar_eficiencia_historica(datos_historicos, roi_promedio)
        proyecciones = ReportesProduccionService._generar_proyecciones(datos_historicos, origen)

        reporte: Dict[str, Any] = {
            "metadata": {
                "tipo": "perfil_huerta",
                "fecha_generacion": timezone.now().isoformat(),
                "generado_por": getattr(usuario, "username", safe_str(usuario)),
                "huerta_id": huerta_id,
                "huerta_rentada_id": huerta_rentada_id,
                "años_analizados": total_años_validos,
                "version": ReportesProduccionService._CACHE_VERSION,
            },
            "informacion_general": {
                "huerta_nombre": safe_str(getattr(origen, "nombre", safe_str(origen))),
                "huerta_tipo": "Rentada" if huerta_rentada_id else "Propia",
                "ubicacion": safe_str(getattr(origen, "ubicacion", "")),
                "propietario": safe_str(getattr(origen, "propietario", "")),
                "hectareas": Flt(getattr(origen, "hectareas", 0.0)),
                "variedades": safe_str(getattr(origen, "variedades", "")),
                "años_operacion": total_años_validos,
                "temporadas_analizadas": len(datos_historicos),
            },
            "resumen_historico": datos_historicos,
            "tendencias_crecimiento": tendencias,
            "analisis_eficiencia": analisis_eficiencia,
            "proyecciones": proyecciones,
        }

        # ---- Bloque UI (nuevo: KPIs/series históricas mínimas) ----
        ui = {
            "kpis": [
                {"label": "Años Analizados", "value": total_años_validos, "format": "number"},
                {"label": "ROI Promedio Histórico", "value": Flt(roi_promedio), "format": "percentage"},
                {"label": "Ingresos (últ. año)", "value": Flt(datos_historicos[0]["ventas"]) if datos_historicos else 0.0, "format": "currency"},
                {"label": "Ganancia (últ. año)", "value": Flt(datos_historicos[0]["ganancia"]) if datos_historicos else 0.0, "format": "currency"},
            ],
            "series": {
                "ventas": [{"fecha": str(d["año"]), "valor": Flt(d["ventas"])} for d in sorted(datos_historicos, key=lambda x: x["año"])],
                "ganancias": [{"fecha": str(d["año"]), "valor": Flt(d["ganancia"])} for d in sorted(datos_historicos, key=lambda x: x["año"])],
            },
            "tablas": {
                "comparativo_cosechas": [],  # no aplica aquí
                "inversiones": [],
                "ventas": [],
            },
        }
        reporte["ui"] = ui

        ReportesProduccionService._validar_integridad_reporte(reporte)
        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        return reporte

    # --------------------------
    # Exportación (PDF / Excel)
    # --------------------------
    @staticmethod
    def exportar_cosecha(cosecha_id: int, usuario, formato: str) -> bytes:
        rep = ReportesProduccionService.generar_reporte_cosecha(cosecha_id, usuario, "json", force_refresh=True)
        if formato.lower() == "pdf":
            return ExportacionService.generar_pdf_cosecha(rep)
        if formato.lower() in ("excel", "xlsx"):
            return ExportacionService.generar_excel_cosecha(rep)
        raise ValidationError("Formato no soportado para exportación")

    @staticmethod
    def exportar_temporada(temporada_id: int, usuario, formato: str) -> bytes:
        rep = ReportesProduccionService.generar_reporte_temporada(temporada_id, usuario, "json", force_refresh=True)
        if formato.lower() == "pdf":
            return ExportacionService.generar_pdf_temporada(rep)
        if formato.lower() in ("excel", "xlsx"):
            return ExportacionService.generar_excel_temporada(rep)
        raise ValidationError("Formato no soportado para exportación")

    @staticmethod
    def exportar_perfil_huerta(
        huerta_id: Optional[int],
        huerta_rentada_id: Optional[int],
        usuario,
        formato: str,
        años: int = 5,
    ) -> bytes:
        rep = ReportesProduccionService.generar_perfil_huerta(
            huerta_id, huerta_rentada_id, usuario, años=años, formato="json", force_refresh=True
        )
        if formato.lower() == "pdf":
            return ExportacionService.generar_pdf_perfil_huerta(rep)
        if formato.lower() in ("excel", "xlsx"):
            return ExportacionService.generar_excel_perfil_huerta(rep)
        raise ValidationError("Formato no soportado para exportación")

    # =========================
    # Auxiliares privados
    # =========================

    @staticmethod
    def _build_ui_from_cosecha(rep: Dict[str, Any]) -> Dict[str, Any]:
        """Construye bloque UI (kpis/series/tablas) desde un reporte de cosecha."""
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

        # Series diarias
        series_inv = _group_by_date(det_inv, "fecha", "total")
        series_ven = _group_by_date(det_ven, "fecha", "total_venta")
        # Ganancias por día = total_venta - gasto
        series_gan = _group_by_date(
            [{"fecha": v["fecha"], "valor": Flt(D(v["total_venta"]) - D(v["gasto"]))} for v in det_ven],
            "fecha",
            "valor",
        )

        # Tablas UI
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
            "comparativo_cosechas": [],  # no aplica en cosecha
        }

        return {"kpis": kpis, "series": {"inversiones": series_inv, "ventas": series_ven, "ganancias": series_gan}, "tablas": tablas}

    @staticmethod
    def _build_ui_from_temporada(
        rep: Dict[str, Any],
        detalle_inversiones_all: List[Dict[str, Any]],
        detalle_ventas_all: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Bloque UI para temporada, con comparativo por cosecha y series diarias."""
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

    @staticmethod
    def _generar_cache_key(tipo_reporte: str, parametros: Dict[str, Any]) -> str:
        data = {"tipo": tipo_reporte, "params": parametros, "version": ReportesProduccionService._CACHE_VERSION}
        s = json.dumps(data, sort_keys=True, default=str)
        return f"reporte_{hashlib.md5(s.encode()).hexdigest()}"

    @staticmethod
    def _validar_permisos_cosecha(usuario, cosecha) -> bool:
        if getattr(usuario, "is_superuser", False) or getattr(usuario, "is_staff", False):
            return True
        if hasattr(usuario, "has_perm") and usuario.has_perm("gestion_huerta.view_cosecha"):
            return True
        return (cosecha.huerta_id is not None) or (cosecha.huerta_rentada_id is not None)

    @staticmethod
    def _validar_permisos_temporada(usuario, temporada) -> bool:
        if getattr(usuario, "is_superuser", False) or getattr(usuario, "is_staff", False):
            return True
        return hasattr(usuario, "has_perm") and usuario.has_perm("gestion_huerta.view_temporada")

    @staticmethod
    def _validar_permisos_huerta(usuario, huerta) -> bool:
        if getattr(usuario, "is_superuser", False) or getattr(usuario, "is_staff", False):
            return True
        return hasattr(usuario, "has_perm") and usuario.has_perm("gestion_huerta.view_huerta")

    @staticmethod
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

    @staticmethod
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

    @staticmethod
    def _calcular_tendencias(datos_historicos: List[Dict[str, Any]]) -> Dict[str, float]:
        if len(datos_historicos) < 2:
            return {"crecimiento_ventas_anual": 0.0, "crecimiento_ganancia_anual": 0.0, "mejora_roi": 0.0, "incremento_productividad": 0.0}
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

    @staticmethod
    def _analizar_eficiencia_historica(datos_historicos: List[Dict[str, Any]], roi_promedio: Decimal) -> Dict[str, Any]:
        if not datos_historicos:
            return {"mejor_temporada": {"año": None, "roi": 0.0}, "peor_temporada": {"año": None, "roi": 0.0}, "roi_promedio_historico": 0.0, "variabilidad_roi": 0.0, "tendencia": "Insuficientes datos"}
        mejor = max(datos_historicos, key=lambda x: Flt(x["roi"]))
        peor = min(datos_historicos, key=lambda x: Flt(x["roi"]))
        rois = [Flt(d["roi"]) for d in datos_historicos]
        if len(rois) < 2:
            std = 0.0
        else:
            prom = sum(rois) / len(rois)
            var = sum((x - prom) ** 2 for x in rois) / len(rois)
            std = var ** 0.5

        n = len(rois)
        sx = sum(range(n))
        sy = sum(rois)
        sxy = sum(i * r for i, r in enumerate(rois))
        sx2 = sum(i * i for i in range(n))
        denom = (n * sx2 - sx * sx)
        pend = (n * sxy - sx * sy) / denom if denom else 0.0
        tendencia = "Creciente" if pend > 0.5 else ("Decreciente" if pend < -0.5 else "Estable")

        return {"mejor_temporada": {"año": mejor["año"], "roi": Flt(mejor["roi"])}, "peor_temporada": {"año": peor["año"], "roi": Flt(peor["roi"])}, "roi_promedio_historico": Flt(roi_promedio), "variabilidad_roi": round(std, 2), "tendencia": tendencia}

    @staticmethod
    def _generar_proyecciones(datos_historicos: List[Dict[str, Any]], _origen) -> Dict[str, Any]:
        if len(datos_historicos) < 2:
            return {"proyeccion_proxima_temporada": 0, "roi_esperado": 0, "recomendaciones": ["Insuficientes datos históricos para proyecciones"], "alertas": []}
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

        return {"proyeccion_proxima_temporada": round(prom_ventas, 2), "roi_esperado": round(prom_roi, 2), "recomendaciones": recs, "alertas": alerts}

    @staticmethod
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
