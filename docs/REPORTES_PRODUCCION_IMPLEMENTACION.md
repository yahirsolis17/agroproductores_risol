# Implementación de Reportes de Producción - Sistema Agroproductores Risol

## Análisis del Sistema Actual

### Arquitectura Identificada

El sistema presenta una arquitectura extremadamente sólida y consistente:

#### Backend (Django REST Framework)
- **Modelos robustos** con soft-delete, validaciones de negocio y cascadas controladas
- **Serializers con validaciones exhaustivas** que mantienen integridad de datos
- **ViewSets unificados** con NotificationHandler para respuestas consistentes
- **Paginación genérica** reutilizable (`GenericPagination`)
- **Sistema de permisos granular** con roles y permisos específicos
- **Manejo de errores centralizado** con mensajes de notificación estandarizados
- **Auditoria y logging** integrados en todas las operaciones

#### Frontend (React + TypeScript + Redux Toolkit)
- **Componentes reutilizables** como `TableLayout`, `ActionsMenu`, `PermissionButton`
- **Hooks personalizados** para cada entidad con manejo de estado consistente
- **Validaciones de formularios** con Formik + Yup y mensajes de error específicos
- **Sistema de notificaciones** unificado con `NotificationEngine`
- **Manejo de estados** centralizado con Redux Toolkit
- **Componentes de UI** consistentes con Material-UI y estilos Tailwind

### Patrones de Consistencia Identificados

1. **Validaciones de formularios**: Campos se marcan en rojo con mensajes específicos
2. **Paginación**: Implementada de forma consistente en backend y frontend
3. **Filtros**: Sistema unificado de filtros con autocomplete y búsqueda
4. **Manejo de errores**: Respuestas estandarizadas con códigos y mensajes específicos
5. **Permisos**: Sistema granular aplicado en toda la aplicación
6. **Soft-delete**: Archivado/restauración en cascada con auditoría
7. **Componentes reutilizables**: TableLayout, ActionsMenu, FormModals consistentes

## Especificación de Reportes de Producción

### 1. Reporte Individual por Cosecha

#### Descripción
Reporte detallado de una cosecha específica con toda su información financiera, inversiones, ventas y análisis de rentabilidad.

#### Estructura del Reporte
```
REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL
==========================================

INFORMACIÓN GENERAL
- Huerta: [Nombre] ([Tipo: Propia/Rentada])
- Propietario: [Nombre Completo]
- Temporada: [Año]
- Cosecha: [Nombre]
- Período: [Fecha Inicio] - [Fecha Fin]
- Estado: [Activa/Finalizada]
- Hectáreas: [X.X ha]

RESUMEN FINANCIERO
- Total Inversiones: $[XXX,XXX.XX]
- Total Ventas: $[XXX,XXX.XX]
- Ganancia Bruta: $[XXX,XXX.XX]
- Ganancia Neta: $[XXX,XXX.XX]
- ROI: [XX.X%]
- Ganancia por Hectárea: $[XXX,XXX.XX]

DETALLE DE INVERSIONES
┌─────────────┬──────────────┬─────────────┬─────────────┬─────────────┐
│ Fecha       │ Categoría    │ Insumos     │ Mano Obra   │ Total       │
├─────────────┼──────────────┼─────────────┼─────────────┼─────────────┤
│ 2024-01-15  │ Fertilizante │ $15,000.00  │ $5,000.00   │ $20,000.00  │
│ 2024-01-20  │ Pesticidas   │ $8,000.00   │ $3,000.00   │ $11,000.00  │
└─────────────┴──────────────┴─────────────┴─────────────┴─────────────┘

DETALLE DE VENTAS
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Fecha       │ Tipo Mango  │ Cajas       │ Precio/Caja │ Total       │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ 2024-06-15  │ Tommy       │ 500         │ $120.00     │ $60,000.00  │
│ 2024-06-20  │ Kent        │ 300         │ $150.00     │ $45,000.00  │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

ANÁLISIS POR CATEGORÍA DE INVERSIÓN
- Fertilizantes: $XX,XXX.XX (XX%)
- Pesticidas: $XX,XXX.XX (XX%)
- Mano de Obra: $XX,XXX.XX (XX%)
- Otros: $XX,XXX.XX (XX%)

MÉTRICAS DE RENDIMIENTO
- Cajas Totales Vendidas: [XXX]
- Cajas por Hectárea: [XXX]
- Precio Promedio por Caja: $[XXX.XX]
- Costo por Caja: $[XXX.XX]
- Margen por Caja: $[XXX.XX]

OBSERVACIONES
[Descripción de eventos relevantes, clima, problemas, etc.]
```

### 2. Reporte por Temporada

#### Descripción
Reporte consolidado de todas las cosechas de una temporada específica, con análisis comparativo entre cosechas y métricas globales.

#### Estructura del Reporte
```
REPORTE DE PRODUCCIÓN - TEMPORADA COMPLETA
==========================================

INFORMACIÓN GENERAL
- Huerta: [Nombre] ([Tipo: Propia/Rentada])
- Propietario: [Nombre Completo]
- Temporada: [Año]
- Período: [Fecha Inicio] - [Fecha Fin]
- Estado: [Activa/Finalizada]
- Total Cosechas: [X]

RESUMEN EJECUTIVO
- Inversión Total: $[XXX,XXX.XX]
- Ventas Totales: $[XXX,XXX.XX]
- Ganancia Neta: $[XXX,XXX.XX]
- ROI Temporada: [XX.X%]
- Productividad: [XXX cajas/ha]

COMPARATIVO POR COSECHA
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Cosecha     │ Inversión   │ Ventas      │ Ganancia    │ ROI         │ Cajas       │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Cosecha 1   │ $50,000.00  │ $85,000.00  │ $35,000.00  │ 70.0%       │ 650         │
│ Cosecha 2   │ $45,000.00  │ $78,000.00  │ $33,000.00  │ 73.3%       │ 580         │
│ Cosecha 3   │ $52,000.00  │ $92,000.00  │ $40,000.00  │ 76.9%       │ 720         │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

ANÁLISIS TEMPORAL DE INVERSIONES
[Gráfico de barras mostrando inversiones por mes]

ANÁLISIS TEMPORAL DE VENTAS
[Gráfico de líneas mostrando ventas por mes]

DISTRIBUCIÓN DE INVERSIONES POR CATEGORÍA
- Fertilizantes: $XX,XXX.XX (XX%)
- Pesticidas: $XX,XXX.XX (XX%)
- Mano de Obra: $XX,XXX.XX (XX%)
- Riego: $XX,XXX.XX (XX%)
- Otros: $XX,XXX.XX (XX%)

ANÁLISIS DE VARIEDADES DE MANGO
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Variedad    │ Cajas       │ Precio Prom │ Total       │ % del Total │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Tommy       │ 800         │ $125.00     │ $100,000.00 │ 45%         │
│ Kent        │ 600         │ $140.00     │ $84,000.00  │ 38%         │
│ Ataulfo     │ 350         │ $110.00     │ $38,500.00  │ 17%         │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

MÉTRICAS DE EFICIENCIA
- Costo por Hectárea: $[XXX,XXX.XX]
- Ingreso por Hectárea: $[XXX,XXX.XX]
- Ganancia por Hectárea: $[XXX,XXX.XX]
- Cajas por Hectárea: [XXX]
- Días Promedio por Cosecha: [XX]

RECOMENDACIONES
[Análisis automático basado en métricas y comparaciones]
```

### 3. Perfil de Huerta (Histórico Multi-Temporada)

#### Descripción
Reporte histórico completo de una huerta con análisis comparativo año tras año, tendencias, gráficas interactivas y proyecciones.

#### Estructura del Reporte
```
PERFIL HISTÓRICO DE HUERTA
==========================

INFORMACIÓN GENERAL
- Huerta: [Nombre] ([Tipo: Propia/Rentada])
- Propietario: [Nombre Completo]
- Ubicación: [Dirección]
- Hectáreas: [X.X ha]
- Variedades: [Lista de variedades]
- Años de Operación: [X años]
- Temporadas Analizadas: [X temporadas]

RESUMEN HISTÓRICO (Últimos 5 años)
┌──────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Año  │ Inversión   │ Ventas      │ Ganancia    │ ROI         │ Productivid │
├──────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ 2024 │ $150,000.00 │ $255,000.00 │ $105,000.00 │ 70.0%       │ 1,950 cajas │
│ 2023 │ $140,000.00 │ $230,000.00 │ $90,000.00  │ 64.3%       │ 1,800 cajas │
│ 2022 │ $135,000.00 │ $220,000.00 │ $85,000.00  │ 63.0%       │ 1,750 cajas │
│ 2021 │ $130,000.00 │ $210,000.00 │ $80,000.00  │ 61.5%       │ 1,680 cajas │
│ 2020 │ $125,000.00 │ $195,000.00 │ $70,000.00  │ 56.0%       │ 1,600 cajas │
└──────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

TENDENCIAS Y CRECIMIENTO
- Crecimiento Promedio Anual (Ventas): +X.X%
- Crecimiento Promedio Anual (Ganancia): +X.X%
- Mejora en ROI: +X.X puntos porcentuales
- Incremento en Productividad: +X.X%

GRÁFICAS COMPARATIVAS INTERACTIVAS
1. Evolución de Ingresos vs Gastos (Líneas)
2. ROI por Año (Barras)
3. Productividad por Hectárea (Área)
4. Distribución de Inversiones por Categoría (Pie)
5. Estacionalidad de Ventas (Heatmap)
6. Comparativo de Variedades por Año (Barras Apiladas)

ANÁLISIS DE RENTABILIDAD POR TEMPORADA
[Detalle de cada temporada con sus cosechas]

ANÁLISIS DE EFICIENCIA OPERATIVA
- Mejor Temporada: [Año] (ROI: XX.X%)
- Peor Temporada: [Año] (ROI: XX.X%)
- Promedio Histórico ROI: XX.X%
- Variabilidad (Desv. Estándar): ±X.X%
- Tendencia: [Creciente/Decreciente/Estable]

ANÁLISIS DE COSTOS
- Costo Promedio por Hectárea: $[XXX,XXX.XX]
- Evolución de Costos: [+/-X.X% anual]
- Categoría de Mayor Gasto: [Categoría] (XX%)
- Eficiencia en Costos: [Mejorando/Empeorando]

ANÁLISIS DE INGRESOS
- Ingreso Promedio por Hectárea: $[XXX,XXX.XX]
- Evolución de Ingresos: [+/-X.X% anual]
- Precio Promedio Histórico: $[XXX.XX]/caja
- Variedad Más Rentable: [Variedad]

PROYECCIONES Y RECOMENDACIONES
- Proyección Próxima Temporada: $[XXX,XXX.XX]
- ROI Esperado: XX.X%
- Recomendaciones de Inversión: [Lista]
- Oportunidades de Mejora: [Lista]
- Alertas y Riesgos: [Lista]

BENCHMARKING
- Comparación con Promedio del Sector
- Posición Relativa en Productividad
- Ranking de Eficiencia
```

## Arquitectura Técnica de Implementación

### Backend - Nuevos Endpoints

#### 1. Modelos Adicionales

```python
# backend/gestion_huerta/models.py

class ReporteProduccion(models.Model):
    """Modelo para cachear reportes generados"""
    TIPO_CHOICES = [
        ('cosecha', 'Reporte por Cosecha'),
        ('temporada', 'Reporte por Temporada'),
        ('perfil_huerta', 'Perfil de Huerta'),
    ]
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    cosecha = models.ForeignKey('Cosecha', null=True, blank=True, on_delete=models.CASCADE)
    temporada = models.ForeignKey('Temporada', null=True, blank=True, on_delete=models.CASCADE)
    huerta = models.ForeignKey('Huerta', null=True, blank=True, on_delete=models.CASCADE)
    huerta_rentada = models.ForeignKey('HuertaRentada', null=True, blank=True, on_delete=models.CASCADE)
    
    datos_json = models.JSONField()  # Cache del reporte calculado
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    generado_por = models.ForeignKey('gestion_usuarios.Usuario', on_delete=models.CASCADE)
    hash_datos = models.CharField(max_length=64)  # Para invalidar cache
    
    class Meta:
        indexes = [
            models.Index(fields=['tipo', 'cosecha']),
            models.Index(fields=['tipo', 'temporada']),
            models.Index(fields=['tipo', 'huerta']),
            models.Index(fields=['hash_datos']),
        ]
```

#### 2. Servicios de Cálculo

```python
# backend/gestion_huerta/services/reportes_service.py

from decimal import Decimal
from django.db.models import Sum, Avg, Count, F, Q
from django.utils import timezone
from typing import Dict, List, Any
import hashlib
import json

class ReportesProduccionService:
    
    @staticmethod
    def generar_reporte_cosecha(cosecha_id: int, usuario) -> Dict[str, Any]:
        """Genera reporte detallado de una cosecha específica"""
        cosecha = Cosecha.objects.select_related(
            'temporada', 'huerta', 'huerta_rentada', 
            'temporada__huerta__propietario',
            'temporada__huerta_rentada__propietario'
        ).get(id=cosecha_id)
        
        # Validar permisos
        if not ReportesProduccionService._tiene_permiso_cosecha(usuario, cosecha):
            raise PermissionError("Sin permisos para generar este reporte")
        
        # Calcular datos
        inversiones = cosecha.inversiones.filter(is_active=True).select_related('categoria')
        ventas = cosecha.ventas.filter(is_active=True)
        
        # Resumen financiero
        total_inversiones = inversiones.aggregate(
            total=Sum(F('gastos_insumos') + F('gastos_mano_obra'))
        )['total'] or Decimal('0')
        
        total_ventas = ventas.aggregate(
            total=Sum(F('num_cajas') * F('precio_por_caja'))
        )['total'] or Decimal('0')
        
        total_gastos_venta = ventas.aggregate(
            total=Sum('gasto')
        )['total'] or Decimal('0')
        
        ganancia_bruta = total_ventas - total_gastos_venta
        ganancia_neta = ganancia_bruta - total_inversiones
        roi = (ganancia_neta / total_inversiones * 100) if total_inversiones > 0 else Decimal('0')
        
        # Análisis por categoría
        inversiones_por_categoria = inversiones.values('categoria__nombre').annotate(
            total=Sum(F('gastos_insumos') + F('gastos_mano_obra'))
        ).order_by('-total')
        
        # Análisis de ventas
        ventas_por_tipo = ventas.values('tipo_mango').annotate(
            total_cajas=Sum('num_cajas'),
            precio_promedio=Avg('precio_por_caja'),
            total_venta=Sum(F('num_cajas') * F('precio_por_caja'))
        ).order_by('-total_venta')
        
        # Métricas de rendimiento
        origen = cosecha.huerta or cosecha.huerta_rentada
        hectareas = origen.hectareas if origen else Decimal('1')
        total_cajas = ventas.aggregate(total=Sum('num_cajas'))['total'] or 0
        
        reporte = {
            'metadata': {
                'tipo': 'cosecha',
                'fecha_generacion': timezone.now().isoformat(),
                'generado_por': usuario.username,
                'cosecha_id': cosecha.id,
            },
            'informacion_general': {
                'huerta_nombre': str(origen),
                'huerta_tipo': 'Rentada' if cosecha.huerta_rentada else 'Propia',
                'propietario': str(origen.propietario) if origen else '',
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
                    'gastos_insumos': float(inv.gastos_insumos),
                    'gastos_mano_obra': float(inv.gastos_mano_obra),
                    'total': float(inv.gastos_insumos + inv.gastos_mano_obra),
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
                    'total_venta': float(venta.num_cajas * venta.precio_por_caja),
                    'gasto': float(venta.gasto),
                    'ganancia_neta': float(venta.ganancia_neta),
                }
                for venta in ventas.order_by('fecha_venta')
            ],
            'analisis_categorias': [
                {
                    'categoria': cat['categoria__nombre'],
                    'total': float(cat['total']),
                    'porcentaje': float(cat['total'] / total_inversiones * 100) if total_inversiones > 0 else 0,
                }
                for cat in inversiones_por_categoria
            ],
            'analisis_variedades': [
                {
                    'variedad': var['tipo_mango'],
                    'total_cajas': var['total_cajas'],
                    'precio_promedio': float(var['precio_promedio']),
                    'total_venta': float(var['total_venta']),
                    'porcentaje': float(var['total_venta'] / total_ventas * 100) if total_ventas > 0 else 0,
                }
                for var in ventas_por_tipo
            ],
            'metricas_rendimiento': {
                'cajas_totales': total_cajas,
                'cajas_por_hectarea': float(total_cajas / hectareas) if hectareas > 0 else 0,
                'precio_promedio_caja': float(total_ventas / total_cajas) if total_cajas > 0 else 0,
                'costo_por_caja': float(total_inversiones / total_cajas) if total_cajas > 0 else 0,
                'margen_por_caja': float(ganancia_neta / total_cajas) if total_cajas > 0 else 0,
            }
        }
        
        return reporte
    
    @staticmethod
    def generar_reporte_temporada(temporada_id: int, usuario) -> Dict[str, Any]:
        """Genera reporte consolidado de una temporada"""
        temporada = Temporada.objects.select_related(
            'huerta', 'huerta_rentada',
            'huerta__propietario', 'huerta_rentada__propietario'
        ).get(id=temporada_id)
        
        # Validar permisos
        if not ReportesProduccionService._tiene_permiso_temporada(usuario, temporada):
            raise PermissionError("Sin permisos para generar este reporte")
        
        cosechas = temporada.cosechas.filter(is_active=True).prefetch_related(
            'inversiones', 'ventas'
        )
        
        # Calcular totales de la temporada
        total_inversiones = Decimal('0')
        total_ventas = Decimal('0')
        total_cajas = 0
        cosechas_data = []
        
        for cosecha in cosechas:
            inv_cosecha = cosecha.inversiones.filter(is_active=True).aggregate(
                total=Sum(F('gastos_insumos') + F('gastos_mano_obra'))
            )['total'] or Decimal('0')
            
            ven_cosecha = cosecha.ventas.filter(is_active=True).aggregate(
                total=Sum(F('num_cajas') * F('precio_por_caja')),
                cajas=Sum('num_cajas')
            )
            
            ven_total = ven_cosecha['total'] or Decimal('0')
            ven_cajas = ven_cosecha['cajas'] or 0
            ganancia = ven_total - inv_cosecha
            roi = (ganancia / inv_cosecha * 100) if inv_cosecha > 0 else Decimal('0')
            
            cosechas_data.append({
                'nombre': cosecha.nombre,
                'inversion': float(inv_cosecha),
                'ventas': float(ven_total),
                'ganancia': float(ganancia),
                'roi': float(roi),
                'cajas': ven_cajas,
            })
            
            total_inversiones += inv_cosecha
            total_ventas += ven_total
            total_cajas += ven_cajas
        
        ganancia_neta = total_ventas - total_inversiones
        roi_temporada = (ganancia_neta / total_inversiones * 100) if total_inversiones > 0 else Decimal('0')
        
        origen = temporada.huerta or temporada.huerta_rentada
        hectareas = origen.hectareas if origen else Decimal('1')
        
        # Análisis por categorías (toda la temporada)
        inversiones_categoria = InversionesHuerta.objects.filter(
            temporada=temporada, is_active=True
        ).values('categoria__nombre').annotate(
            total=Sum(F('gastos_insumos') + F('gastos_mano_obra'))
        ).order_by('-total')
        
        # Análisis de variedades (toda la temporada)
        ventas_variedad = Venta.objects.filter(
            temporada=temporada, is_active=True
        ).values('tipo_mango').annotate(
            total_cajas=Sum('num_cajas'),
            precio_promedio=Avg('precio_por_caja'),
            total_venta=Sum(F('num_cajas') * F('precio_por_caja'))
        ).order_by('-total_venta')
        
        reporte = {
            'metadata': {
                'tipo': 'temporada',
                'fecha_generacion': timezone.now().isoformat(),
                'generado_por': usuario.username,
                'temporada_id': temporada.id,
            },
            'informacion_general': {
                'huerta_nombre': str(origen),
                'huerta_tipo': 'Rentada' if temporada.huerta_rentada else 'Propia',
                'propietario': str(origen.propietario) if origen else '',
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
            'analisis_categorias': [
                {
                    'categoria': cat['categoria__nombre'],
                    'total': float(cat['total']),
                    'porcentaje': float(cat['total'] / total_inversiones * 100) if total_inversiones > 0 else 0,
                }
                for cat in inversiones_categoria
            ],
            'analisis_variedades': [
                {
                    'variedad': var['tipo_mango'],
                    'total_cajas': var['total_cajas'],
                    'precio_promedio': float(var['precio_promedio']),
                    'total_venta': float(var['total_venta']),
                    'porcentaje': float(var['total_venta'] / total_ventas * 100) if total_ventas > 0 else 0,
                }
                for var in ventas_variedad
            ],
            'metricas_eficiencia': {
                'costo_por_hectarea': float(total_inversiones / hectareas) if hectareas > 0 else 0,
                'ingreso_por_hectarea': float(total_ventas / hectareas) if hectareas > 0 else 0,
                'ganancia_por_hectarea': float(ganancia_neta / hectareas) if hectareas > 0 else 0,
                'cajas_por_hectarea': float(total_cajas / hectareas) if hectareas > 0 else 0,
                'precio_promedio_caja': float(total_ventas / total_cajas) if total_cajas > 0 else 0,
            }
        }
        
        return reporte
    
    @staticmethod
    def generar_perfil_huerta(huerta_id: int, huerta_rentada_id: int, usuario, años: int = 5) -> Dict[str, Any]:
        """Genera perfil histórico de una huerta"""
        if huerta_id:
            huerta = Huerta.objects.select_related('propietario').get(id=huerta_id)
            temporadas = huerta.temporadas.filter(is_active=True).order_by('-año')[:años]
            origen = huerta
        else:
            huerta_rentada = HuertaRentada.objects.select_related('propietario').get(id=huerta_rentada_id)
            temporadas = huerta_rentada.temporadas.filter(is_active=True).order_by('-año')[:años]
            origen = huerta_rentada
        
        # Validar permisos
        if not ReportesProduccionService._tiene_permiso_huerta(usuario, origen):
            raise PermissionError("Sin permisos para generar este reporte")
        
        # Datos históricos por año
        datos_historicos = []
        total_años = 0
        suma_roi = Decimal('0')
        
        for temporada in temporadas:
            cosechas = temporada.cosechas.filter(is_active=True)
            
            # Calcular totales de la temporada
            inv_temp = InversionesHuerta.objects.filter(
                temporada=temporada, is_active=True
            ).aggregate(total=Sum(F('gastos_insumos') + F('gastos_mano_obra')))['total'] or Decimal('0')
            
            ven_temp = Venta.objects.filter(
                temporada=temporada, is_active=True
            ).aggregate(
                total=Sum(F('num_cajas') * F('precio_por_caja')),
                cajas=Sum('num_cajas')
            )
            
            ven_total = ven_temp['total'] or Decimal('0')
            ven_cajas = ven_temp['cajas'] or 0
            ganancia = ven_total - inv_temp
            roi = (ganancia / inv_temp * 100) if inv_temp > 0 else Decimal('0')
            
            datos_historicos.append({
                'año': temporada.año,
                'inversion': float(inv_temp),
                'ventas': float(ven_total),
                'ganancia': float(ganancia),
                'roi': float(roi),
                'productividad': ven_cajas,
                'cosechas_count': cosechas.count(),
            })
            
            total_años += 1
            suma_roi += roi
        
        # Calcular tendencias
        roi_promedio = suma_roi / total_años if total_años > 0 else Decimal('0')
        
        # Análisis de crecimiento (comparar primer y último año)
        if len(datos_historicos) >= 2:
            primer_año = datos_historicos[-1]  # Más antiguo
            ultimo_año = datos_historicos[0]   # Más reciente
            
            crecimiento_ventas = ((ultimo_año['ventas'] - primer_año['ventas']) / primer_año['ventas'] * 100) if primer_año['ventas'] > 0 else 0
            crecimiento_ganancia = ((ultimo_año['ganancia'] - primer_año['ganancia']) / abs(primer_año['ganancia']) * 100) if primer_año['ganancia'] != 0 else 0
            mejora_roi = ultimo_año['roi'] - primer_año['roi']
            incremento_productividad = ((ultimo_año['productividad'] - primer_año['productividad']) / primer_año['productividad'] * 100) if primer_año['productividad'] > 0 else 0
        else:
            crecimiento_ventas = crecimiento_ganancia = mejora_roi = incremento_productividad = 0
        
        # Mejor y peor temporada
        mejor_temporada = max(datos_historicos, key=lambda x: x['roi']) if datos_historicos else None
        peor_temporada = min(datos_historicos, key=lambda x: x['roi']) if datos_historicos else None
        
        reporte = {
            'metadata': {
                'tipo': 'perfil_huerta',
                'fecha_generacion': timezone.now().isoformat(),
                'generado_por': usuario.username,
                'huerta_id': huerta_id,
                'huerta_rentada_id': huerta_rentada_id,
                'años_analizados': años,
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
            'tendencias_crecimiento': {
                'crecimiento_ventas_anual': round(crecimiento_ventas, 2),
                'crecimiento_ganancia_anual': round(crecimiento_ganancia, 2),
                'mejora_roi': round(mejora_roi, 2),
                'incremento_productividad': round(incremento_productividad, 2),
            },
            'analisis_eficiencia': {
                'mejor_temporada': {
                    'año': mejor_temporada['año'] if mejor_temporada else None,
                    'roi': mejor_temporada['roi'] if mejor_temporada else 0,
                },
                'peor_temporada': {
                    'año': peor_temporada['año'] if peor_temporada else None,
                    'roi': peor_temporada['roi'] if peor_temporada else 0,
                },
                'roi_promedio_historico': float(roi_promedio),
                'variabilidad_roi': ReportesProduccionService._calcular_desviacion_estandar([d['roi'] for d in datos_historicos]),
                'tendencia': ReportesProduccionService._determinar_tendencia(datos_historicos),
            },
            'proyecciones': ReportesProduccionService._generar_proyecciones(datos_historicos, origen),
        }
        
        return reporte
    
    @staticmethod
    def _tiene_permiso_cosecha(usuario, cosecha) -> bool:
        """Valida permisos para acceder a reporte de cosecha"""
        # Implementar lógica de permisos según roles
        return True  # Placeholder
    
    @staticmethod
    def _tiene_permiso_temporada(usuario, temporada) -> bool:
        """Valida permisos para acceder a reporte de temporada"""
        return True  # Placeholder
    
    @staticmethod
    def _tiene_permiso_huerta(usuario, huerta) -> bool:
        """Valida permisos para acceder a perfil de huerta"""
        return True  # Placeholder
    
    @staticmethod
    def _calcular_desviacion_estandar(valores: List[float]) -> float:
        """Calcula desviación estándar de una lista de valores"""
        if len(valores) < 2:
            return 0.0
        
        promedio = sum(valores) / len(valores)
        varianza = sum((x - promedio) ** 2 for x in valores) / len(valores)
        return varianza ** 0.5
    
    @staticmethod
    def _determinar_tendencia(datos_historicos: List[Dict]) -> str:
        """Determina la tendencia basada en los datos históricos"""
        if len(datos_historicos) < 2:
            return 'Insuficientes datos'
        
        # Análisis simple de tendencia basado en ROI
        rois = [d['roi'] for d in reversed(datos_historicos)]  # Orden cronológico
        
        # Calcular pendiente simple
        n = len(rois)
        suma_x = sum(range(n))
        suma_y = sum(rois)
        suma_xy = sum(i * roi for i, roi in enumerate(rois))
        suma_x2 = sum(i ** 2 for i in range(n))
        
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
        ultimos_años = datos_historicos[:3]
        promedio_ventas = sum(d['ventas'] for d in ultimos_años) / len(ultimos_años)
        promedio_roi = sum(d['roi'] for d in ultimos_años) / len(ultimos_años)
        
        recomendaciones = []
        alertas = []
        
        # Generar recomendaciones basadas en tendencias
        if promedio_roi < 50:
            alertas.append('ROI por debajo del 50% - Revisar estrategia de costos')
        
        if len(datos_historicos) >= 3:
            roi_decreciente = all(datos_historicos[i]['roi'] > datos_historicos[i-1]['roi'] for i in range(1, 3))
            if roi_decreciente:
                alertas.append('Tendencia decreciente en ROI - Requiere atención')
        
        return {
            'proyeccion_proxima_temporada': round(promedio_ventas, 2),
            'roi_esperado': round(promedio_roi, 2),
            'recomendaciones': recomendaciones,
            'alertas': alertas,
        }
```

#### 3. ViewSets para Reportes

```python
# backend/gestion_huerta/views/reportes_views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils import timezone
import json

from gestion_huerta.services.reportes_service import ReportesProduccionService
from gestion_huerta.services.exportacion_service import ExportacionService
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.permissions import HasHuertaModulePermission

class ReportesProduccionViewSet(viewsets.GenericViewSet):
    """ViewSet para generar y exportar reportes de producción"""
    
    permission_classes = [IsAuthenticated, HasHuertaModulePermission]
    
    @action(detail=False, methods=['post'], url_path='cosecha')
    def reporte_cosecha(self, request):
        """Genera reporte de una cosecha específica"""
        cosecha_id = request.data.get('cosecha_id')
        formato = request.data.get('formato', 'json')  # json, pdf, excel
        
        if not cosecha_id:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"cosecha_id": "ID de cosecha requerido"}},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reporte_data = ReportesProduccionService.generar_reporte_cosecha(
                cosecha_id, request.user
            )
            
            if formato == 'pdf':
                pdf_content = ExportacionService.generar_pdf_cosecha(reporte_data)
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="reporte_cosecha_{cosecha_id}.pdf"'
                return response
            
            elif formato == 'excel':
                excel_content = ExportacionService.generar_excel_cosecha(reporte_data)
                response = HttpResponse(
                    excel_content, 
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="reporte_cosecha_{cosecha_id}.xlsx"'
                return response
            
            else:  # JSON por defecto
                return NotificationHandler.generate_response(
                    message_key="reporte_generado_exitosamente",
                    data={"reporte": reporte_data}
                )
                
        except PermissionError:
            return NotificationHandler.generate_response(
                message_key="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error",
                data={"error": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='temporada')
    def reporte_temporada(self, request):
        """Genera reporte de una temporada completa"""
        temporada_id = request.data.get('temporada_id')
        formato = request.data.get('formato', 'json')
        
        if not temporada_id:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"temporada_id": "ID de temporada requerido"}},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reporte_data = ReportesProduccionService.generar_reporte_temporada(
                temporada_id, request.user
            )
            
            if formato == 'pdf':
                pdf_content = ExportacionService.generar_pdf_temporada(reporte_data)
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="reporte_temporada_{temporada_id}.pdf"'
                return response
            
            elif formato == 'excel':
                excel_content = ExportacionService.generar_excel_temporada(reporte_data)
                response = HttpResponse(
                    excel_content, 
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="reporte_temporada_{temporada_id}.xlsx"'
                return response
            
            else:
                return NotificationHandler.generate_response(
                    message_key="reporte_generado_exitosamente",
                    data={"reporte": reporte_data}
                )
                
        except PermissionError:
            return NotificationHandler.generate_response(
                message_key="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error",
                data={"error": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='perfil-huerta')
    def perfil_huerta(self, request):
        """Genera perfil histórico de una huerta"""
        huerta_id = request.data.get('huerta_id')
        huerta_rentada_id = request.data.get('huerta_rentada_id')
        años = request.data.get('años', 5)
        formato = request.data.get('formato', 'json')
        
        if not huerta_id and not huerta_rentada_id:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"huerta": "ID de huerta o huerta rentada requerido"}},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reporte_data = ReportesProduccionService.generar_perfil_huerta(
                huerta_id, huerta_rentada_id, request.user, años
            )
            
            if formato == 'pdf':
                pdf_content = ExportacionService.generar_pdf_perfil_huerta(reporte_data)
                huerta_name = reporte_data['informacion_general']['huerta_nombre'].replace(' ', '_')
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="perfil_huerta_{huerta_name}.pdf"'
                return response
            
            elif formato == 'excel':
                excel_content = ExportacionService.generar_excel_perfil_huerta(reporte_data)
                huerta_name = reporte_data['informacion_general']['huerta_nombre'].replace(' ', '_')
                response = HttpResponse(
                    excel_content, 
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="perfil_huerta_{huerta_name}.xlsx"'
                return response
            
            else:
                return NotificationHandler.generate_response(
                    message_key="reporte_generado_exitosamente",
                    data={"reporte": reporte_data}
                )
                
        except PermissionError:
            return NotificationHandler.generate_response(
                message_key="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error",
                data={"error": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

#### 4. Servicio de Exportación

```python
# backend/gestion_huerta/services/exportacion_service.py

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from io import BytesIO
from typing import Dict, Any
import locale

class ExportacionService:
    """Servicio para exportar reportes a PDF y Excel"""
    
    @staticmethod
    def generar_pdf_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        """Genera PDF del reporte de cosecha"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,  # Centrado
            textColor=colors.darkblue
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            spaceAfter=12,
            textColor=colors.darkgreen
        )
        
        # Contenido
        story = []
        
        # Título
        story.append(Paragraph("REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL", title_style))
        story.append(Spacer(1, 20))
        
        # Información General
        info_general = reporte_data['informacion_general']
        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        
        info_data = [
            ['Huerta:', f"{info_general['huerta_nombre']} ({info_general['huerta_tipo']})"],
            ['Propietario:', info_general['propietario']],
            ['Temporada:', str(info_general['temporada_año'])],
            ['Cosecha:', info_general['cosecha_nombre']],
            ['Estado:', info_general['estado']],
            ['Hectáreas:', f"{info_general['hectareas']:.2f} ha"],
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Resumen Financiero
        resumen = reporte_data['resumen_financiero']
        story.append(Paragraph("RESUMEN FINANCIERO", heading_style))
        
        resumen_data = [
            ['Concepto', 'Monto'],
            ['Total Inversiones', f"${resumen['total_inversiones']:,.2f}"],
            ['Total Ventas', f"${resumen['total_ventas']:,.2f}"],
            ['Ganancia Bruta', f"${resumen['ganancia_bruta']:,.2f}"],
            ['Ganancia Neta', f"${resumen['ganancia_neta']:,.2f}"],
            ['ROI', f"{resumen['roi_porcentaje']:.1f}%"],
            ['Ganancia por Hectárea', f"${resumen['ganancia_por_hectarea']:,.2f}"],
        ]
        
        resumen_table = Table(resumen_data, colWidths=[3*inch, 2*inch])
        resumen_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(resumen_table)
        story.append(Spacer(1, 20))
        
        # Detalle de Inversiones
        story.append(Paragraph("DETALLE DE INVERSIONES", heading_style))
        
        inv_headers = ['Fecha', 'Categoría', 'Insumos', 'Mano Obra', 'Total']
        inv_data = [inv_headers]
        
        for inv in reporte_data['detalle_inversiones']:
            inv_data.append([
                inv['fecha'],
                inv['categoria'],
                f"${inv['gastos_insumos']:,.2f}",
                f"${inv['gastos_mano_obra']:,.2f}",
                f"${inv['total']:,.2f}"
            ])
        
        inv_table = Table(inv_data, colWidths=[1.2*inch, 1.5*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        inv_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ALTERNATEROWCOLORS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(inv_table)
        story.append(PageBreak())
        
        # Detalle de Ventas
        story.append(Paragraph("DETALLE DE VENTAS", heading_style))
        
        ven_headers = ['Fecha', 'Tipo Mango', 'Cajas', 'Precio/Caja', 'Total']
        ven_data = [ven_headers]
        
        for venta in reporte_data['detalle_ventas']:
            ven_data.append([
                venta['fecha'],
                venta['tipo_mango'],
                str(venta['num_cajas']),
                f"${venta['precio_por_caja']:,.2f}",
                f"${venta['total_venta']:,.2f}"
            ])
        
        ven_table = Table(ven_data, colWidths=[1.2*inch, 1.5*inch, 1*inch, 1.2*inch, 1.4*inch])
        ven_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkorange),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ALTERNATEROWCOLORS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(ven_table)
        
        # Construir PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_excel_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        """Genera Excel del reporte de cosecha"""
        wb = Workbook()
        
        # Hoja 1: Resumen
        ws_resumen = wb.active
        ws_resumen.title = "Resumen"
        
        # Estilos
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Título
        ws_resumen['A1'] = "REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL"
        ws_resumen['A1'].font = Font(bold=True, size=16)
        ws_resumen.merge_cells('A1:F1')
        
        # Información General
        info = reporte_data['informacion_general']
        row = 3
        ws_resumen[f'A{row}'] = "INFORMACIÓN GENERAL"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        info_data = [
            ('Huerta', f"{info['huerta_nombre']} ({info['huerta_tipo']})"),
            ('Propietario', info['propietario']),
            ('Temporada', str(info['temporada_año'])),
            ('Cosecha', info['cosecha_nombre']),
            ('Estado', info['estado']),
            ('Hectáreas', f"{info['hectareas']:.2f} ha"),
        ]
        
        for i, (label, value) in enumerate(info_data, start=row+1):
            ws_resumen[f'A{i}'] = label
            ws_resumen[f'B{i}'] = value
            ws_resumen[f'A{i}'].font = Font(bold=True)
        
        # Resumen Financiero
        row += len(info_data) + 3
        ws_resumen[f'A{row}'] = "RESUMEN FINANCIERO"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        resumen = reporte_data['resumen_financiero']
        resumen_data = [
            ('Total Inversiones', resumen['total_inversiones']),
            ('Total Ventas', resumen['total_ventas']),
            ('Ganancia Bruta', resumen['ganancia_bruta']),
            ('Ganancia Neta', resumen['ganancia_neta']),
            ('ROI (%)', resumen['roi_porcentaje']),
            ('Ganancia por Hectárea', resumen['ganancia_por_hectarea']),
        ]
        
        for i, (label, value) in enumerate(resumen_data, start=row+1):
            ws_resumen[f'A{i}'] = label
            ws_resumen[f'B{i}'] = value
            ws_resumen[f'A{i}'].font = Font(bold=True)
            if isinstance(value, (int, float)):
                ws_resumen[f'B{i}'].number_format = '#,##0.00'
        
        # Hoja 2: Detalle Inversiones
        ws_inv = wb.create_sheet("Inversiones")
        
        # Headers
        inv_headers = ['Fecha', 'Categoría', 'Insumos', 'Mano Obra', 'Total', 'Descripción']
        for col, header in enumerate(inv_headers, 1):
            cell = ws_inv.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        # Datos
        for row, inv in enumerate(reporte_data['detalle_inversiones'], 2):
            ws_inv.cell(row=row, column=1, value=inv['fecha'])
            ws_inv.cell(row=row, column=2, value=inv['categoria'])
            ws_inv.cell(row=row, column=3, value=inv['gastos_insumos'])
            ws_inv.cell(row=row, column=4, value=inv['gastos_mano_obra'])
            ws_inv.cell(row=row, column=5, value=inv['total'])
            ws_inv.cell(row=row, column=6, value=inv['descripcion'])
            
            # Formato numérico
            for col in [3, 4, 5]:
                ws_inv.cell(row=row, column=col).number_format = '#,##0.00'
        
        # Hoja 3: Detalle Ventas
        ws_ven = wb.create_sheet("Ventas")
        
        ven_headers = ['Fecha', 'Tipo Mango', 'Cajas', 'Precio/Caja', 'Total', 'Gasto', 'Ganancia Neta']
        for col, header in enumerate(ven_headers, 1):
            cell = ws_ven.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        for row, venta in enumerate(reporte_data['detalle_ventas'], 2):
            ws_ven.cell(row=row, column=1, value=venta['fecha'])
            ws_ven.cell(row=row, column=2, value=venta['tipo_mango'])
            ws_ven.cell(row=row, column=3, value=venta['num_cajas'])
            ws_ven.cell(row=row, column=4, value=venta['precio_por_caja'])
            ws_ven.cell(row=row, column=5, value=venta['total_venta'])
            ws_ven.cell(row=row, column=6, value=venta['gasto'])
            ws_ven.cell(row=row, column=7, value=venta['ganancia_neta'])
            
            # Formato numérico
            for col in [4, 5, 6, 7]:
                ws_ven.cell(row=row, column=col).number_format = '#,##0.00'
        
        # Ajustar anchos de columna
        for ws in [ws_resumen, ws_inv, ws_ven]:
            for column in ws.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                ws.column_dimensions[column_letter].width = adjusted_width
        
        # Guardar en buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_pdf_temporada(reporte_data: Dict[str, Any]) -> bytes:
        """Genera PDF del reporte de temporada"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        # Similar estructura que cosecha pero con datos de temporada
        # [Implementación similar pero adaptada para temporada]
        
        story = []
        styles = getSampleStyleSheet()
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,
            textColor=colors.darkblue
        )
        
        story.append(Paragraph("REPORTE DE PRODUCCIÓN - TEMPORADA COMPLETA", title_style))
        story.append(Spacer(1, 20))
        
        # [Resto de implementación similar a cosecha]
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_excel_temporada(reporte_data: Dict[str, Any]) -> bytes:
        """Genera Excel del reporte de temporada"""
        # Similar a cosecha pero con múltiples hojas para cada cosecha
        wb = Workbook()
        
        # Hoja resumen ejecutivo
        ws_resumen = wb.active
        ws_resumen.title = "Resumen Ejecutivo"
        
        # [Implementación similar pero con datos de temporada]
        
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_pdf_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        """Genera PDF del perfil histórico de huerta"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,
            textColor=colors.darkblue
        )
        
        story.append(Paragraph("PERFIL HISTÓRICO DE HUERTA", title_style))
        story.append(Spacer(1, 20))
        
        # [Implementación con gráficas y análisis histórico]
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_excel_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        """Genera Excel del perfil histórico con gráficas"""
        wb = Workbook()
        
        # Múltiples hojas con análisis histórico y gráficas
        ws_resumen = wb.active
        ws_resumen.title = "Resumen Histórico"
        
        # Crear gráficas con openpyxl
        # [Implementación con gráficas interactivas]
        
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
```

#### 5. URLs y Configuración

```python
# backend/gestion_huerta/urls.py - Agregar rutas de reportes

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.reportes_views import ReportesProduccionViewSet

router = DefaultRouter()
router.register(r'reportes-produccion', ReportesProduccionViewSet, basename='reportes-produccion')

urlpatterns = [
    # ... otras rutas existentes
    path('api/', include(router.urls)),
]
```

```python
# backend/requirements.txt - Agregar dependencias

reportlab==4.0.4
openpyxl==3.1.2
Pillow==10.0.0  # Para gráficas en PDF
matplotlib==3.7.2  # Para generar gráficas
```

### Frontend - Implementación React

#### 1. Tipos TypeScript

```typescript
// frontend/src/modules/gestion_huerta/types/reportes.types.ts

export interface ReporteMetadata {
  tipo: 'cosecha' | 'temporada' | 'perfil_huerta';
  fecha_generacion: string;
  generado_por: string;
  cosecha_id?: number;
  temporada_id?: number;
  huerta_id?: number;
  huerta_rentada_id?: number;
  años_analizados?: number;
}

export interface InformacionGeneral {
  huerta_nombre: string;
  huerta_tipo: 'Propia' | 'Rentada';
  propietario: string;
  temporada_año?: number;
  cosecha_nombre?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado: string;
  hectareas: number;
  ubicacion?: string;
  variedades?: string;
  total_cosechas?: number;
  años_operacion?: number;
  temporadas_analizadas?: number;
}

export interface ResumenFinanciero {
  total_inversiones: number;
  total_ventas: number;
  total_gastos_venta?: number;
  ganancia_bruta: number;
  ganancia_neta: number;
  roi_porcentaje: number;
  ganancia_por_hectarea: number;
  inversion_total?: number;
  ventas_totales?: number;
  roi_temporada?: number;
  productividad?: number;
  cajas_totales?: number;
}

export interface DetalleInversion {
  fecha: string;
  categoria: string;
  gastos_insumos: number;
  gastos_mano_obra: number;
  total: number;
  descripcion: string;
}

export interface DetalleVenta {
  fecha: string;
  tipo_mango: string;
  num_cajas: number;
  precio_por_caja: number;
  total_venta: number;
  gasto: number;
  ganancia_neta: number;
}

export interface AnalisisCategoria {
  categoria: string;
  total: number;
  porcentaje: number;
}

export interface AnalisisVariedad {
  variedad: string;
  total_cajas: number;
  precio_promedio: number;
  total_venta: number;
  porcentaje: number;
}

export interface MetricasRendimiento {
  cajas_totales: number;
  cajas_por_hectarea: number;
  precio_promedio_caja: number;
  costo_por_caja: number;
  margen_por_caja: number;
  costo_por_hectarea?: number;
  ingreso_por_hectarea?: number;
  ganancia_por_hectarea?: number;
}

export interface ComparativoCosecha {
  nombre: string;
  inversion: number;
  ventas: number;
  ganancia: number;
  roi: number;
  cajas: number;
}

export interface DatoHistorico {
  año: number;
  inversion: number;
  ventas: number;
  ganancia: number;
  roi: number;
  productividad: number;
  cosechas_count: number;
}

export interface TendenciasCrecimiento {
  crecimiento_ventas_anual: number;
  crecimiento_ganancia_anual: number;
  mejora_roi: number;
  incremento_productividad: number;
}

export interface AnalisisEficiencia {
  mejor_temporada: {
    año: number | null;
    roi: number;
  };
  peor_temporada: {
    año: number | null;
    roi: number;
  };
  roi_promedio_historico: number;
  variabilidad_roi: number;
  tendencia: string;
}

export interface Proyecciones {
  proyeccion_proxima_temporada: number;
  roi_esperado: number;
  recomendaciones: string[];
  alertas: string[];
}

export interface ReporteCosecha {
  metadata: ReporteMetadata;
  informacion_general: InformacionGeneral;
  resumen_financiero: ResumenFinanciero;
  detalle_inversiones: DetalleInversion[];
  detalle_ventas: DetalleVenta[];
  analisis_categorias: AnalisisCategoria[];
  analisis_variedades: AnalisisVariedad[];
  metricas_rendimiento: MetricasRendimiento;
}

export interface ReporteTemporada {
  metadata: ReporteMetadata;
  informacion_general: InformacionGeneral;
  resumen_ejecutivo: ResumenFinanciero;
  comparativo_cosechas: ComparativoCosecha[];
  analisis_categorias: AnalisisCategoria[];
  analisis_variedades: AnalisisVariedad[];
  metricas_eficiencia: MetricasRendimiento;
}

export interface PerfilHuerta {
  metadata: ReporteMetadata;
  informacion_general: InformacionGeneral;
  resumen_historico: DatoHistorico[];
  tendencias_crecimiento: TendenciasCrecimiento;
  analisis_eficiencia: AnalisisEficiencia;
  proyecciones: Proyecciones;
}

export interface GenerarReporteRequest {
  cosecha_id?: number;
  temporada_id?: number;
  huerta_id?: number;
  huerta_rentada_id?: number;
  años?: number;
  formato: 'json' | 'pdf' | 'excel';
}
```

#### 2. Servicio API

```typescript
// frontend/src/modules/gestion_huerta/services/reportes.service.ts

import { apiClient } from '../../../global/api/apiClient';
import { 
  ReporteCosecha, 
  ReporteTemporada, 
  PerfilHuerta, 
  GenerarReporteRequest 
} from '../types/reportes.types';

export class ReportesService {
  private static baseUrl = '/gestion-huerta/reportes-produccion';

  static async generarReporteCosecha(request: GenerarReporteRequest): Promise<ReporteCosecha | Blob> {
    const response = await apiClient.post(`${this.baseUrl}/cosecha/`, request, {
      responseType: request.formato === 'json' ? 'json' : 'blob'
    });
    
    if (request.formato === 'json') {
      return response.data.reporte;
    } else {
      return response.data; // Blob para PDF/Excel
    }
  }

  static async generarReporteTemporada(request: GenerarReporteRequest): Promise<ReporteTemporada | Blob> {
    const response = await apiClient.post(`${this.baseUrl}/temporada/`, request, {
      responseType: request.formato === 'json' ? 'json' : 'blob'
    });
    
    if (request.formato === 'json') {
      return response.data.reporte;
    } else {
      return response.data;
    }
  }

  static async generarPerfilHuerta(request: GenerarReporteRequest): Promise<PerfilHuerta | Blob> {
    const response = await apiClient.post(`${this.baseUrl}/perfil-huerta/`, request, {
      responseType: request.formato === 'json' ? 'json' : 'blob'
    });
    
    if (request.formato === 'json') {
      return response.data.reporte;
    } else {
      return response.data;
    }
  }

  static descargarArchivo(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
```

#### 3. Hook Personalizado

```typescript
// frontend/src/modules/gestion_huerta/hooks/useReportes.ts

import { useState } from 'react';
import { ReportesService } from '../services/reportes.service';
import { GenerarReporteRequest, ReporteCosecha, ReporteTemporada, PerfilHuerta } from '../types/reportes.types';
import { useNotification } from '../../../global/hooks/useNotification';

export const useReportes = () => {
  const [loading, setLoading] = useState(false);
  const [reporteCosecha, setReporteCosecha] = useState<ReporteCosecha | null>(null);
  const [reporteTemporada, setReporteTemporada] = useState<ReporteTemporada | null>(null);
  const [perfilHuerta, setPerfilHuerta] = useState<PerfilHuerta | null>(null);
  const { showNotification } = useNotification();

  const generarReporteCosecha = async (request: GenerarReporteRequest) => {
    setLoading(true);
    try {
      const resultado = await ReportesService.generarReporteCosecha(request);
      
      if (request.formato === 'json') {
        setReporteCosecha(resultado as ReporteCosecha);
        showNotification('Reporte generado exitosamente', 'success');
      } else {
        const filename = `reporte_cosecha_${request.cosecha_id}.${request.formato}`;
        ReportesService.descargarArchivo(resultado as Blob, filename);
        showNotification('Reporte descargado exitosamente', 'success');
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al generar reporte',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const generarReporteTemporada = async (request: GenerarReporteRequest) => {
    setLoading(true);
    try {
      const resultado = await ReportesService.generarReporteTemporada(request);
      
      if (request.formato === 'json') {
        setReporteTemporada(resultado as ReporteTemporada);
        showNotification('Reporte generado exitosamente', 'success');
      } else {
        const filename = `reporte_temporada_${request.temporada_id}.${request.formato}`;
        ReportesService.descargarArchivo(resultado as Blob, filename);
        showNotification('Reporte descargado exitosamente', 'success');
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al generar reporte',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const generarPerfilHuerta = async (request: GenerarReporteRequest) => {
    setLoading(true);
    try {
      const resultado = await ReportesService.generarPerfilHuerta(request);
      
      if (request.formato === 'json') {
        setPerfilHuerta(resultado as PerfilHuerta);
        showNotification('Perfil generado exitosamente', 'success');
      } else {
        const huertaName = request.huerta_id ? `huerta_${request.huerta_id}` : `huerta_rentada_${request.huerta_rentada_id}`;
        const filename = `perfil_${huertaName}.${request.formato}`;
        ReportesService.descargarArchivo(resultado as Blob, filename);
        showNotification('Perfil descargado exitosamente', 'success');
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al generar perfil',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const limpiarReportes = () => {
    setReporteCosecha(null);
    setReporteTemporada(null);
    setPerfilHuerta(null);
  };

  return {
    loading,
    reporteCosecha,
    reporteTemporada,
    perfilHuerta,
    generarReporteCosecha,
    generarReporteTemporada,
    generarPerfilHuerta,
    limpiarReportes,
  };
};
```

#### 4. Componentes de UI

```tsx
// frontend/src/modules/gestion_huerta/components/reportes/GeneradorReportes.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf,
  TableChart,
  Visibility,
  Assessment,
  TrendingUp,
  Analytics,
} from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import { useReportes } from '../../hooks/useReportes';
import { useCosechas } from '../../hooks/useCosechas';
import { useTemporadas } from '../../hooks/useTemporadas';
import { useHuertas } from '../../hooks/useHuertas';
import { GenerarReporteRequest } from '../../types/reportes.types';
import { PermissionButton } from '../../../../components/common/PermissionButton';

const validationSchema = Yup.object({
  tipo_reporte: Yup.string().required('Tipo de reporte requerido'),
  cosecha_id: Yup.number().when('tipo_reporte', {
    is: 'cosecha',
    then: (schema) => schema.required('Cosecha requerida'),
    otherwise: (schema) => schema.nullable(),
  }),
  temporada_id: Yup.number().when('tipo_reporte', {
    is: 'temporada',
    then: (schema) => schema.required('Temporada requerida'),
    otherwise: (schema) => schema.nullable(),
  }),
  huerta_id: Yup.number().when('tipo_reporte', {
    is: 'perfil_huerta',
    then: (schema) => schema.nullable(),
    otherwise: (schema) => schema.nullable(),
  }),
  huerta_rentada_id: Yup.number().when('tipo_reporte', {
    is: 'perfil_huerta',
    then: (schema) => schema.nullable(),
    otherwise: (schema) => schema.nullable(),
  }),
  años: Yup.number().min(1).max(10).when('tipo_reporte', {
    is: 'perfil_huerta',
    then: (schema) => schema.required('Número de años requerido'),
    otherwise: (schema) => schema.nullable(),
  }),
});

export const GeneradorReportes: React.FC = () => {
  const [tipoReporte, setTipoReporte] = useState<string>('');
  
  const {
    loading,
    reporteCosecha,
    reporteTemporada,
    perfilHuerta,
    generarReporteCosecha,
    generarReporteTemporada,
    generarPerfilHuerta,
    limpiarReportes,
  } = useReportes();

  const { cosechas, loading: loadingCosechas } = useCosechas();
  const { temporadas, loading: loadingTemporadas } = useTemporadas();
  const { huertas, huertasRentadas, loading: loadingHuertas } = useHuertas();

  const handleGenerarReporte = async (values: any, formato: 'json' | 'pdf' | 'excel') => {
    const request: GenerarReporteRequest = {
      formato,
      cosecha_id: values.cosecha_id || undefined,
      temporada_id: values.temporada_id || undefined,
      huerta_id: values.huerta_id || undefined,
      huerta_rentada_id: values.huerta_rentada_id || undefined,
      años: values.años || 5,
    };

    switch (values.tipo_reporte) {
      case 'cosecha':
        await generarReporteCosecha(request);
        break;
      case 'temporada':
        await generarReporteTemporada(request);
        break;
      case 'perfil_huerta':
        await generarPerfilHuerta(request);
        break;
    }
  };

  const initialValues = {
    tipo_reporte: '',
    cosecha_id: '',
    temporada_id: '',
    huerta_id: '',
    huerta_rentada_id: '',
    años: 5,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Assessment color="primary" />
        Generador de Reportes de Producción
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Los reportes de producción proporcionan análisis detallados y seguros de la rentabilidad, 
        inversiones y ventas. Todos los datos son verificados y auditados para garantizar su integridad.
      </Alert>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={() => {}} // Manejado por los botones individuales
      >
        {({ values, errors, touched, handleChange, setFieldValue }) => (
          <Form>
            <Grid container spacing={3}>
              {/* Selector de Tipo de Reporte */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tipo de Reporte
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            cursor: 'pointer',
                            border: values.tipo_reporte === 'cosecha' ? 2 : 1,
                            borderColor: values.tipo_reporte === 'cosecha' ? 'primary.main' : 'divider'
                          }}
                          onClick={() => {
                            setFieldValue('tipo_reporte', 'cosecha');
                            setTipoReporte('cosecha');
                            limpiarReportes();
                          }}
                        >
                          <CardContent sx={{ textAlign: 'center' }}>
                            <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6">Reporte por Cosecha</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Análisis detallado de una cosecha específica con inversiones, ventas y ROI
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card 
                          variant="outlined"
                          sx={{ 
                            cursor: 'pointer',
                            border: values.tipo_reporte === 'temporada' ? 2 : 1,
                            borderColor: values.tipo_reporte === 'temporada' ? 'primary.main' : 'divider'
                          }}
                          onClick={() => {
                            setFieldValue('tipo_reporte', 'temporada');
                            setTipoReporte('temporada');
                            limpiarReportes();
                          }}
                        >
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Analytics sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                            <Typography variant="h6">Reporte por Temporada</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Consolidado de todas las cosechas de una temporada con comparativos
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card 
                          variant="outlined"
                          sx={{ 
                            cursor: 'pointer',
                            border: values.tipo_reporte === 'perfil_huerta' ? 2 : 1,
                            borderColor: values.tipo_reporte === 'perfil_huerta' ? 'primary.main' : 'divider'
                          }}
                          onClick={() => {
                            setFieldValue('tipo_reporte', 'perfil_huerta');
                            setTipoReporte('perfil_huerta');
                            limpiarReportes();
                          }}
                        >
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Assessment sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                            <Typography variant="h6">Perfil de Huerta</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Análisis histórico multi-temporada con tendencias y proyecciones
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Configuración del Reporte */}
              {values.tipo_reporte && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Configuración del Reporte
                      </Typography>
                      
                      <Grid container spacing={3}>
                        {/* Selector de Cosecha */}
                        {values.tipo_reporte === 'cosecha' && (
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={touched.cosecha_id && !!errors.cosecha_id}>
                              <InputLabel>Cosecha</InputLabel>
                              <Select
                                name="cosecha_id"
                                value={values.cosecha_id}
                                onChange={handleChange}
                                label="Cosecha"
                                disabled={loadingCosechas}
                              >
                                {cosechas.map((cosecha) => (
                                  <MenuItem key={cosecha.id} value={cosecha.id}>
                                    {cosecha.nombre} - {cosecha.temporada_info?.año}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}

                        {/* Selector de Temporada */}
                        {values.tipo_reporte === 'temporada' && (
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={touched.temporada_id && !!errors.temporada_id}>
                              <InputLabel>Temporada</InputLabel>
                              <Select
                                name="temporada_id"
                                value={values.temporada_id}
                                onChange={handleChange}
                                label="Temporada"
                                disabled={loadingTemporadas}
                              >
                                {temporadas.map((temporada) => (
                                  <MenuItem key={temporada.id} value={temporada.id}>
                                    {temporada.año} - {temporada.huerta_info?.nombre || temporada.huerta_rentada_info?.nombre}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}

                        {/* Selectores para Perfil de Huerta */}
                        {values.tipo_reporte === 'perfil_huerta' && (
                          <>
                            <Grid item xs={12} md={4}>
                              <FormControl fullWidth>
                                <InputLabel>Huerta Propia</InputLabel>
                                <Select
                                  name="huerta_id"
                                  value={values.huerta_id}
                                  onChange={(e) => {
                                    handleChange(e);
                                    if (e.target.value) {
                                      setFieldValue('huerta_rentada_id', '');
                                    }
                                  }}
                                  label="Huerta Propia"
                                  disabled={loadingHuertas}
                                >
                                  <MenuItem value="">Ninguna</MenuItem>
                                  {huertas.map((huerta) => (
                                    <MenuItem key={huerta.id} value={huerta.id}>
                                      {huerta.nombre}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                              <FormControl fullWidth>
                                <InputLabel>Huerta Rentada</InputLabel>
                                <Select
                                  name="huerta_rentada_id"
                                  value={values.huerta_rentada_id}
                                  onChange={(e) => {
                                    handleChange(e);
                                    if (e.target.value) {
                                      setFieldValue('huerta_id', '');
                                    }
                                  }}
                                  label="Huerta Rentada"
                                  disabled={loadingHuertas}
                                >
                                  <MenuItem value="">Ninguna</MenuItem>
                                  {huertasRentadas.map((huerta) => (
                                    <MenuItem key={huerta.id} value={huerta.id}>
                                      {huerta.nombre}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                              <FormControl fullWidth error={touched.años && !!errors.años}>
                                <InputLabel>Años a Analizar</InputLabel>
                                <Select
                                  name="años"
                                  value={values.años}
                                  onChange={handleChange}
                                  label="Años a Analizar"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((año) => (
                                    <MenuItem key={año} value={año}>
                                      {año} {año === 1 ? 'año' : 'años'}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Botones de Acción */}
              {values.tipo_reporte && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Generar y Exportar
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <PermissionButton
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => handleGenerarReporte(values, 'json')}
                          disabled={loading}
                          permission="gestion_huerta.view_reportes"
                        >
                          Ver Reporte
                        </PermissionButton>
                        
                        <PermissionButton
                          variant="contained"
                          color="error"
                          startIcon={<PictureAsPdf />}
                          onClick={() => handleGenerarReporte(values, 'pdf')}
                          disabled={loading}
                          permission="gestion_huerta.export_reportes"
                        >
                          Exportar PDF
                        </PermissionButton>
                        
                        <PermissionButton
                          variant="contained"
                          color="success"
                          startIcon={<TableChart />}
                          onClick={() => handleGenerarReporte(values, 'excel')}
                          disabled={loading}
                          permission="gestion_huerta.export_reportes"
                        >
                          Exportar Excel
                        </PermissionButton>
                      </Box>

                      {loading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2">
                            Generando reporte... Esto puede tomar unos momentos.
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Form>
        )}
      </Formik>

      {/* Visualización de Reportes */}
      {(reporteCosecha || reporteTemporada || perfilHuerta) && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 3 }} />
          {reporteCosecha && <ReporteCosechaViewer reporte={reporteCosecha} />}
          {reporteTemporada && <ReporteTemporadaViewer reporte={reporteTemporada} />}
          {perfilHuerta && <PerfilHuertaViewer perfil={perfilHuerta} />}
        </Box>
      )}
    </Box>
  );
};
```

#### 5. Componentes de Visualización

```tsx
// frontend/src/modules/gestion_huerta/components/reportes/ReporteCosechaViewer.tsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { ReporteCosecha } from '../../types/reportes.types';
import { formatCurrency, formatPercentage } from '../../../../global/utils/formatters';

interface Props {
  reporte: ReporteCosecha;
}

export const ReporteCosechaViewer: React.FC<Props> = ({ reporte }) => {
  const { informacion_general, resumen_financiero, analisis_categorias, analisis_variedades } = reporte;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Reporte de Cosecha: {informacion_general.cosecha_nombre}
      </Typography>

      <Grid container spacing={3}>
        {/* Información General */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Información General</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography><strong>Huerta:</strong> {informacion_general.huerta_nombre}</Typography>
                <Typography><strong>Tipo:</strong> {informacion_general.huerta_tipo}</Typography>
                <Typography><strong>Propietario:</strong> {informacion_general.propietario}</Typography>
                <Typography><strong>Temporada:</strong> {informacion_general.temporada_año}</Typography>
                <Typography><strong>Hectáreas:</strong> {informacion_general.hectareas} ha</Typography>
                <Chip 
                  label={informacion_general.estado} 
                  color={informacion_general.estado === 'Finalizada' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Resumen Financiero */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Resumen Financiero</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography><strong>Inversiones:</strong> {formatCurrency(resumen_financiero.total_inversiones)}</Typography>
                <Typography><strong>Ventas:</strong> {formatCurrency(resumen_financiero.total_ventas)}</Typography>
                <Typography><strong>Ganancia Neta:</strong> {formatCurrency(resumen_financiero.ganancia_neta)}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography><strong>ROI:</strong></Typography>
                  <Chip 
                    label={formatPercentage(resumen_financiero.roi_porcentaje)}
                    color={resumen_financiero.roi_porcentaje > 50 ? 'success' : resumen_financiero.roi_porcentaje > 20 ? 'warning' : 'error'}
                  />
                </Box>
                <Typography><strong>Ganancia/ha:</strong> {formatCurrency(resumen_financiero.ganancia_por_hectarea)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfica de Categorías */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Distribución de Inversiones</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analisis_categorias}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ categoria, porcentaje }) => `${categoria}: ${porcentaje.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {analisis_categorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfica de Variedades */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Ventas por Variedad</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analisis_variedades}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="variedad" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="total_venta" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Tabla de Inversiones */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Detalle de Inversiones</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Insumos</TableCell>
                      <TableCell align="right">Mano de Obra</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reporte.detalle_inversiones.map((inversion, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(inversion.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>{inversion.categoria}</TableCell>
                        <TableCell align="right">{formatCurrency(inversion.gastos_insumos)}</TableCell>
                        <TableCell align="right">{formatCurrency(inversion.gastos_mano_obra)}</TableCell>
                        <TableCell align="right"><strong>{formatCurrency(inversion.total)}</strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

## Consideraciones de Seguridad y Integridad

### 1. Validaciones de Seguridad

```python
# backend/gestion_huerta/services/reportes_security.py

from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import hashlib
import json

class ReportesSecurityService:
    """Servicio para validaciones de seguridad en reportes"""
    
    @staticmethod
    def validar_integridad_datos(reporte_data: dict) -> bool:
        """Valida la integridad de los datos del reporte"""
        try:
            # Verificar que los totales cuadren
            if 'detalle_inversiones' in reporte_data:
                total_calculado = sum(inv['total'] for inv in reporte_data['detalle_inversiones'])
                total_reportado = reporte_data['resumen_financiero']['total_inversiones']
                
                if abs(total_calculado - total_reportado) > 0.01:  # Tolerancia de 1 centavo
                    raise ValidationError("Inconsistencia en totales de inversiones")
            
            # Verificar fechas válidas
            fecha_generacion = timezone.now()
            if 'metadata' in reporte_data:
                fecha_reporte = timezone.datetime.fromisoformat(
                    reporte_data['metadata']['fecha_generacion'].replace('Z', '+00:00')
                )
                if fecha_reporte > fecha_generacion + timedelta(minutes=5):
                    raise ValidationError("Fecha de generación inválida")
            
            return True
            
        except Exception as e:
            raise ValidationError(f"Error en validación de integridad: {str(e)}")
    
    @staticmethod
    def generar_hash_reporte(reporte_data: dict) -> str:
        """Genera hash para verificar integridad del reporte"""
        # Remover metadata temporal para hash consistente
        data_for_hash = {k: v for k, v in reporte_data.items() if k != 'metadata'}
        data_string = json.dumps(data_for_hash, sort_keys=True)
        return hashlib.sha256(data_string.encode()).hexdigest()
    
    @staticmethod
    def validar_permisos_avanzados(usuario, entidad, accion: str) -> bool:
        """Validaciones avanzadas de permisos"""
        # Implementar lógica específica según roles y contexto
        if accion == 'export_pdf' and not usuario.has_perm('gestion_huerta.export_reportes'):
            return False
        
        if accion == 'view_financial_details' and not usuario.has_perm('gestion_huerta.view_financial_data'):
            return False
        
        return True
    
    @staticmethod
    def log_acceso_reporte(usuario, tipo_reporte: str, entidad_id: int, accion: str):
        """Registra acceso a reportes para auditoría"""
        from gestion_huerta.models import RegistroActividad
        
        RegistroActividad.objects.create(
            usuario=usuario,
            accion=f"REPORTE_{accion.upper()}",
            modelo=tipo_reporte,
            objeto_id=entidad_id,
            detalles={
                'tipo_reporte': tipo_reporte,
                'accion': accion,
                'timestamp': timezone.now().isoformat(),
                'ip_address': getattr(usuario, 'current_ip', None),
            }
        )
```

### 2. Middleware de Auditoría

```python
# backend/gestion_huerta/middlewares/reportes_audit.py

from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
import json

class ReportesAuditMiddleware(MiddlewareMixin):
    """Middleware para auditar acceso a reportes"""
    
    def process_request(self, request):
        if '/reportes-produccion/' in request.path:
            request.audit_start_time = timezone.now()
            request.audit_data = {
                'path': request.path,
                'method': request.method,
                'user': str(request.user) if request.user.is_authenticated else 'Anonymous',
                'ip': self.get_client_ip(request),
            }
    
    def process_response(self, request, response):
        if hasattr(request, 'audit_start_time'):
            duration = (timezone.now() - request.audit_start_time).total_seconds()
            
            # Log para reportes críticos
            if response.status_code == 200 and duration > 30:  # Reportes que toman más de 30 segundos
                self.log_slow_report(request, response, duration)
            
            # Log para errores
            if response.status_code >= 400:
                self.log_report_error(request, response)
        
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def log_slow_report(self, request, response, duration):
        # Implementar logging para reportes lentos
        pass
    
    def log_report_error(self, request, response):
        # Implementar logging para errores en reportes
        pass
```

## Plan de Implementación

### Fase 1: Backend Core (Semana 1-2)
1. **Crear modelos adicionales** para cache de reportes
2. **Implementar servicios de cálculo** con validaciones robustas
3. **Desarrollar ViewSets** con manejo de errores completo
4. **Configurar permisos** granulares para reportes
5. **Implementar auditoría** y logging de accesos

### Fase 2: Servicios de Exportación (Semana 2-3)
1. **Desarrollar generación de PDF** con ReportLab
2. **Implementar exportación Excel** con gráficas
3. **Optimizar rendimiento** para reportes grandes
4. **Agregar validaciones de integridad** en exportaciones
5. **Implementar cache inteligente** para reportes frecuentes

### Fase 3: Frontend Básico (Semana 3-4)
1. **Crear tipos TypeScript** completos
2. **Desarrollar servicios API** con manejo de errores
3. **Implementar hooks personalizados** para cada tipo de reporte
4. **Desarrollar componente generador** de reportes
5. **Crear componentes de visualización** básicos

### Fase 4: Componentes Avanzados (Semana 4-5)
1. **Implementar gráficas interactivas** con Recharts
2. **Desarrollar visualizadores** para cada tipo de reporte
3. **Agregar funcionalidades de filtrado** y búsqueda
4. **Implementar exportación** desde frontend
5. **Optimizar rendimiento** de componentes

### Fase 5: Integración y Testing (Semana 5-6)
1. **Integrar con sistema de permisos** existente
2. **Implementar tests unitarios** para servicios críticos
3. **Realizar pruebas de carga** para reportes grandes
4. **Validar integridad** de datos en todos los escenarios
5. **Documentar APIs** y componentes

### Fase 6: Optimización y Despliegue (Semana 6-7)
1. **Optimizar consultas** de base de datos
2. **Implementar cache Redis** para reportes frecuentes
3. **Configurar monitoreo** y alertas
4. **Realizar pruebas de usuario** final
5. **Desplegar a producción** con rollback plan

## Consideraciones Técnicas Adicionales

### 1. Optimización de Rendimiento

#### Cache Inteligente
```python
# backend/gestion_huerta/services/cache_service.py

from django.core.cache import cache
from django.conf import settings
import hashlib
import json

class ReportesCacheService:
    """Servicio de cache para reportes"""
    
    CACHE_TIMEOUT = 3600  # 1 hora
    
    @staticmethod
    def generar_cache_key(tipo_reporte: str, parametros: dict) -> str:
        """Genera clave única para cache"""
        cache_data = {
            'tipo': tipo_reporte,
            'params': sorted(parametros.items())
        }
        cache_string = json.dumps(cache_data, sort_keys=True)
        return f"reporte_{hashlib.md5(cache_string.encode()).hexdigest()}"
    
    @staticmethod
    def obtener_reporte_cache(cache_key: str):
        """Obtiene reporte del cache"""
        return cache.get(cache_key)
    
    @staticmethod
    def guardar_reporte_cache(cache_key: str, reporte_data: dict):
        """Guarda reporte en cache"""
        cache.set(cache_key, reporte_data, ReportesCacheService.CACHE_TIMEOUT)
    
    @staticmethod
    def invalidar_cache_huerta(huerta_id: int):
        """Invalida cache relacionado con una huerta"""
        # Implementar invalidación selectiva
        pass
```

#### Optimización de Consultas
```python
# backend/gestion_huerta/services/query_optimization.py

from django.db.models import Prefetch

class QueryOptimizationService:
    """Servicio para optimizar consultas de reportes"""
    
    @staticmethod
    def optimizar_consulta_cosecha(cosecha_id: int):
        """Optimiza consulta para reporte de cosecha"""
        return Cosecha.objects.select_related(
            'temporada__huerta__propietario',
            'temporada__huerta_rentada__propietario'
        ).prefetch_related(
            Prefetch('inversiones', queryset=InversionesHuerta.objects.select_related('categoria')),
            'ventas'
        ).get(id=cosecha_id)
    
    @staticmethod
    def optimizar_consulta_temporada(temporada_id: int):
        """Optimiza consulta para reporte de temporada"""
        return Temporada.objects.select_related(
            'huerta__propietario',
            'huerta_rentada__propietario'
        ).prefetch_related(
            Prefetch('cosechas', queryset=Cosecha.objects.prefetch_related('inversiones', 'ventas'))
        ).get(id=temporada_id)
```

### 2. Monitoreo y Alertas

#### Sistema de Monitoreo
```python
# backend/gestion_huerta/monitoring/reportes_monitor.py

import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger('reportes_produccion')

class ReportesMonitor:
    """Monitor para reportes de producción"""
    
    @staticmethod
    def log_reporte_generado(tipo_reporte: str, tiempo_generacion: float, usuario: str):
        """Registra generación de reporte"""
        logger.info(f"Reporte {tipo_reporte} generado en {tiempo_generacion:.2f}s por {usuario}")
        
        # Alerta si toma más de 30 segundos
        if tiempo_generacion > 30:
            logger.warning(f"Reporte {tipo_reporte} tardó {tiempo_generacion:.2f}s - Revisar optimización")
    
    @staticmethod
    def verificar_integridad_datos():
        """Verifica integridad de datos para reportes"""
        # Implementar verificaciones automáticas
        pass
```

### 3. Configuración de Producción

#### Settings de Producción
```python
# backend/agroproductores_risol/settings/production.py

# Cache para reportes
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Configuración de reportes
REPORTES_CONFIG = {
    'CACHE_TIMEOUT': 3600,  # 1 hora
    'MAX_EXPORT_SIZE': 10000,  # Máximo registros por exportación
    'ASYNC_THRESHOLD': 100,  # Umbral para procesamiento asíncrono
}

# Logging específico para reportes
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'reportes_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/reportes_produccion.log',
        },
    },
    'loggers': {
        'reportes_produccion': {
            'handlers': ['reportes_file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

## Conclusiones y Recomendaciones

### Beneficios Esperados

1. **Transparencia Financiera**: Reportes detallados y auditables que proporcionan visibilidad completa de la rentabilidad
2. **Toma de Decisiones Informada**: Análisis históricos y proyecciones para optimizar inversiones futuras
3. **Eficiencia Operativa**: Identificación de áreas de mejora y optimización de costos
4. **Cumplimiento Regulatorio**: Reportes profesionales para auditorías y presentaciones a stakeholders
5. **Escalabilidad**: Sistema preparado para manejar múltiples huertas y años de datos históricos

### Métricas de Éxito

- **Tiempo de generación**: < 10 segundos para reportes individuales, < 30 segundos para perfiles históricos
- **Precisión de datos**: 99.99% de exactitud en cálculos financieros
- **Adopción de usuarios**: 80% de usuarios activos utilizando reportes mensualmente
- **Satisfacción**: Puntuación > 4.5/5 en encuestas de usabilidad
- **Rendimiento**: Soporte para 1000+ reportes concurrentes sin degradación

### Consideraciones Futuras

1. **Inteligencia Artificial**: Implementar ML para predicciones más precisas y recomendaciones automáticas
2. **Integración Externa**: APIs para conectar con sistemas contables y de gestión empresarial
3. **Reportes Personalizados**: Constructor de reportes drag-and-drop para usuarios avanzados
4. **Análisis Comparativo**: Benchmarking con datos del sector agrícola
5. **Alertas Inteligentes**: Notificaciones automáticas basadas en umbrales y tendencias

### Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Rendimiento lento con datos grandes | Media | Alto | Cache inteligente, paginación, consultas optimizadas |
| Errores en cálculos financieros | Baja | Crítico | Tests exhaustivos, validaciones múltiples, auditoría |
| Problemas de concurrencia | Media | Medio | Queue system, rate limiting, monitoreo |
| Fallas en exportación | Baja | Medio | Manejo robusto de errores, reintentos automáticos |

---

**Este documento proporciona una guía completa para implementar un sistema de reportes de producción de clase empresarial que mantenga la consistencia y calidad del sistema existente, mientras agrega capacidades avanzadas de análisis y visualización de datos.**

**Fecha de creación**: 13 de enero de 2025  
**Versión**: 1.0  
**Autor**: Sistema de Análisis Agroproductores Risol


###
¡Buenísimo! Leí todo tu “paquete” de reportes (modelo, servicios, viewsets, exportadores, cache, seguridad y el frontend). La idea encaja perfecto con tu arquitectura actual, pero hay varios puntos finos a ajustar para que funcione “plug & play” y sin sorpresas.

# Lo que está sólido

* Enfoque por **servicios** (ReportesProduccionService) y **ViewSet** con `NotificationHandler`: consistente con el resto del sistema.
* Cálculos con `F()` y agregaciones (ROI, totales, por categoría/variedad) están bien planteados.
* Exportación **PDF/Excel** separada en `ExportacionService`.
* Planeación de **cache**, **auditoría** y **permisos** granular: alineado con lo que ya usan.

# Ajustes necesarios (críticos)

1. **Rutas / baseUrl (frontend ↔ backend)**

* En el backend registras el router como: `/api/reportes-produccion/...`.
* En el frontend pusiste `baseUrl = '/gestion-huerta/reportes-produccion'`.
* ✅ Corrige a: **`'/reportes-produccion'`** (si tu `apiClient` ya tiene base `/api`) o **`'/api/reportes-produccion'`** si no, el router corresto es huertas/

2. **Import del apiClient en frontend**

* En tus servicios existentes lo usas como **default import** (`import apiClient from ...`).
* En `reportes.service.ts` usas `{ apiClient }`.
* ✅ Cambia a **`import apiClient from '../../../global/api/apiClient'`**.

3. **PermissionButton (prop)**

* En tu app usas **`perm`** (no `permission`).
* En `GeneradorReportes.tsx` pusiste `permission="..."`.
* ✅ Cambia a `perm="gestion_huerta.view_reportes"` / `perm="gestion_huerta.export_reportes"`.

4. **Nombres de modelos/relaciones**

* En varios lugares usas **`InversionesHuerta`** (plural) y en otros el tipo es **`InversionHuerta`**.
* En Django, en consultas “totales de temporada” usas `InversionesHuerta.objects.filter(...)`.
* ✅ Unifica al **nombre real del modelo** (probable `InversionHuerta`) y revisa **related\_name** reales:

  * `cosecha.inversiones` / `cosecha.ventas` (confirma cómo se llaman en tus modelos).
  * En `prefetch_related(select_related('categoria'))` usa el related correcto de categoría.

5. **Validación de fechas (Security)**

* En `ReportesSecurityService` usas `timezone.datetime.fromisoformat`. `timezone` de Django **no** expone `datetime`.
* ✅ Usa `from datetime import datetime; datetime.fromisoformat(...)` (y maneja `Z` → `+00:00`).

6. **ReportLab TableStyle**

* `ALTERNATEROWCOLORS` no es clave válida.
* ✅ Usa `('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.lightgrey])`.
* Además, `colors.darkorange` no existe por defecto.
* ✅ Usa `colors.orange` o un **HEX** con `HexColor('#...')`.

7. **Tipos numéricos/Decimal**

* Cuando haces `Sum(F('num_cajas') * F('precio_por_caja'))` asegúrate que ambos campos son compatibles (Decimal/Integer).
* ✅ Mantén todo en **Decimal** en DB y castea a `Decimal('0')` en defaults. Ya lo haces, pero revisa que el serializer/cálculos **no mezclen float** (en el JSON final conviertes a `float`, está bien para la respuesta).

8. **Campos de Venta**

* Usas `venta.gasto` y `venta.ganancia_neta` en detalle.
* ✅ Confirma que **existan** en tu modelo/serializer (si no, calcula `ganancia_neta` al vuelo o elimínalo del JSON).

9. **Cache y seguridad: definidos pero no integrados**

* Definiste `ReporteProduccion` y `ReportesCacheService`, y `ReportesSecurityService`, pero **no los llamas**.
* ✅ En cada endpoint:

  * Genera **hash** con parámetros (y quizá “version” del algoritmo).
  * Busca en cache/bd por `hash_datos`.
  * Si existe y no está vencido → retorna.
  * Si no existe → generar, **validar integridad** (`ReportesSecurityService.validar_integridad_datos`), guardar cache y retornar.
  * Log de acceso (`log_acceso_reporte`) y permisos avanzados cuando exportas.

10. **Query optimization (nombres)**

* En `QueryOptimizationService` usas nombres tentativos de relateds.
* ✅ Aterrízalos a tus **related\_name reales** (ej. `'cosechas'`, `'inversiones'`, `'ventas'`, `'categoria'`).

# Ajustes recomendados (mejora)

* **Throttling/ratelimit** en `ReportesProduccionViewSet` (reportes pesados).
* **Paginación en detalle** al exportar (Excel especialmente) si superan `MAX_EXPORT_SIZE`.
* **Exportación PDF temporada/perfil**: dejaste placeholders; completar para producción.
* **Colores/UX** en viewers (Recharts): respeta tema y usa tooltips con formateadores centralizados.
* **Formateadores**: confirmá que existen `formatCurrency` y `formatPercentage` (o crea utilidades).
* **Permisos**:

  * Ver JSON: `gestion_huerta.view_reportes`
  * Exportar: `gestion_huerta.export_reportes`
  * Ver datos financieros sensibles: `gestion_huerta.view_financial_data` (si quieres granularidad).
* **Tests**: unitarios de servicio (totales, ROI, divisiones por cero, sin datos).

# Integración mínima para que “prenda”

1. Backend

   * Ajustar nombres de modelos/relateds en los `querysets`.
   * Integrar **cache + hash + validación** en los métodos del ViewSet.
   * Corregir **ReportLab** claves/colores.
   * Confirmar campos de `Venta` usados en detalle.

2. Frontend

   * Corregir **baseUrl** + **apiClient default import**.
   * Cambiar `permission` → **`perm`** en `PermissionButton`.
   * Confirmar existencia de hooks (`useCosechas`, `useTemporadas`, `useHuertas`) y formateadores.
   * Opcional: mostrar un **skeleton**/progress más sutil durante generación.

# Snippets cortos (solo los cambios clave)

**Frontend – servicio (rutas + apiClient):**

```ts
// services/reportes.service.ts
import apiClient from '../../../global/api/apiClient';

const baseUrl = '/reportes-produccion'; // si apiClient ya tiene /api

// ... el resto igual
```

**Frontend – PermissionButton:**

```tsx
<PermissionButton
  variant="outlined"
  startIcon={<Visibility />}
  onClick={() => handleGenerarReporte(values, 'json')}
  disabled={loading}
  perm="gestion_huerta.view_reportes"
/>
```

**Backend – ReportLab alternancia de filas:**

```python
TableStyle([
   # ...
   ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.lightgrey]),
])
```

**Backend – fromisoformat:**

```python
from datetime import datetime
fecha_reporte = datetime.fromisoformat(reporte_data['metadata']['fecha_generacion'].replace('Z', '+00:00'))
```

---

Si quieres, te preparo el parche concreto (mínimo y seguro) con estos cambios puntuales para que puedas pegarlo directo en tu codebase. Y cuando valides las `related_name` reales, ajustamos los prefetch/select para exprimir rendimiento.
###