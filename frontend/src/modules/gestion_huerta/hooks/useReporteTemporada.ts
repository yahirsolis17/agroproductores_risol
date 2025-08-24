import { useCallback, useEffect, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import {
  ReporteProduccionData,
  KPIData,
  FilaComparativoCosecha,
  SeriesDataPoint,
  InfoHuerta,
} from '../types/reportesProduccionTypes';

// --- utils de parseo seguros ---
const num = (x: any, d = 0) => {
  const n = Number(String(x).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : d;
};
const pct = (x: any) => num(String(x).replace('%', ''));
const money = (x: any) => num(String(x).replace(/[^\d.-]/g, ''));

// merge por clave fecha (YYYY-MM)
const mergeByMonth = (a: SeriesDataPoint[], b: SeriesDataPoint[]) => {
  const map: Record<string, { a?: number; b?: number }> = {};
  for (const it of a) map[it.fecha] = { ...(map[it.fecha] || {}), a: it.valor };
  for (const it of b) map[it.fecha] = { ...(map[it.fecha] || {}), b: it.valor };
  return Object.entries(map)
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([fecha, v]) => ({ fecha, valor: (v.b || 0) - (v.a || 0) }));
};

const toMonthSeries = (list: any[], xKey: string, yKey: string): SeriesDataPoint[] =>
  (list || [])
    .map((r) => ({
      fecha: String(r?.[xKey] ?? ''),
      valor: Number(r?.[yKey] ?? 0),
    }))
    .filter((r) => r.fecha);

// --- Adaptador flexible: soporta dos formas de backend ---
//  A) utils/reporting.py -> { kpis:[], tabla:{columns,rows} } + series_for_temporada()
//  B) service “rico” -> { resumen_ejecutivo, series, comparativo_cosechas }
const adaptTemporadaToUI = (raw: any): ReporteProduccionData => {
  // Default vacío
  const empty: ReporteProduccionData = {
    kpis: [],
    series: {},
    tablas: {},
    metadata: {
      periodo: { inicio: '', fin: '' },
      entidad: { id: 0, nombre: 'Temporada', tipo: 'temporada' },
      generado_en: new Date().toISOString(),
      generado_por: '',
    },
  };
  if (!raw || typeof raw !== 'object') return empty;

  // -------- Opción A: salida de utils/reporting.py
  if (Array.isArray(raw.kpis) || raw.tabla) {
    // KPIs: inferir formato por etiqueta
    const kpis: KPIData[] = (raw.kpis || []).map((k: any) => {
      const label = String(k?.label ?? k?.id ?? '');
      const value = k?.value;
      let format: KPIData['format'] | undefined;
      if (/roi/i.test(label) || /%/.test(String(value))) format = 'percentage';
      else if (/\$/.test(String(value)) || /inversi|ventas|ganan/i.test(label)) format = 'currency';
      else if (/cajas|productividad/i.test(label)) format = /productividad/i.test(label) ? undefined : 'number';
      const parsed =
        format === 'currency' ? money(value)
        : format === 'percentage' ? pct(value)
        : num(value);
      return { label, value: parsed, format };
    });

    // Series mensuales si las pasaron por separado (opcional)
    // Algunas implementaciones devuelven un array de series con ids
    const rawSeries = Array.isArray(raw.series) ? raw.series : [];
    const inv_s = rawSeries.find((s: any) => s?.id === 'inv_mensuales');
    const ven_s = rawSeries.find((s: any) => s?.id === 'ventas_mensuales');
    const inversiones = inv_s ? toMonthSeries(inv_s.data, 'x', 'y') : [];
    const ventas = ven_s ? toMonthSeries(ven_s.data, 'x', 'y') : [];
    const ganancias = inversiones.length && ventas.length ? mergeByMonth(inversiones, ventas) : [];

    // Tabla comparativa por cosecha
    let comparativo_cosechas: FilaComparativoCosecha[] | undefined;
    if (raw.tabla?.rows && Array.isArray(raw.tabla.rows)) {
      // Esperamos columnas: ["Cosecha", "Inversión", "Ventas", "Ganancia", "ROI", "Cajas"]
      comparativo_cosechas = raw.tabla.rows.map((r: any[]) => ({
        cosecha: String(r?.[0] ?? ''),
        inversion: money(r?.[1]),
        ventas: money(r?.[2]),
        ganancia: money(r?.[3]),
        roi: pct(r?.[4]),
        cajas: num(String(r?.[5] ?? '').replace(/[^\d.-]/g, '')),
      }));
    }

    const infoHuerta: InfoHuerta | undefined = raw?.infoHuerta || raw?.metadata?.infoHuerta;

    return {
      kpis,
      series: { inversiones, ventas, ganancias },
      tablas: { comparativo_cosechas },
      metadata: {
        periodo: {
          inicio: raw?.metadata?.periodo?.inicio || '',
          fin: raw?.metadata?.periodo?.fin || '',
        },
        entidad: {
          id: num(raw?.metadata?.entidad?.id ?? raw?.temporada_id ?? 0),
          nombre: String(raw?.metadata?.entidad?.nombre ?? 'Temporada'),
          tipo: 'temporada',
        },
        generado_en: raw?.metadata?.generado_en || new Date().toISOString(),
        generado_por: raw?.metadata?.generado_por || '',
        infoHuerta,
      },
    };
  }

  // -------- Opción B: servicio “rico”
  const resumen = raw.resumen_ejecutivo || {};
  const series = raw.series || {};
  const comp = raw.comparativo_cosechas || [];

  const kpis: KPIData[] = [
    { label: 'Inversión Total', value: money(resumen.inversion_total), format: 'currency' },
    { label: 'Ventas Totales', value: money(resumen.ventas_total), format: 'currency' },
    { label: 'Gastos de Venta', value: money(resumen.gastos_venta), format: 'currency' },
    { label: 'Ganancia Neta', value: money(resumen.ganancia_neta), format: 'currency' },
    { label: 'ROI Temporada', value: pct(resumen.roi_porcentaje), format: 'percentage' },
    { label: 'Productividad', value: num(resumen.productividad), format: 'number' },
    { label: 'Cajas Totales', value: num(resumen.cajas_totales), format: 'number' },
  ];

  const inversiones = toMonthSeries(series.inversiones_mensuales || [], 'mes', 'total');
  const ventas = toMonthSeries(series.ventas_mensuales || [], 'mes', 'total');
  const ganancias =
    series.ganancias_mensuales
      ? toMonthSeries(series.ganancias_mensuales, 'mes', 'total')
      : (inversiones.length && ventas.length ? mergeByMonth(inversiones, ventas) : []);

  const comparativo_cosechas: FilaComparativoCosecha[] = (comp || []).map((x: any) => ({
    cosecha: String(x.cosecha || x.nombre || ''),
    inversion: money(x.inversion || x.inversion_total),
    ventas: money(x.ventas || x.ventas_total),
    ganancia: money(x.ganancia || x.ganancia_neta),
    roi: pct(x.roi || x.roi_porcentaje),
    cajas: num(x.cajas || x.cajas_totales),
  }));

  const info = raw.informacion_general || {};
  const infoHuerta: InfoHuerta = {
    huerta_nombre: String(info.huerta_nombre || ''),
    huerta_tipo: (info.huerta_tipo || '') as any,
    propietario: String(info.propietario || ''),
    ubicacion: String(info.ubicacion || ''),
    hectareas: num(info.hectareas),
    temporada_año: info.temporada_año,
  };

  return {
    kpis,
    series: { inversiones, ventas, ganancias },
    tablas: { comparativo_cosechas },
    metadata: {
      periodo: { inicio: raw?.metadata?.periodo?.inicio || '', fin: raw?.metadata?.periodo?.fin || '' },
      entidad: {
        id: num(raw?.metadata?.entidad?.id ?? raw?.temporada_id ?? 0),
        nombre: String(infoHuerta.huerta_nombre || 'Temporada'),
        tipo: 'temporada',
      },
      generado_en: raw?.metadata?.generado_en || new Date().toISOString(),
      generado_por: raw?.metadata?.generado_por || '',
      infoHuerta,
    },
  };
};

// --- Hook ---
export const useReporteTemporada = (id?: number) => {
  const [data, setData] = useState<ReporteProduccionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await reportesProduccionService.generarReporteTemporada({
        temporada_id: id,
        formato: 'json',
      });
      if (resp.success) {
        setData(adaptTemporadaToUI(resp.data));
      } else {
        setError(resp.message || 'Error al cargar reporte de temporada');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar reporte de temporada');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
