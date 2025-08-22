"""
Servicio robusto para generar reportes de producción con validaciones de integridad,
cache inteligente y optimización de consultas.
"""

from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
import hashlib
import json

from django.db.models import Sum, Avg, Count, F, Q, Prefetch
from django.db.models.functions import TruncMonth, Coalesce
from django.utils import timezone
from django.core.exceptions import ValidationError, PermissionDenied
from django.core.cache import cache
from django.db import transaction

from gestion_huerta.models import (
    Cosecha, Temporada, Huerta, HuertaRentada, 
    InversionesHuerta, Venta, Propietario
)


class ReportesProduccionService:
    """Servicio principal para generar reportes de producción"""
    
    CACHE_TIMEOUT = 3600  # 1 hora
    
    @staticmethod
    def generar_reporte_cosecha(cosecha_id: int, usuario, formato: str = 'json') -> Dict[str, Any]:
        """Genera reporte detallado de una cosecha específica"""
        
        # Generar cache key
        cache_key = ReportesProduccionService._generar_cache_key(
            'cosecha', {'cosecha_id': cosecha_id, 'formato': formato}
        )
        
        # Intentar obtener del cache
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Optimizar consulta con prefetch
        cosecha = Cosecha.objects.select_related(
            'temporada__huerta__propietario',
            'temporada__huerta_rentada__propietario'
        ).prefetch_related(
            Prefetch(
                'inversiones', 
                queryset=InversionesHuerta.objects.filter(is_active=True).select_related('categoria')
            ),
            Prefetch(
                'ventas',
                queryset=Venta.objects.filter(is_active=True)
            )
        ).get(id=cosecha_id)
        
        # Validar permisos
        if not ReportesProduccionService._validar_permisos_cosecha(usuario, cosecha):
            raise PermissionDenied("Sin permisos para generar este reporte")
        
        # Calcular datos financieros
        inversiones = cosecha.inversiones.all()  # Ya filtradas por is_active en prefetch
        ventas = cosecha.ventas.all()  # Ya filtradas por is_active en prefetch
        
        # Totales con validación de tipos
        total_inversiones = Decimal('0')
        for inv in inversiones:
            total_inversiones += (inv.gastos_insumos or Decimal('0')) + (inv.gastos_mano_obra or Decimal('0'))
        
        total_ventas = Decimal('0')
        total_gastos_venta = Decimal('0')
        total_cajas = 0
        
        for venta in ventas:
            venta_total = Decimal(str(venta.num_cajas)) * Decimal(str(venta.precio_por_caja))
            total_ventas += venta_total
            total_gastos_venta += Decimal(str(venta.gasto))
            total_cajas += venta.num_cajas
        
        # Cálculos derivados
        ganancia_bruta = total_ventas - total_gastos_venta
        ganancia_neta = ganancia_bruta - total_inversiones
        roi = (ganancia_neta / total_inversiones * 100) if total_inversiones > 0 else Decimal('0')
        
        # Obtener información de la huerta
        origen = cosecha.huerta or cosecha.huerta_rentada
        hectareas = Decimal(str(origen.hectareas)) if origen else Decimal('1')
        
        # Construir reporte
        reporte = {
            'metadata': {
                'tipo': 'cosecha',
                'fecha_generacion': timezone.now().isoformat(),
                'generado_por': usuario.username,
                'cosecha_id': cosecha.id,
                'version': '1.0'
            },
            'informacion_general': {
                'huerta_nombre': str(origen) if origen else 'N/A',
                'huerta_tipo': 'Rentada' if cosecha.huerta_rentada else 'Propia',
                'propietario': str(origen.propietario) if origen else 'N/A',
                'temporada_año': cosecha.temporada.año,
                'cosecha_nombre': cosecha.nombre,
                'fecha_inicio': cosecha.fecha_inicio.isoformat() if cosecha.fecha_inicio else None,
                'fecha_fin': cosecha.fecha_fin.isoformat() if cosecha.fecha_fin else None,
                'estado': 'Finalizada' if cosecha.finalizada else 'Activa',
                'hectareas': float(hectareas),
            },
            'resumen_financiero': {
                'total_inversiones': float(total_inversiones),
                'total_ventas': float(total_ventas),
                'total_gastos_venta': float(total_gastos_venta),
                'ganancia_bruta': float(ganancia_bruta),
                'ganancia_neta': float(ganancia_neta),
                'roi_porcentaje': float(roi),
                'ganancia_por_hectarea': float(ganancia_neta / hectareas) if hectareas > 0 else 0,
            },
            'detalle_inversiones': [
                {
                    'fecha': inv.fecha.isoformat(),
                    'categoria': inv.categoria.nombre,
                    'gastos_insumos': float(inv.gastos_insumos or 0),
                    'gastos_mano_obra': float(inv.gastos_mano_obra or 0),
                    'total': float((inv.gastos_insumos or Decimal('0')) + (inv.gastos_mano_obra or Decimal('0'))),
                    'descripcion': inv.descripcion or '',
                }
                for inv in inversiones.order_by('fecha')
            ],
            'detalle_ventas': [
                {
                    'fecha': venta.fecha_venta.isoformat(),
                    'tipo_mango': venta.tipo_mango,
                    'num_cajas': venta.num_cajas,
                    'precio_por_caja': float(venta.precio_por_caja),
                    'total_venta': float(Decimal(str(venta.num_cajas)) * Decimal(str(venta.precio_por_caja))),
                    'gasto': float(venta.gasto),
                    'ganancia_neta': float(venta.ganancia_neta),
                }
                for venta in ventas.order_by('fecha_venta')
            ],
            'analisis_categorias': ReportesProduccionService._analizar_categorias_inversiones(inversiones, total_inversiones),
            'analisis_variedades': ReportesProduccionService._analizar_variedades_ventas(ventas, total_ventas),
            'metricas_rendimiento': {
                'cajas_totales': total_cajas,
                'cajas_por_hectarea': float(total_cajas / hectareas) if hectareas > 0 else 0,
                'precio_promedio_caja': float(total_ventas / total_cajas) if total_cajas > 0 else 0,
                'costo_por_caja': float(total_inversiones / total_cajas) if total_cajas > 0 else 0,
                'margen_por_caja': float(ganancia_neta / total_cajas) if total_cajas > 0 else 0,
            }
        }
        
        # Validar integridad antes de cachear
        ReportesProduccionService._validar_integridad_reporte(reporte)
        
        # Guardar en cache
        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        
        return reporte
    
    @staticmethod
    def generar_reporte_temporada(temporada_id: int, usuario, formato: str = 'json') -> Dict[str, Any]:
        """Genera reporte consolidado de una temporada"""
        
        cache_key = ReportesProduccionService._generar_cache_key(
            'temporada', {'temporada_id': temporada_id, 'formato': formato}
        )
        
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Optimizar consulta
        temporada = Temporada.objects.select_related(
            'huerta__propietario',
            'huerta_rentada__propietario'
        ).prefetch_related(
            Prefetch(
                'cosechas', 
                queryset=Cosecha.objects.filter(is_active=True).prefetch_related(
                    Prefetch(
                        'inversiones',
                        queryset=InversionesHuerta.objects.filter(is_active=True).select_related('categoria')
                    ),
                    Prefetch(
                        'ventas',
                        queryset=Venta.objects.filter(is_active=True)
                    )
                )
            )
        ).get(id=temporada_id)
        
        # Validar permisos
        if not ReportesProduccionService._validar_permisos_temporada(usuario, temporada):
            raise PermissionDenied("Sin permisos para generar este reporte")
        
        cosechas = temporada.cosechas.all()
        origen = temporada.huerta or temporada.huerta_rentada
        hectareas = Decimal(str(origen.hectareas)) if origen else Decimal('1')
        
        # Calcular totales de la temporada
        total_inversiones = Decimal('0')
        total_ventas = Decimal('0')
        total_cajas = 0
        cosechas_data = []
        
        for cosecha in cosechas:
            # Usar el servicio de cosecha para consistencia
            try:
                reporte_cosecha = ReportesProduccionService.generar_reporte_cosecha(
                    cosecha.id, usuario, 'json'
                )
                
                inv_cosecha = Decimal(str(reporte_cosecha['resumen_financiero']['total_inversiones']))
                ven_cosecha = Decimal(str(reporte_cosecha['resumen_financiero']['total_ventas']))
                gan_cosecha = Decimal(str(reporte_cosecha['resumen_financiero']['ganancia_neta']))
                roi_cosecha = Decimal(str(reporte_cosecha['resumen_financiero']['roi_porcentaje']))
                cajas_cosecha = reporte_cosecha['metricas_rendimiento']['cajas_totales']
                
                cosechas_data.append({
                    'nombre': cosecha.nombre,
                    'inversion': float(inv_cosecha),
                    'ventas': float(ven_cosecha),
                    'ganancia': float(gan_cosecha),
                    'roi': float(roi_cosecha),
                    'cajas': cajas_cosecha,
                })
                
                total_inversiones += inv_cosecha
                total_ventas += ven_cosecha
                total_cajas += cajas_cosecha
                
            except Exception as e:
                # Log error pero continúa con otras cosechas
                print(f"Error procesando cosecha {cosecha.id}: {e}")
                continue
        
        ganancia_neta = total_ventas - total_inversiones
        roi_temporada = (ganancia_neta / total_inversiones * 100) if total_inversiones > 0 else Decimal('0')
        
        # Análisis agregado de toda la temporada
        todas_inversiones = InversionesHuerta.objects.filter(
            temporada=temporada, is_active=True
        ).select_related('categoria')
        
        todas_ventas = Venta.objects.filter(
            temporada=temporada, is_active=True
        )
        
        reporte = {
            'metadata': {
                'tipo': 'temporada',
                'fecha_generacion': timezone.now().isoformat(),
                'generado_por': usuario.username,
                'temporada_id': temporada.id,
                'version': '1.0'
            },
            'informacion_general': {
                'huerta_nombre': str(origen) if origen else 'N/A',
                'huerta_tipo': 'Rentada' if temporada.huerta_rentada else 'Propia',
                'propietario': str(origen.propietario) if origen else 'N/A',
                'temporada_año': temporada.año,
                'fecha_inicio': temporada.fecha_inicio.isoformat(),
                'fecha_fin': temporada.fecha_fin.isoformat() if temporada.fecha_fin else None,
                'estado': 'Finalizada' if temporada.finalizada else 'Activa',
                'total_cosechas': len(cosechas_data),
                'hectareas': float(hectareas),
            },
            'resumen_ejecutivo': {
                'inversion_total': float(total_inversiones),
                'ventas_totales': float(total_ventas),
                'ganancia_neta': float(ganancia_neta),
                'roi_temporada': float(roi_temporada),
                'productividad': float(total_cajas / hectareas) if hectareas > 0 else 0,
                'cajas_totales': total_cajas,
            },
            'comparativo_cosechas': cosechas_data,
            'analisis_categorias': ReportesProduccionService._analizar_categorias_inversiones(
                todas_inversiones, total_inversiones
            ),
            'analisis_variedades': ReportesProduccionService._analizar_variedades_ventas(
                todas_ventas, total_ventas
            ),
            'metricas_eficiencia': {
                'costo_por_hectarea': float(total_inversiones / hectareas) if hectareas > 0 else 0,
                'ingreso_por_hectarea': float(total_ventas / hectareas) if hectareas > 0 else 0,
                'ganancia_por_hectarea': float(ganancia_neta / hectareas) if hectareas > 0 else 0,
                'cajas_por_hectarea': float(total_cajas / hectareas) if hectareas > 0 else 0,
                'precio_promedio_caja': float(total_ventas / total_cajas) if total_cajas > 0 else 0,
            }
        }
        
        # Validar integridad
        ReportesProduccionService._validar_integridad_reporte(reporte)
        
        # Guardar en cache
        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        
        return reporte
    
    @staticmethod
    def generar_perfil_huerta(
        huerta_id: Optional[int], 
        huerta_rentada_id: Optional[int], 
        usuario, 
        años: int = 5,
        formato: str = 'json'
    ) -> Dict[str, Any]:
        """Genera perfil histórico de una huerta"""
        
        if not huerta_id and not huerta_rentada_id:
            raise ValidationError("Debe especificar huerta_id o huerta_rentada_id")
        
        cache_key = ReportesProduccionService._generar_cache_key(
            'perfil_huerta', {
                'huerta_id': huerta_id,
                'huerta_rentada_id': huerta_rentada_id,
                'años': años,
                'formato': formato
            }
        )
        
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Obtener huerta
        if huerta_id:
            origen = Huerta.objects.select_related('propietario').get(id=huerta_id)
            temporadas = origen.temporadas.filter(is_active=True).order_by('-año')[:años]
        else:
            origen = HuertaRentada.objects.select_related('propietario').get(id=huerta_rentada_id)
            temporadas = origen.temporadas.filter(is_active=True).order_by('-año')[:años]
        
        # Validar permisos
        if not ReportesProduccionService._validar_permisos_huerta(usuario, origen):
            raise PermissionDenied("Sin permisos para generar este reporte")
        
        # Datos históricos por año
        datos_historicos = []
        suma_roi = Decimal('0')
        total_años = 0
        
        for temporada in temporadas:
            try:
                reporte_temp = ReportesProduccionService.generar_reporte_temporada(
                    temporada.id, usuario, 'json'
                )
                
                datos_historicos.append({
                    'año': temporada.año,
                    'inversion': reporte_temp['resumen_ejecutivo']['inversion_total'],
                    'ventas': reporte_temp['resumen_ejecutivo']['ventas_totales'],
                    'ganancia': reporte_temp['resumen_ejecutivo']['ganancia_neta'],
                    'roi': reporte_temp['resumen_ejecutivo']['roi_temporada'],
                    'productividad': reporte_temp['resumen_ejecutivo']['cajas_totales'],
                    'cosechas_count': reporte_temp['informacion_general']['total_cosechas'],
                })
                
                suma_roi += Decimal(str(reporte_temp['resumen_ejecutivo']['roi_temporada']))
                total_años += 1
                
            except Exception as e:
                print(f"Error procesando temporada {temporada.id}: {e}")
                continue
        
        # Calcular métricas históricas
        roi_promedio = suma_roi / total_años if total_años > 0 else Decimal('0')
        
        # Análisis de tendencias
        tendencias = ReportesProduccionService._calcular_tendencias(datos_historicos)
        analisis_eficiencia = ReportesProduccionService._analizar_eficiencia_historica(datos_historicos, roi_promedio)
        proyecciones = ReportesProduccionService._generar_proyecciones(datos_historicos, origen)
        
        reporte = {
            'metadata': {
                'tipo': 'perfil_huerta',
                'fecha_generacion': timezone.now().isoformat(),
                'generado_por': usuario.username,
                'huerta_id': huerta_id,
                'huerta_rentada_id': huerta_rentada_id,
                'años_analizados': años,
                'version': '1.0'
            },
            'informacion_general': {
                'huerta_nombre': origen.nombre,
                'huerta_tipo': 'Rentada' if huerta_rentada_id else 'Propia',
                'propietario': str(origen.propietario),
                'ubicacion': origen.ubicacion,
                'hectareas': float(origen.hectareas),
                'variedades': origen.variedades,
                'años_operacion': total_años,
                'temporadas_analizadas': len(datos_historicos),
            },
            'resumen_historico': datos_historicos,
            'tendencias_crecimiento': tendencias,
            'analisis_eficiencia': analisis_eficiencia,
            'proyecciones': proyecciones,
        }
        
        # Validar integridad
        ReportesProduccionService._validar_integridad_reporte(reporte)
        
        # Guardar en cache
        cache.set(cache_key, reporte, ReportesProduccionService.CACHE_TIMEOUT)
        
        return reporte
    
    # Métodos auxiliares privados
    
    @staticmethod
    def _generar_cache_key(tipo_reporte: str, parametros: Dict[str, Any]) -> str:
        """Genera clave única para cache"""
        cache_data = {
            'tipo': tipo_reporte,
            'params': sorted(parametros.items()),
            'version': '1.0'
        }
        cache_string = json.dumps(cache_data, sort_keys=True, default=str)
        return f"reporte_{hashlib.md5(cache_string.encode()).hexdigest()}"
    
    @staticmethod
    def _validar_permisos_cosecha(usuario, cosecha) -> bool:
        """Valida permisos para acceder a reporte de cosecha"""
        # Implementar lógica de permisos según roles
        if usuario.is_superuser:
            return True
        
        # Verificar si el usuario tiene permisos sobre la huerta
        origen = cosecha.huerta or cosecha.huerta_rentada
        if origen and hasattr(origen, 'propietario'):
            # Aquí puedes agregar lógica específica de permisos
            return True
        
        return usuario.has_perm('gestion_huerta.view_cosecha')
    
    @staticmethod
    def _validar_permisos_temporada(usuario, temporada) -> bool:
        """Valida permisos para acceder a reporte de temporada"""
        if usuario.is_superuser:
            return True
        return usuario.has_perm('gestion_huerta.view_temporada')
    
    @staticmethod
    def _validar_permisos_huerta(usuario, huerta) -> bool:
        """Valida permisos para acceder a perfil de huerta"""
        if usuario.is_superuser:
            return True
        return usuario.has_perm('gestion_huerta.view_huerta')
    
    @staticmethod
    def _analizar_categorias_inversiones(inversiones, total_inversiones: Decimal) -> List[Dict[str, Any]]:
        """Analiza distribución de inversiones por categoría"""
        if total_inversiones == 0:
            return []
        
        categorias = {}
        for inv in inversiones:
            categoria = inv.categoria.nombre
            total = (inv.gastos_insumos or Decimal('0')) + (inv.gastos_mano_obra or Decimal('0'))
            if categoria in categorias:
                categorias[categoria] += total
            else:
                categorias[categoria] = total
        
        return [
            {
                'categoria': categoria,
                'total': float(total),
                'porcentaje': float(total / total_inversiones * 100),
            }
            for categoria, total in sorted(categorias.items(), key=lambda x: x[1], reverse=True)
        ]
    
    @staticmethod
    def _analizar_variedades_ventas(ventas, total_ventas: Decimal) -> List[Dict[str, Any]]:
        """Analiza distribución de ventas por variedad"""
        if total_ventas == 0:
            return []
        
        variedades = {}
        for venta in ventas:
            variedad = venta.tipo_mango
            total_venta = Decimal(str(venta.num_cajas)) * Decimal(str(venta.precio_por_caja))
            
            if variedad in variedades:
                variedades[variedad]['total_cajas'] += venta.num_cajas
                variedades[variedad]['total_venta'] += total_venta
                variedades[variedad]['precios'].append(Decimal(str(venta.precio_por_caja)))
            else:
                variedades[variedad] = {
                    'total_cajas': venta.num_cajas,
                    'total_venta': total_venta,
                    'precios': [Decimal(str(venta.precio_por_caja))]
                }
        
        resultado = []
        for variedad, datos in variedades.items():
            precio_promedio = sum(datos['precios']) / len(datos['precios'])
            resultado.append({
                'variedad': variedad,
                'total_cajas': datos['total_cajas'],
                'precio_promedio': float(precio_promedio),
                'total_venta': float(datos['total_venta']),
                'porcentaje': float(datos['total_venta'] / total_ventas * 100),
            })
        
        return sorted(resultado, key=lambda x: x['total_venta'], reverse=True)
    
    @staticmethod
    def _calcular_tendencias(datos_historicos: List[Dict]) -> Dict[str, float]:
        """Calcula tendencias de crecimiento"""
        if len(datos_historicos) < 2:
            return {
                'crecimiento_ventas_anual': 0.0,
                'crecimiento_ganancia_anual': 0.0,
                'mejora_roi': 0.0,
                'incremento_productividad': 0.0,
            }
        
        # Ordenar por año (más antiguo primero)
        datos_ordenados = sorted(datos_historicos, key=lambda x: x['año'])
        primer_año = datos_ordenados[0]
        ultimo_año = datos_ordenados[-1]
        años_transcurridos = ultimo_año['año'] - primer_año['año']
        
        if años_transcurridos == 0:
            return {
                'crecimiento_ventas_anual': 0.0,
                'crecimiento_ganancia_anual': 0.0,
                'mejora_roi': 0.0,
                'incremento_productividad': 0.0,
            }
        
        # Calcular tasas de crecimiento anual
        crecimiento_ventas = 0.0
        if primer_año['ventas'] > 0:
            crecimiento_ventas = ((ultimo_año['ventas'] / primer_año['ventas']) ** (1/años_transcurridos) - 1) * 100
        
        crecimiento_ganancia = 0.0
        if primer_año['ganancia'] != 0:
            if primer_año['ganancia'] > 0:
                crecimiento_ganancia = ((ultimo_año['ganancia'] / primer_año['ganancia']) ** (1/años_transcurridos) - 1) * 100
            else:
                # Manejo especial para ganancias negativas
                crecimiento_ganancia = (ultimo_año['ganancia'] - primer_año['ganancia']) / años_transcurridos
        
        mejora_roi = (ultimo_año['roi'] - primer_año['roi']) / años_transcurridos
        
        incremento_productividad = 0.0
        if primer_año['productividad'] > 0:
            incremento_productividad = ((ultimo_año['productividad'] / primer_año['productividad']) ** (1/años_transcurridos) - 1) * 100
        
        return {
            'crecimiento_ventas_anual': round(crecimiento_ventas, 2),
            'crecimiento_ganancia_anual': round(crecimiento_ganancia, 2),
            'mejora_roi': round(mejora_roi, 2),
            'incremento_productividad': round(incremento_productividad, 2),
        }
    
    @staticmethod
    def _analizar_eficiencia_historica(datos_historicos: List[Dict], roi_promedio: Decimal) -> Dict[str, Any]:
        """Analiza eficiencia histórica"""
        if not datos_historicos:
            return {
                'mejor_temporada': {'año': None, 'roi': 0},
                'peor_temporada': {'año': None, 'roi': 0},
                'roi_promedio_historico': 0.0,
                'variabilidad_roi': 0.0,
                'tendencia': 'Insuficientes datos',
            }
        
        mejor_temporada = max(datos_historicos, key=lambda x: x['roi'])
        peor_temporada = min(datos_historicos, key=lambda x: x['roi'])
        
        # Calcular desviación estándar del ROI
        rois = [d['roi'] for d in datos_historicos]
        variabilidad_roi = ReportesProduccionService._calcular_desviacion_estandar(rois)
        
        # Determinar tendencia
        tendencia = ReportesProduccionService._determinar_tendencia_roi(datos_historicos)
        
        return {
            'mejor_temporada': {
                'año': mejor_temporada['año'],
                'roi': mejor_temporada['roi'],
            },
            'peor_temporada': {
                'año': peor_temporada['año'],
                'roi': peor_temporada['roi'],
            },
            'roi_promedio_historico': float(roi_promedio),
            'variabilidad_roi': variabilidad_roi,
            'tendencia': tendencia,
        }
    
    @staticmethod
    def _calcular_desviacion_estandar(valores: List[float]) -> float:
        """Calcula desviación estándar de una lista de valores"""
        if len(valores) < 2:
            return 0.0
        
        promedio = sum(valores) / len(valores)
        varianza = sum((x - promedio) ** 2 for x in valores) / len(valores)
        return round(varianza ** 0.5, 2)
    
    @staticmethod
    def _determinar_tendencia_roi(datos_historicos: List[Dict]) -> str:
        """Determina la tendencia basada en los datos históricos"""
        if len(datos_historicos) < 2:
            return 'Insuficientes datos'
        
        # Ordenar por año
        datos_ordenados = sorted(datos_historicos, key=lambda x: x['año'])
        rois = [d['roi'] for d in datos_ordenados]
        
        # Calcular pendiente simple usando regresión lineal básica
        n = len(rois)
        suma_x = sum(range(n))
        suma_y = sum(rois)
        suma_xy = sum(i * roi for i, roi in enumerate(rois))
        suma_x2 = sum(i ** 2 for i in range(n))
        
        if n * suma_x2 - suma_x ** 2 == 0:
            return 'Estable'
        
        pendiente = (n * suma_xy - suma_x * suma_y) / (n * suma_x2 - suma_x ** 2)
        
        if pendiente > 0.5:
            return 'Creciente'
        elif pendiente < -0.5:
            return 'Decreciente'
        else:
            return 'Estable'
    
    @staticmethod
    def _generar_proyecciones(datos_historicos: List[Dict], origen) -> Dict[str, Any]:
        """Genera proyecciones basadas en datos históricos"""
        if len(datos_historicos) < 2:
            return {
                'proyeccion_proxima_temporada': 0,
                'roi_esperado': 0,
                'recomendaciones': ['Insuficientes datos históricos para proyecciones'],
                'alertas': [],
            }
        
        # Proyección simple basada en promedio de últimos 3 años
        ultimos_años = datos_historicos[:3] if len(datos_historicos) >= 3 else datos_historicos
        promedio_ventas = sum(d['ventas'] for d in ultimos_años) / len(ultimos_años)
        promedio_roi = sum(d['roi'] for d in ultimos_años) / len(ultimos_años)
        
        recomendaciones = []
        alertas = []
        
        # Generar recomendaciones basadas en tendencias
        if promedio_roi < 50:
            alertas.append('ROI por debajo del 50% - Revisar estrategia de costos')
        
        if len(datos_historicos) >= 3:
            # Verificar tendencia decreciente en los últimos 3 años
            ultimos_3_rois = [d['roi'] for d in datos_historicos[:3]]
            if all(ultimos_3_rois[i] > ultimos_3_rois[i+1] for i in range(len(ultimos_3_rois)-1)):
                alertas.append('Tendencia decreciente en ROI - Requiere atención')
        
        # Recomendaciones basadas en análisis
        if promedio_roi > 70:
            recomendaciones.append('Excelente rendimiento - Considerar expansión')
        elif promedio_roi > 50:
            recomendaciones.append('Buen rendimiento - Mantener estrategia actual')
        else:
            recomendaciones.append('Rendimiento bajo - Revisar costos y estrategia de ventas')
        
        return {
            'proyeccion_proxima_temporada': round(promedio_ventas, 2),
            'roi_esperado': round(promedio_roi, 2),
            'recomendaciones': recomendaciones,
            'alertas': alertas,
        }
    
    @staticmethod
    def _validar_integridad_reporte(reporte_data: Dict[str, Any]) -> bool:
        """Valida la integridad de los datos del reporte"""
        try:
            # Verificar que los totales cuadren en reportes de cosecha
            if reporte_data.get('metadata', {}).get('tipo') == 'cosecha':
                if 'detalle_inversiones' in reporte_data:
                    total_calculado = sum(inv['total'] for inv in reporte_data['detalle_inversiones'])
                    total_reportado = reporte_data['resumen_financiero']['total_inversiones']
                    
                    if abs(total_calculado - total_reportado) > 0.01:  # Tolerancia de 1 centavo
                        raise ValidationError("Inconsistencia en totales de inversiones")
                
                if 'detalle_ventas' in reporte_data:
                    total_ventas_calculado = sum(venta['total_venta'] for venta in reporte_data['detalle_ventas'])
                    total_ventas_reportado = reporte_data['resumen_financiero']['total_ventas']
                    
                    if abs(total_ventas_calculado - total_ventas_reportado) > 0.01:
                        raise ValidationError("Inconsistencia en totales de ventas")
            
            # Verificar fechas válidas
            fecha_generacion = timezone.now()
            if 'metadata' in reporte_data:
                fecha_reporte_str = reporte_data['metadata']['fecha_generacion']
                # Manejar formato ISO con Z
                if fecha_reporte_str.endswith('Z'):
                    fecha_reporte_str = fecha_reporte_str[:-1] + '+00:00'
                
                fecha_reporte = datetime.fromisoformat(fecha_reporte_str)
                if fecha_reporte > fecha_generacion + timedelta(minutes=5):
                    raise ValidationError("Fecha de generación inválida")
            
            return True
            
        except Exception as e:
            raise ValidationError(f"Error en validación de integridad: {str(e)}")
