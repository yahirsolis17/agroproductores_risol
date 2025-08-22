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
# TODO: implementar funciones arriba mencionadas
# backend/gestion_huerta/utils/reporting.py

from decimal import Decimal
from django.db.models import Sum, F, Q, Avg
from django.db.models.functions import TruncMonth
from gestion_huerta.models import Cosecha, Temporada, Huerta, HuertaRentada, InversionesHuerta, Venta

def aggregates_for_cosecha(cosecha_id: int):
    """Calcula KPI y datos agregados para el reporte individual de una cosecha."""
    cosecha = Cosecha.objects.select_related('temporada', 'huerta', 'huerta_rentada').get(pk=cosecha_id)
    # Totales financieros
    # Sumamos inversiones totales de la cosecha (insumos + mano de obra)
    inv_totales = cosecha.inversiones.filter(is_active=True).aggregate(
        total_insumos=Sum('gastos_insumos'), total_mano=Sum('gastos_mano_obra')
    )
    total_inversiones = (inv_totales['total_insumos'] or 0) + (inv_totales['total_mano'] or 0)
    # Sumar ventas totales (ingresos brutos) de la cosecha 
    ventas_tot = cosecha.ventas.filter(is_active=True).aggregate(
        total_ingreso=Sum(F('num_cajas') * F('precio_por_caja')),
        total_cajas=Sum('num_cajas'),
        total_gastos_ventas=Sum('gasto')
    )
    total_ventas = ventas_tot['total_ingreso'] or 0
    total_cajas = int(ventas_tot['total_cajas'] or 0)
    gastos_ventas = ventas_tot['total_gastos_ventas'] or 0  # gastos asociados a ventas (ej. envío)
    # Ganancias
    ganancia_bruta = total_ventas - total_inversiones
    ganancia_neta = total_ventas - total_inversiones - gastos_ventas
    roi = (float(ganancia_neta) / total_inversiones * 100) if total_inversiones > 0 else 0.0
    # Métricas de rendimiento por unidad
    precio_promedio = (total_ventas / total_cajas) if total_cajas > 0 else 0
    costo_unitario = ((total_inversiones + gastos_ventas) / total_cajas) if total_cajas > 0 else 0
    margen_unitario = (ganancia_neta / total_cajas) if total_cajas > 0 else 0

    # Construir lista de KPI (id, etiqueta, valor formateado, hint opcional)
    kpis = [
        {"id": "inv_total", "label": "Total Inversiones", "value": f"${total_inversiones:,.2f}"},
        {"id": "ventas_total", "label": "Total Ventas", "value": f"${total_ventas:,.2f}"},
        {"id": "ganancia_bruta", "label": "Ganancia Bruta", "value": f"${ganancia_bruta:,.2f}"},
        {"id": "ganancia_neta", "label": "Ganancia Neta", "value": f"${ganancia_neta:,.2f}"},
        {"id": "roi", "label": "ROI", "value": f"{roi:.1f}%"},
        {"id": "ganancia_hectarea", "label": "Ganancia/Ha", 
         "value": f"${ganancia_neta/ cosecha.huerta.hectareas:,.2f}" if cosecha.huerta else f"${ganancia_neta/ cosecha.huerta_rentada.hectareas:,.2f}"}
    ]
    # Nota: se asume que cosecha.huerta o huerta_rentada existe para hectáreas. Se puede validar.

    # Preparar tabla de detalle de inversiones (columna: Fecha, Categoría, Insumos, Mano de Obra, Total)
    inversiones = cosecha.inversiones.filter(is_active=True).select_related('categoria').order_by('fecha')
    tabla_inv = {
        "columns": ["Fecha", "Categoría", "Insumos", "Mano de Obra", "Total"],
        "rows": []
    }
    for inv in inversiones:
        fila = [
            inv.fecha.strftime("%Y-%m-%d"),
            inv.categoria.nombre,
            f"${inv.gastos_insumos:,.2f}",
            f"${inv.gastos_mano_obra:,.2f}",
            f"${inv.gastos_totales:,.2f}"
        ]
        tabla_inv["rows"].append(fila)
    # Preparar tabla de detalle de ventas (Fecha, Variedad, Cajas, Precio/Caja, Total)
    ventas = cosecha.ventas.filter(is_active=True).order_by('fecha_venta')
    tabla_ventas = {
        "columns": ["Fecha", "Variedad", "Cajas", "Precio/Caja", "Total"],
        "rows": []
    }
    for v in ventas:
        fila = [
            v.fecha_venta.strftime("%Y-%m-%d"),
            v.tipo_mango,
            str(v.num_cajas),
            f"${v.precio_por_caja:,.2f}",
            f"${v.total_venta:,.2f}"
        ]
        tabla_ventas["rows"].append(fila)

    # Devolver datos agregados relevantes (kpis y tablas detalladas)
    return {
        "kpis": kpis,
        "tabla_inversiones": tabla_inv,
        "tabla_ventas": tabla_ventas
    }

def series_for_cosecha(cosecha_id: int):
    """Prepara series de datos (ej. distribución de inversiones) para una cosecha."""
    cosecha = Cosecha.objects.get(pk=cosecha_id)
    # Serie de distribución de inversiones por categoría (pie chart)
    distribucion = cosecha.inversiones.filter(is_active=True).values('categoria__nombre').annotate(
        total=Sum(F('gastos_insumos') + F('gastos_mano_obra'))
    )
    data_pie = []
    for item in distribucion:
        categoria = item['categoria__nombre']
        total = float(item['total'] or 0)
        data_pie.append({"name": categoria, "value": round(total, 2)})
    series = [
        {"id": "dist_inversion", "label": "Distribución Inversiones", "type": "pie", "data": data_pie}
    ]
    # (Podrían añadirse más series, e.g. alguna comparación vs expectativa, pero por ahora solo esta)
    return series

def aggregates_for_temporada(temporada_id: int):
    """Calcula KPI consolidados y tabla comparativa para una temporada."""
    temp = Temporada.objects.select_related('huerta','huerta_rentada').get(pk=temporada_id)
    # Filtrar cosechas activas de esta temporada
    cosechas = temp.cosechas.filter(is_active=True)
    # Totales temporada
    inv_tot = InversionesHuerta.objects.filter(is_active=True, temporada=temp).aggregate(total=Sum(F('gastos_insumos')+F('gastos_mano_obra')))
    ventas_tot = Venta.objects.filter(is_active=True, temporada=temp).aggregate(
        ingreso=Sum(F('num_cajas')*F('precio_por_caja')), 
        gasto_ventas=Sum('gasto'),
        cajas=Sum('num_cajas')
    )
    total_inversiones = float(inv_tot['total'] or 0)
    total_ventas = float(ventas_tot['ingreso'] or 0)
    gastos_ventas = float(ventas_tot['gasto_ventas'] or 0)
    total_cajas = int(ventas_tot['cajas'] or 0)
    ganancia_neta = total_ventas - total_inversiones - gastos_ventas
    roi_temp = (ganancia_neta/ total_inversiones * 100) if total_inversiones > 0 else 0.0
    productividad = (total_cajas / (temp.huerta.hectareas if temp.huerta else temp.huerta_rentada.hectareas)) if total_cajas>0 else 0

    kpis = [
        {"id": "inv_total", "label": "Inversión Total", "value": f"${total_inversiones:,.2f}"},
        {"id": "ventas_total", "label": "Ventas Totales", "value": f"${total_ventas:,.2f}"},
        {"id": "ganancia_neta", "label": "Ganancia Neta", "value": f"${ganancia_neta:,.2f}"},
        {"id": "roi", "label": "ROI Temporada", "value": f"{roi_temp:.1f}%"},
        {"id": "productividad", "label": "Productividad", "value": f"{productividad:.1f} cajas/ha"}
    ]
    # Tabla comparativa por cosecha
    tabla = {
        "columns": ["Cosecha", "Inversión", "Ventas", "Ganancia", "ROI", "Cajas"],
        "rows": []
    }
    for c in cosechas:
        # Se pueden reutilizar los agregados de cosecha para cada c:
        data_c = aggregates_for_cosecha(c.id)  # obtenemos kpis de la cosecha c
        # Extraer de data_c los valores necesarios:
        inv_c = data_c["kpis"][0]["value"]   # Total Inversiones (string format)
        vent_c = data_c["kpis"][1]["value"]  # Total Ventas
        gan_c = data_c["kpis"][3]["value"]   # Ganancia Neta (como string)
        roi_c = data_c["kpis"][4]["value"]   # ROI
        cajas_c = next((k for k in data_c["kpis"] if k["id"]=="cajas_totales"), None)
        if cajas_c is None:
            # Si no se calculó explicitamente cajas_totales en kpis de cosecha, obtenerlo directamente:
            cajas_tot_c = c.ventas.filter(is_active=True).aggregate(total=Sum('num_cajas'))['total'] or 0
            cajas_val = f"{int(cajas_tot_c)}"
        else:
            cajas_val = str(cajas_c["value"])
        tabla["rows"].append([c.nombre, inv_c, vent_c, gan_c, roi_c, cajas_val])
    return { "kpis": kpis, "tabla": tabla }

def series_for_temporada(temporada_id: int):
    """Prepara series de datos (evolución mensual, distribuciones) para una temporada."""
    temp = Temporada.objects.get(pk=temporada_id)
    # Serie 1: Inversiones por mes
    inv_mensuales = InversionesHuerta.objects.filter(is_active=True, temporada=temp) \
                    .annotate(mes=TruncMonth('fecha')) \
                    .values('mes').annotate(total=Sum(F('gastos_insumos')+F('gastos_mano_obra'))).order_by('mes')
    data_inv_mes = [ { "x": item["mes"].strftime("%Y-%m"), "y": float(item["total"] or 0) } for item in inv_mensuales ]
    # Serie 2: Ventas por mes
    ventas_mens = Venta.objects.filter(is_active=True, temporada=temp) \
                    .annotate(mes=TruncMonth('fecha_venta')) \
                    .values('mes').annotate(total=Sum(F('num_cajas')*F('precio_por_caja'))).order_by('mes')
    data_ventas_mes = [ { "x": item["mes"].strftime("%Y-%m"), "y": float(item["total"] or 0) } for item in ventas_mens ]
    # Serie 3: Distribución de inversiones por categoría (pie)
    dist_inv = InversionesHuerta.objects.filter(is_active=True, temporada=temp) \
                .values('categoria__nombre').annotate(total=Sum(F('gastos_insumos')+F('gastos_mano_obra')))
    data_pie = [ {"name": cat["categoria__nombre"], "value": float(cat["total"] or 0)} for cat in dist_inv ]
    # Serie 4: Análisis de variedades (podemos usar barras donde X=variedad, Y=ingreso total)
    var_stats = Venta.objects.filter(is_active=True, temporada=temp) \
                .values('tipo_mango').annotate(
                    cajas=Sum('num_cajas'), 
                    ingreso=Sum(F('num_cajas')*F('precio_por_caja'))
                )
    data_var = []
    total_ingreso = sum([v["ingreso"] or 0 for v in var_stats])
    for v in var_stats:
        ingreso = float(v["ingreso"] or 0)
        prom_precio = ingreso / v["cajas"] if v["cajas"] and v["ingreso"] else 0
        porcentaje = (ingreso/ total_ingreso*100) if total_ingreso > 0 else 0
        data_var.append({
            "variedad": v["tipo_mango"], 
            "cajas": int(v["cajas"] or 0),
            "precio_prom": round(prom_precio,2),
            "ingreso": round(ingreso,2),
            "porcentaje": round(porcentaje,1)
        })
    # Construir lista de series con sus tipos
    series = [
        {"id": "inv_mensuales", "label": "Inversiones por Mes", "type": "bar", "data": data_inv_mes},
        {"id": "ventas_mensuales", "label": "Ventas por Mes", "type": "line", "data": data_ventas_mes},
        {"id": "dist_inversion", "label": "Distribución Inversiones", "type": "pie", "data": data_pie},
        {"id": "variedades", "label": "Ventas por Variedad", "type": "bar", "data": data_var}
    ]
    return series

def aggregates_for_huerta(huerta_id: int):
    """Calcula KPIs históricos y tabla de resumen por año para el perfil de huerta."""
    # Determinar si es huerta propia o rentada
    try:
        huerta = Huerta.objects.get(pk=huerta_id)
        tipo = "Propia"
    except Huerta.DoesNotExist:
        huerta = HuertaRentada.objects.get(pk=huerta_id)
        tipo = "Rentada"
    # Obtener todas las temporadas de esta huerta
    temporadas = Temporada.objects.filter(Q(huerta=huerta) | Q(huerta_rentada=huerta), is_active=True).order_by('-año')
    # Calcular resumen por año
    resumen = {}
    for temp in temporadas:
        year = temp.año
        if year not in resumen:
            resumen[year] = {"inversion": 0, "ventas": 0, "ganancia": 0, "cajas": 0, "roi": 0.0}
        inv = InversionesHuerta.objects.filter(is_active=True, temporada=temp) \
                .aggregate(total=Sum(F('gastos_insumos')+F('gastos_mano_obra')))["total"] or 0
        ventas_data = Venta.objects.filter(is_active=True, temporada=temp).aggregate(
            ingreso=Sum(F('num_cajas')*F('precio_por_caja')), gasto_ventas=Sum('gasto'), cajas=Sum('num_cajas')
        )
        ingreso = ventas_data["ingreso"] or 0
        gasto_ventas = ventas_data["gasto_ventas"] or 0
        cajas = int(ventas_data["cajas"] or 0)
        ganancia_neta = ingreso - inv - (gasto_ventas or 0)
        roi = (ganancia_neta / inv * 100) if inv > 0 else 0
        resumen[year]["inversion"] += float(inv)
        resumen[year]["ventas"] += float(ingreso)
        resumen[year]["ganancia"] += float(ganancia_neta)
        resumen[year]["cajas"] += cajas
        resumen[year]["roi"] += roi  # (si solo hay una temporada por año, es ROI de esa temporada)
    # Construir tabla (últimos 5 años, o menos si no hay tantos)
    years = sorted(resumen.keys(), reverse=True)[:5]
    tabla = {
        "columns": ["Año", "Inversión", "Ventas", "Ganancia", "ROI", "Cajas"],
        "rows": []
    }
    for y in years:
        data = resumen[y]
        tabla["rows"].append([
            str(y),
            f"${data['inversion']:,.2f}",
            f"${data['ventas']:,.2f}",
            f"${data['ganancia']:,.2f}",
            f"{data['roi']:.1f}%",
            f"{data['cajas']} cajas"
        ])
    # KPI históricos adicionales:
    # Promedios y tendencias
    if years:
        # Ordenamos cronológicamente para tendencia
        oldest, newest = years[-1], years[0]
        roi_vals = [resumen[yr]["roi"] for yr in years]
        avg_roi = sum(roi_vals) / len(roi_vals)
        # Desviación estándar ROI (simple)
        var_roi = sum((r-avg_roi)**2 for r in roi_vals) / len(roi_vals) if roi_vals else 0
        std_roi = var_roi**0.5
        mejor_año = max(years, key=lambda yr: resumen[yr]["roi"])
        peor_año = min(years, key=lambda yr: resumen[yr]["roi"])
        tendencia = "Creciente" if resumen[newest]["roi"] > resumen[oldest]["roi"] else ("Decreciente" if resumen[newest]["roi"] < resumen[oldest]["roi"] else "Estable")
    else:
        avg_roi = std_roi = 0
        mejor_año = peor_año = None
        tendencia = "N/A"
    kpis = [
        {"id": "mejor_temp", "label": "Mejor Temporada", "value": f"{mejor_año} (ROI {resumen[mejor_año]['roi']:.1f}%)" if mejor_año else "N/A"},
        {"id": "peor_temp", "label": "Peor Temporada", "value": f"{peor_año} (ROI {resumen[peor_año]['roi']:.1f}%)" if peor_año else "N/A"},
        {"id": "roi_prom", "label": "ROI Promedio Histórico", "value": f"{avg_roi:.1f}%"},
        {"id": "roi_var", "label": "Variabilidad ROI (desv)", "value": f"±{std_roi:.1f}%"},
        {"id": "tendencia", "label": "Tendencia ROI", "value": tendencia}
    ]
    return {"kpis": kpis, "tabla": tabla}

def series_for_huerta(huerta_id: int):
    """Prepara series históricas (ingresos vs gastos, ROI anual, productividad, etc.) para una huerta."""
    try:
        huerta = Huerta.objects.get(pk=huerta_id)
    except Huerta.DoesNotExist:
        huerta = HuertaRentada.objects.get(pk=huerta_id)
    # Series 1: Ingresos vs Gastos por año
    inv_por_anio = InversionesHuerta.objects.filter(is_active=True).filter(Q(huerta=huerta) | Q(huerta_rentada=huerta)) \
                  .values('temporada__año').annotate(total_inv=Sum(F('gastos_insumos')+F('gastos_mano_obra')))
    ventas_por_anio = Venta.objects.filter(is_active=True).filter(Q(huerta=huerta) | Q(huerta_rentada=huerta)) \
                    .values('temporada__año').annotate(total_ventas=Sum(F('num_cajas')*F('precio_por_caja')))
    data_ingresos = {item['temporada__año']: float(item['total_ventas'] or 0) for item in ventas_por_anio}
    data_gastos = {item['temporada__año']: float(item['total_inv'] or 0) for item in inv_por_anio}
    anios = sorted(set(list(data_ingresos.keys()) + list(data_gastos.keys())))
    data_line = []
    for year in anios:
        data_line.append({
            "year": str(year),
            "inversion": data_gastos.get(year, 0.0),
            "ventas": data_ingresos.get(year, 0.0)
        })
    # Series 2: ROI por año
    roi_por_anio = []
    for year in anios:
        inv = data_gastos.get(year, 0.0)
        ventas = data_ingresos.get(year, 0.0)
        # Asumimos gastos de ventas negligible a nivel agregado (o podríamos sumarlos similar a ventas)
        roi = (ventas - inv) / inv * 100 if inv > 0 else 0
        roi_por_anio.append({"year": str(year), "roi": round(roi,1)})
    # Series 3: Cajas por hectárea (productividad) por año
    # Para esto necesitamos sumar cajas y dividir por hectáreas de la huerta
    cajas_por_anio = Venta.objects.filter(is_active=True).filter(Q(huerta=huerta) | Q(huerta_rentada=huerta)) \
                    .values('temporada__año').annotate(total_cajas=Sum('num_cajas'))
    data_prod = []
    hectareas = huerta.hectareas if hasattr(huerta, 'hectareas') else huerta.hectareas  # HuertaRentada también tiene hectareas
    for item in cajas_por_anio:
        year = item['temporada__año']
        cajas = item['total_cajas'] or 0
        prod = (cajas / hectareas) if hectareas else 0
        data_prod.append({"year": str(year), "cajas_por_ha": round(prod,1)})
    # Series 4: Distribución histórica de inversiones por categoría (por simplicidad, consolidado de todos los años)
    dist_cat = InversionesHuerta.objects.filter(is_active=True).filter(Q(huerta=huerta) | Q(huerta_rentada=huerta)) \
              .values('categoria__nombre').annotate(total=Sum(F('gastos_insumos')+F('gastos_mano_obra')))
    data_pie = [ {"name": cat["categoria__nombre"], "value": float(cat["total"] or 0)} for cat in dist_cat ]
    # Series 5: Estacionalidad de ventas (por mes a lo largo de años, podría ser un heatmap; aquí damos datos agregados por mes)
    ventas_por_mes = Venta.objects.filter(is_active=True).filter(Q(huerta=huerta) | Q(huerta_rentada=huerta)) \
                    .annotate(mes=TruncMonth('fecha_venta')).values('mes').annotate(total=Sum(F('num_cajas')*F('precio_por_caja')))
    data_mes = [ {"mes": item["mes"].strftime("%m"), "ingreso": float(item["total"] or 0)} for item in ventas_por_mes ]
    # Series 6: Variedades por año (podemos crear datos para un gráfico de barras apiladas, omitimos detalle aquí por brevedad)
    # ...
    series = [
        {"id": "ingresos_vs_gastos", "label": "Ingresos vs Inversiones por Año", "type": "line", "data": data_line},
        {"id": "roi_anual", "label": "ROI por Año", "type": "bar", "data": roi_por_anio},
        {"id": "productividad", "label": "Cajas por Ha por Año", "type": "area", "data": data_prod},
        {"id": "dist_inversion_hist", "label": "Distribución Hist. Inversiones", "type": "pie", "data": data_pie},
        {"id": "estacionalidad", "label": "Estacionalidad de Ventas", "type": "line", "data": data_mes}
        # ... etc.
    ]
    return series
