// useReporteCosecha.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { ReporteProduccionData, InfoHuerta, KPIData, SeriesDataPoint } from '../types/reportesProduccionTypes';

// ---- Helpers de agregación (fallback solo si backend NO manda ui.series) ----
const sumByDate = (items: any[], dateKey: string, valueKey: string) => {
  const acc: Record<string, number> = {};
  for (const it of items || []) {
    const raw = it?.[dateKey];
    if (!raw) continue;
    const d = String(raw).slice(0, 10); // YYYY-MM-DD
    const val = Number(it?.[valueKey] ?? 0);
    acc[d] = (acc[d] ?? 0) + (Number.isFinite(val) ? val : 0);
  }
  return Object.entries(acc)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([fecha, valor]) => ({ fecha, valor }));
};

const toSeriesAny = (arr: any[]): SeriesDataPoint[] =>
  (arr || [])
    .map((r: any) => ({
      fecha: String(r?.fecha ?? r?.x ?? ''),
      valor: Number(r?.valor ?? r?.y ?? r?.total ?? 0),
    }))
    .filter((p) => !!p.fecha);

const sortISO = (arr: SeriesDataPoint[]) =>
  [...arr].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

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
  const ui = reporte.ui || {};

  // ---- 1) Priorizar kpis/series de backend (ui) ----
  let kpis: KPIData[] = Array.isArray(ui.kpis) ? ui.kpis : [];
  let series: { inversiones?: SeriesDataPoint[]; ventas?: SeriesDataPoint[]; ganancias?: SeriesDataPoint[] } =
    typeof ui.series === 'object' ? {
      inversiones: toSeriesAny(ui.series?.inversiones || []),
      ventas: toSeriesAny(ui.series?.ventas || []),
      ganancias: toSeriesAny(ui.series?.ganancias || []),
    } : {};

  // ---- 2) Fallback si backend no mandó ui ----
  if (!kpis.length) {
    kpis = [
      { label: 'Total Inversiones', value: Number(resumen.total_inversiones || 0), format: 'currency' as const },
      { label: 'Total Ventas', value: Number(resumen.total_ventas || 0), format: 'currency' as const },
      { label: 'Gastos de Venta', value: Number(resumen.total_gastos_venta || 0), format: 'currency' as const },
      { label: 'Ganancia Neta', value: Number(resumen.ganancia_neta || 0), format: 'currency' as const },
      { label: 'ROI', value: Number(resumen.roi_porcentaje || 0), format: 'percentage' as const },
      { label: 'Cajas Totales', value: Number(rendimiento.cajas_totales || 0), format: 'number' as const },
      { label: 'Precio Prom. Caja', value: Number(rendimiento.precio_promedio_caja || 0), format: 'currency' as const },
      { label: 'Costo por Caja', value: Number(rendimiento.costo_por_caja || 0), format: 'currency' as const },
      { label: 'Margen por Caja', value: Number(rendimiento.margen_por_caja || 0), format: 'currency' as const },
      { label: 'Ganancia por Ha', value: Number(resumen.ganancia_por_hectarea || 0), format: 'currency' as const },
    ];
  }

  if (!series.inversiones?.length && !series.ventas?.length && !series.ganancias?.length) {
    const inv = sumByDate(detalleInv, 'fecha', 'total');
    const ven = sumByDate(detalleVen, 'fecha', 'total_venta');
    const gan = sumByDate(detalleVen, 'fecha', 'ganancia_neta');
    series = {
      inversiones: sortISO(inv),
      ventas:      sortISO(ven),
      ganancias:   sortISO(gan),
    };
  }

  // ---- Tablas (si ui no las manda, usamos detalle) ----
  const tablas = {
    inversiones: Array.isArray(ui?.tablas?.inversiones) && ui.tablas.inversiones.length
      ? ui.tablas.inversiones
      : detalleInv.map((x: any) => ({
          id: Number(x.id ?? 0),
          categoria: x.categoria || 'Sin categoría',
          descripcion: x.descripcion || '',
          monto: Number(x.total || 0),
          fecha: x.fecha || '',
        })),
    ventas: Array.isArray(ui?.tablas?.ventas) && ui.tablas.ventas.length
      ? ui.tablas.ventas
      : detalleVen.map((x: any) => ({
          id: Number(x.id ?? 0),
          fecha: x.fecha || '',
          cantidad: Number(x.num_cajas || 0),
          precio_unitario: Number(x.precio_por_caja || 0),
          total: Number(x.total_venta || 0),
          /** NUEVO: mapeo de gastos de venta por registro */
          gasto: Number(x.gasto || 0),
          comprador: '',
        })),
  };

  // Periodo
  const periodoInicio = info.fecha_inicio || filtroFrom || '';
  const periodoFin = info.fecha_fin || filtroTo || '';

  // Ficha de huerta (para cabecera)
  const infoHuerta: InfoHuerta = {
    huerta_nombre: String(info.huerta_nombre || ''),
    huerta_tipo: (info.huerta_tipo || '') as any,
    propietario: String(info.propietario || ''),
    ubicacion: String(info.ubicacion || ''),
    hectareas: Number(info.hectareas || 0),
    temporada_año: info.temporada_año,
    cosecha_nombre: String(info.cosecha_nombre || ''),
    estado: String(info.estado || ''),
    fecha_inicio: info.fecha_inicio || '',
    fecha_fin: info.fecha_fin || '',
  };

  // QA silenciosa (si seguimos usando detalle)
  try {
    const sumInv = detalleInv.reduce((acc: number, it: any) => acc + Number(it?.total || 0), 0);
    const sumVen = detalleVen.reduce((acc: number, it: any) => acc + Number(it?.total_venta || 0), 0);
    const tol = 0.01;
    if (Math.abs(sumInv - Number(resumen.total_inversiones || 0)) > tol) {
      // eslint-disable-next-line no-console
      console.warn('[QA] Inconsistencia total inversiones vs detalle', { sumInv, total: resumen.total_inversiones });
    }
    if (Math.abs(sumVen - Number(resumen.total_ventas || 0)) > tol) {
      // eslint-disable-next-line no-console
      console.warn('[QA] Inconsistencia total ventas vs detalle', { sumVen, total: resumen.total_ventas });
    }
  } catch {}

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
      infoHuerta,
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

  const totals = useMemo(() => {
    if (!data) return null;
    const inv = (data.tablas.inversiones || []).reduce((a, r) => a + (r.monto || 0), 0);
    const ven = (data.tablas.ventas || []).reduce((a, r) => a + (r.total || 0), 0);
    return { inversiones: inv, ventas: ven };
  }, [data]);

  return { data, loading, error, refetch: fetchData, totals };
};
