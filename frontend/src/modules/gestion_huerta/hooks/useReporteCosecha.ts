import { useCallback, useEffect, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { ReporteProduccionData } from '../types/reportesProduccionTypes';

// ---- Helpers de agregación (sumas por DÍA) ----
const sumByDate = (items: any[], dateKey: string, valueKey: string) => {
  const acc: Record<string, number> = {};
  for (const it of items || []) {
    const raw = it?.[dateKey];
    if (!raw) continue;
    const d = String(raw).slice(0, 10); // YYYY-MM-DD seguro
    const val = Number(it?.[valueKey] || 0);
    acc[d] = (acc[d] ?? 0) + (Number.isFinite(val) ? val : 0);
  }
  // ordenar ascendente por fecha
  return Object.entries(acc)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([fecha, valor]) => ({ fecha, valor }));
};

// ---- Adaptador: backend (reporte.cosecha) -> contrato UI (ReporteProduccionData) ----
const adaptCosechaToUI = (reporte: any, filtroFrom?: string, filtroTo?: string): ReporteProduccionData => {
  if (!reporte || typeof reporte !== 'object') {
    return {
      kpis: [],
      series: {},
      tablas: {},
      metadata: {
        periodo: { inicio: filtroFrom || '', fin: filtroTo || '' },
        entidad: { id: 0, nombre: 'Cosecha', tipo: 'cosecha' },
        generado_en: new Date().toISOString(),
        generado_por: '',
      },
    };
  }

  const meta = reporte.metadata || {};
  const info = reporte.informacion_general || {};
  const resumen = reporte.resumen_financiero || {};
  const detalleInv = Array.isArray(reporte.detalle_inversiones) ? reporte.detalle_inversiones : [];
  const detalleVen = Array.isArray(reporte.detalle_ventas) ? reporte.detalle_ventas : [];
  const rendimiento = reporte.metricas_rendimiento || {};

  // KPIs
  const kpis = [
    { label: 'Total Inversiones', value: Number(resumen.total_inversiones || 0), format: 'currency' as const },
    { label: 'Total Ventas', value: Number(resumen.total_ventas || 0), format: 'currency' as const },
    { label: 'Ganancia Neta', value: Number(resumen.ganancia_neta || 0), format: 'currency' as const },
    { label: 'ROI', value: Number(resumen.roi_porcentaje || 0), format: 'percentage' as const },
    { label: 'Cajas Totales', value: Number(rendimiento.cajas_totales || 0), format: 'number' as const },
    { label: 'Precio Prom. Caja', value: Number(rendimiento.precio_promedio_caja || 0), format: 'currency' as const },
    { label: 'Costo por Caja', value: Number(rendimiento.costo_por_caja || 0), format: 'currency' as const },
    { label: 'Margen por Caja', value: Number(rendimiento.margen_por_caja || 0), format: 'currency' as const },
    { label: 'Ganancia por Ha', value: Number(resumen.ganancia_por_hectarea || 0), format: 'currency' as const },
  ];

  // Series agregadas por día (precisas)
  const series = {
    inversiones: sumByDate(detalleInv, 'fecha', 'total'),
    ventas: sumByDate(detalleVen, 'fecha', 'total_venta'),
    ganancias: sumByDate(detalleVen, 'fecha', 'ganancia_neta'),
  };

  // Tablas (detalle)
  const tablas = {
    inversiones: detalleInv.map((x: any, idx: number) => ({
      id: idx + 1,
      categoria: x.categoria || 'Sin categoría',
      descripcion: x.descripcion || '',
      monto: Number(x.total || 0),
      fecha: x.fecha || '',
    })),
    ventas: detalleVen.map((x: any, idx: number) => ({
      id: idx + 1,
      fecha: x.fecha || '',
      cantidad: Number(x.num_cajas || 0),
      precio_unitario: Number(x.precio_por_caja || 0),
      total: Number(x.total_venta || 0),
      comprador: '',
    })),
  };

  // Periodo
  const filtros = (meta && meta.filtros) || {};
  const periodoInicio = filtros.fecha_inicio || info.fecha_inicio || filtroFrom || '';
  const periodoFin = filtros.fecha_fin || info.fecha_fin || filtroTo || '';

  return {
    kpis,
    series,
    tablas,
    metadata: {
      periodo: { inicio: periodoInicio || '', fin: periodoFin || '' },
      entidad: {
        id: Number(meta.cosecha_id || info.cosecha_id || 0),
        nombre: String(info.cosecha_nombre || info.huerta_nombre || 'Cosecha'),
        tipo: 'cosecha',
      },
      generado_en: meta.fecha_generacion || new Date().toISOString(),
      generado_por: meta.generado_por || '',
    },
  };
};
// ---- Fin adaptador ----

export const useReporteCosecha = (id?: number, from?: string, to?: string) => {
  const [data, setData] = useState<ReporteProduccionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await reportesProduccionService.generarReporteCosecha({
        cosecha_id: id,
        formato: 'json',
      });
      if (response.success) {
        const adapted = adaptCosechaToUI(response.data, from, to);
        setData(adapted);
      } else {
        setError(response.message || 'Error al cargar reporte de cosecha');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar reporte de cosecha');
    } finally {
      setLoading(false);
    }
  }, [id, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
