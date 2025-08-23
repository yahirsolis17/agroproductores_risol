# backend/gestion_huerta/services/reportes_produccion_service.py
# -*- coding: utf-8 -*-
"""
Servicio robusto para generar y exportar reportes de producción.

Incluye:
- Cálculo exacto y consistente de métricas (usa Decimal internamente)
- Fechas normalizadas a 'YYYY-MM-DD' para evitar desfases por timezone
- Cache corto sensible a parámetros + force_refresh
- Bypass de permisos para superusers/admin
- Exportación a PDF/Excel reutilizando el JSON recién generado
"""

from __future__ import annotations

from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import hashlib
import json

from django.core.cache import cache
from django.core.exceptions import ValidationError, PermissionDenied
from django.db.models import Prefetch, Sum, F
from django.utils import timezone

from gestion_huerta.models import (
    Cosecha,
    Temporada,
    Huerta,
    HuertaRentada,
    InversionesHuerta,
    Venta,
)



# Exportador (PDF/Excel)
from gestion_huerta.services.exportacion_service import ExportacionService


# =========================
# Utilidades numéricas/seguras
# =========================

def D(x: Any) -> Decimal:
    """Convierte a Decimal de forma segura (acepta None, int, float, str)."""
    try:
        if x is None:
            return Decimal("0")
        # Convertir vía str para evitar artefactos binarios de float
        return Decimal(str(x))
    except Exception:
        return Decimal("0")


def Flt(x: Any) -> float:
    try:
        return float(D(x))
    except Exception:
        return 0.0


def safe_str(x: Any) -> str:
    return "" if x is None else str(x)


def _date_only(dt) -> Optional[str]:
    """Devuelve fecha en 'YYYY-MM-DD' o None si no hay valor."""
    if not dt:
        return None
    try:
        return dt.strftime("%Y-%m-%d")
    except Exception:
        # si llega cadena ISO, cortamos por 'T'
        s = str(dt)
        return s.split("T", 1)[0] if s else None


# =========================
# Servicio principal
# =========================

class ReportesProduccionService:
    """Servicio principal para generar y exportar reportes de producción."""

    CACHE_TIMEOUT = 5  # 5 segundos (evita “amarrarse” entre altas seguidas)
    _CACHE_VERSION = "1.2"

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
        Genera reporte detallado de una cosecha específica.

        NOTA: 'formato' sólo afecta la clave de caché para coherencia con el resto del sistema.
        """
        cache_key = ReportesProduccionService._generar_cache_key(
            "cosecha",
            {"cosecha_id": cosecha_id, "formato": formato},
        )
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached:
                return cached

        # Carga optimizada
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
        hectareas = D(getattr(origen, "hectareas", 0))

        # Agregados (performantes)
        inv_qs = cosecha.inversiones.all()  # filtrado por is_active en prefetch
        ven_qs = cosecha.ventas.all()       # filtrado por is_active en prefetch

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
        total_cajas = int(ven_tot["total_cajas"] or 0)
        total_gastos_venta = D(ven_tot["total_gastos_venta"])

        # Derivados
        ganancia_bruta = total_ventas - total_gastos_venta
        ganancia_neta = ganancia_bruta - total_inversiones
        roi = (ganancia_neta / total_inversiones * D(100)) if total_inversiones > 0 else D(0)

        # Detalles (normalizando fecha a 'YYYY-MM-DD')
        detalle_inversiones: List[Dict[str, Any]] = []
        for inv in inv_qs.order_by("fecha"):
            gi = D(inv.gastos_insumos)
            gm = D(inv.gastos_mano_obra)
            total = gi + gm
            detalle_inversiones.append(
                {
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
            nc = int(v.num_cajas or 0)
            pxc = D(v.precio_por_caja)
            gasto = D(v.gasto)
            ingreso = pxc * D(nc)
            utilidad_neta_venta = ingreso - gasto  # utilidad por operación de venta (sin inversiones)
            detalle_ventas.append(
                {
                    "fecha": _date_only(getattr(v, "fecha_venta", None)),
                    "tipo_mango": safe_str(v.tipo_mango),
                    "num_cajas": nc,
                    "precio_por_caja": Flt(pxc),
                    "total_venta": Flt(ingreso),
                    "gasto": Flt(gasto),
                    "ganancia_neta": Flt(utilidad_neta_venta),
                }
            )

        reporte = {
            "metadata": {
                "tipo": "cosecha",
                "fecha_generacion": timezone.now().isoformat(),
                "generado_por": getattr(usuario, "username", safe_str(usuario)),
                "cosecha_id": cosecha.id,
                "version": ReportesProduccionService._CACHE_VERSION,
            },
            "informacion_general": {
                "huerta_nombre": safe_str(origen) if origen else "N/A",
                "huerta_tipo": "Rentada" if cosecha.huerta_rentada_id else "Propia",
                "propietario": safe_str(getattr(origen, "propietario", "")) if origen else "N/A",
                "temporada_año": getattr(cosecha.temporada, "año", None),
                "cosecha_nombre": safe_str(cosecha.nombre),
                "fecha_inicio": _date_only(cosecha.fecha_inicio),
                "fecha_fin": _date_only(cosecha.fecha_fin),
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
        """
        Genera reporte consolidado de una temporada (reutiliza reporte de cosecha para consistencia).
        """
        cache_key = ReportesProduccionService._generar_cache_key(
            "temporada", {"temporada_id": temporada_id, "formato": formato}
        )
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached:
                return cached

        try:
            temporada = (
                Temporada.objects.select_related("huerta__propietario", "huerta_rentada__propietario", "huerta", "huerta_rentada")
                .prefetch_related(
                    Prefetch(
                        "cosechas",
                        queryset=Cosecha.objects.filter(is_active=True).prefetch_related(
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
        hectareas = D(getattr(origen, "hectareas", 0))

        total_inversiones = D(0)
        total_ventas = D(0)
        total_cajas = 0
        cosechas_data: List[Dict[str, Any]] = []

        for c in cosechas:
            try:
                rep_c = ReportesProduccionService.generar_reporte_cosecha(c.id, usuario, "json", force_refresh=force_refresh)
                inv_c = D(rep_c["resumen_financiero"]["total_inversiones"])
                ven_c = D(rep_c["resumen_financiero"]["total_ventas"])
                gan_c = D(rep_c["resumen_financiero"]["ganancia_neta"])
                roi_c = D(rep_c["resumen_financiero"]["roi_porcentaje"])
                cajas_c = int(rep_c["metricas_rendimiento"]["cajas_totales"])

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
                total_cajas += cajas_c
            except Exception as e:
                # Continuar con otras cosechas sin romper reporte completo
                print(f"[reporte_temporada] Error procesando cosecha {c.id}: {e}")
                continue

        ganancia_neta = total_ventas - total_inversiones
        roi_temporada = (ganancia_neta / total_inversiones * D(100)) if total_inversiones > 0 else D(0)

        # Agregados a nivel temporada (para análisis de categorías/variedades)
        todas_inversiones = InversionesHuerta.objects.filter(temporada=temporada, is_active=True).select_related("categoria")
        todas_ventas = Venta.objects.filter(temporada=temporada, is_active=True)

        reporte = {
            "metadata": {
                "tipo": "temporada",
                "fecha_generacion": timezone.now().isoformat(),
                "generado_por": getattr(usuario, "username", safe_str(usuario)),
                "temporada_id": temporada.id,
                "version": ReportesProduccionService._CACHE_VERSION,
            },
            "informacion_general": {
                "huerta_nombre": safe_str(origen) if origen else "N/A",
                "huerta_tipo": "Rentada" if temporada.huerta_rentada_id else "Propia",
                "propietario": safe_str(getattr(origen, "propietario", "")) if origen else "N/A",
                "temporada_año": getattr(temporada, "año", None),
                "fecha_inicio": _date_only(temporada.fecha_inicio),
                "fecha_fin": _date_only(temporada.fecha_fin),
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

        ReportesProduccionService._validar_integridad_reporte(reporte)
        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        return reporte

    # --------------------------
    # PERFIL DE HUERTA
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
        """
        Genera perfil histórico de una huerta (propia o rentada) para los últimos N años disponibles.
        """
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
        suma_roi = D(0)
        total_años_validos = 0

        for temporada in temporadas:
            try:
                rep_t = ReportesProduccionService.generar_reporte_temporada(temporada.id, usuario, "json", force_refresh=force_refresh)
                datos_historicos.append(
                    {
                        "año": getattr(temporada, "año", None),
                        "inversion": rep_t["resumen_ejecutivo"]["inversion_total"],
                        "ventas": rep_t["resumen_ejecutivo"]["ventas_totales"],
                        "ganancia": rep_t["resumen_ejecutivo"]["ganancia_neta"],
                        "roi": rep_t["resumen_ejecutivo"]["roi_temporada"],
                        "productividad": rep_t["resumen_ejecutivo"]["cajas_totales"],
                        "cosechas_count": rep_t["informacion_general"]["total_cosechas"],
                    }
                )
                suma_roi += D(rep_t["resumen_ejecutivo"]["roi_temporada"])
                total_años_validos += 1
            except Exception as e:
                print(f"[perfil_huerta] Error procesando temporada {temporada.id}: {e}")  # noqa
                continue

        roi_promedio = suma_roi / D(total_años_validos) if total_años_validos > 0 else D(0)

        tendencias = ReportesProduccionService._calcular_tendencias(datos_historicos)
        analisis_eficiencia = ReportesProduccionService._analizar_eficiencia_historica(datos_historicos, roi_promedio)
        proyecciones = ReportesProduccionService._generar_proyecciones(datos_historicos, origen)

        reporte = {
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
                "propietario": safe_str(getattr(origen, "propietario", "")),
                "ubicacion": safe_str(getattr(origen, "ubicacion", "")),
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

        ReportesProduccionService._validar_integridad_reporte(reporte)
        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        return reporte

    # --------------------------
    # Exportación (PDF / Excel)
    # --------------------------
    @staticmethod
    def exportar_cosecha(cosecha_id: int, usuario, formato: str) -> bytes:
        """
        Devuelve bytes del archivo exportado (PDF/Excel) siempre a partir del JSON más reciente.
        """
        rep = ReportesProduccionService.generar_reporte_cosecha(cosecha_id, usuario, "json", force_refresh=True)
        if formato.lower() == "pdf":
            return ExportacionService.generar_pdf_cosecha(rep)
        elif formato.lower() in ("excel", "xlsx"):
            return ExportacionService.generar_excel_cosecha(rep)
        raise ValidationError("Formato no soportado para exportación")

    @staticmethod
    def exportar_temporada(temporada_id: int, usuario, formato: str) -> bytes:
        rep = ReportesProduccionService.generar_reporte_temporada(temporada_id, usuario, "json", force_refresh=True)
        if formato.lower() == "pdf":
            return ExportacionService.generar_pdf_temporada(rep)
        elif formato.lower() in ("excel", "xlsx"):
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
        elif formato.lower() in ("excel", "xlsx"):
            return ExportacionService.generar_excel_perfil_huerta(rep)
        raise ValidationError("Formato no soportado para exportación")

    # =========================
    # Auxiliares privados
    # =========================

    @staticmethod
    def _generar_cache_key(tipo_reporte: str, parametros: Dict[str, Any]) -> str:
        data = {"tipo": tipo_reporte, "params": parametros, "version": ReportesProduccionService._CACHE_VERSION}
        s = json.dumps(data, sort_keys=True, default=str)
        return f"reporte_{hashlib.md5(s.encode()).hexdigest()}"

    @staticmethod
    def _validar_permisos_cosecha(usuario, cosecha) -> bool:
        # Admin/superuser entra siempre
        if getattr(usuario, "is_superuser", False) or getattr(usuario, "is_staff", False):
            return True
        # Permiso explícito del modelo
        if hasattr(usuario, "has_perm") and usuario.has_perm("gestion_huerta.view_cosecha"):
            return True
        # Regla relajada: si existe huerta asociada
        origen = cosecha.huerta or cosecha.huerta_rentada
        return origen is not None

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
            acc[nombre] = acc.get(nombre, D(0)) + total
        out = []
        for k, v in sorted(acc.items(), key=lambda x: x[1], reverse=True):
            out.append({"categoria": k, "total": Flt(v), "porcentaje": Flt(v / total_inversiones * D(100))})
        return out

    @staticmethod
    def _analizar_variedades_ventas(ventas_qs, total_ventas: Decimal) -> List[Dict[str, Any]]:
        if total_ventas <= 0:
            return []
        acc: Dict[str, Dict[str, Any]] = {}
        for v in ventas_qs:
            variedad = safe_str(getattr(v, "tipo_mango", "Sin variedad")) or "Sin variedad"
            ingreso = D(v.precio_por_caja) * D(v.num_cajas)
            data = acc.get(variedad) or {"total_cajas": 0, "total_venta": D(0), "precios": []}
            data["total_cajas"] += int(v.num_cajas or 0)
            data["total_venta"] = data["total_venta"] + ingreso
            data["precios"].append(D(v.precio_por_caja))
            acc[variedad] = data
        out = []
        for variedad, d in acc.items():
            prom = (sum(d["precios"], D(0)) / D(len(d["precios"]))) if d["precios"] else D(0)
            out.append(
                {
                    "variedad": variedad,
                    "total_cajas": int(d["total_cajas"]),
                    "precio_promedio": Flt(prom),
                    "total_venta": Flt(d["total_venta"]),
                    "porcentaje": Flt(d["total_venta"] / total_ventas * D(100)),
                }
            )
        return sorted(out, key=lambda x: x["total_venta"], reverse=True)

    @staticmethod
    def _calcular_tendencias(datos_historicos: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Calcula tendencias de crecimiento: CAGR simple para ventas/ganancia/productividad
        y diferencia anual promedio de ROI.
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

    @staticmethod
    def _analizar_eficiencia_historica(datos_historicos: List[Dict[str, Any]], roi_promedio: Decimal) -> Dict[str, Any]:
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

        # tendencia por regresión lineal simple sobre índices (0..n-1)
        n = len(rois)
        sx = sum(range(n))
        sy = sum(rois)
        sxy = sum(i * r for i, r in enumerate(rois))
        sx2 = sum(i * i for i in range(n))
        denom = (n * sx2 - sx * sx)
        pend = (n * sxy - sx * sy) / denom if denom else 0.0
        tendencia = "Creciente" if pend > 0.5 else ("Decreciente" if pend < -0.5 else "Estable")

        return {
            "mejor_temporada": {"año": mejor["año"], "roi": Flt(mejor["roi"])},
            "peor_temporada": {"año": peor["año"], "roi": Flt(peor["roi"])},
            "roi_promedio_historico": Flt(roi_promedio),
            "variabilidad_roi": round(std, 2),
            "tendencia": tendencia,
        }

    @staticmethod
    def _generar_proyecciones(datos_historicos: List[Dict[str, Any]], _origen) -> Dict[str, Any]:
        """
        Proyección simple basada en promedio de últimos 3 años disponibles.
        Incluye recomendaciones y alertas heurísticas.
        """
        if len(datos_historicos) < 2:
            return {
                "proyeccion_proxima_temporada": 0,
                "roi_esperado": 0,
                "recomendaciones": ["Insuficientes datos históricos para proyecciones"],
                "alertas": [],
            }
        # Tomamos últimos 3 registros por año (ordenados desc en origen; aseguramos)
        datos_ordenados = sorted(datos_historicos, key=lambda x: x["año"], reverse=True)
        ult = datos_ordenados[:3]
        prom_ventas = sum(Flt(d["ventas"]) for d in ult) / len(ult)
        prom_roi = sum(Flt(d["roi"]) for d in ult) / len(ult)

        recs: List[str] = []
        alerts: List[str] = []

        if prom_roi < 50:
            alerts.append("ROI por debajo del 50% - Revisar estrategia de costos y precios")

        # Tendencia decreciente (orden cronológico)
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

    @staticmethod
    def _validar_integridad_reporte(reporte_data: Dict[str, Any]) -> bool:
        """
        Validaciones de integridad:
        - Suma de detalle_inversiones == total_inversiones (tolerancia 1 centavo)
        - Suma de detalle_ventas == total_ventas (tolerancia 1 centavo)
        - Fecha de generación no debe estar >5 minutos en el futuro
        """
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

            # Fecha de generación
            fecha_str = meta.get("fecha_generacion")
            if fecha_str:
                # Manejar formateo ISO (si viene con Z)
                if fecha_str.endswith("Z"):
                    fecha_str = fecha_str[:-1] + "+00:00"
                dt = datetime.fromisoformat(fecha_str)
                if dt > timezone.now() + timedelta(minutes=5):
                    raise ValidationError("Fecha de generación inválida")

            return True
        except Exception as e:
            raise ValidationError(f"Error en validación de integridad: {str(e)}")
