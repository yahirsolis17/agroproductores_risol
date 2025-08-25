// frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import {
  ReporteProduccionData,
  KPIData,
  FilaComparativoCosecha,
  SeriesDataPoint,
  InfoHuerta,
} from '../types/reportesProduccionTypes';

/** -----------------------
 * Utilidades de parseo seguras
 * ------------------------ */
const num = (x: any, d = 0) => {
  const n = Number(String(x ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : d;
};
const pct = (x: any) => num(String(x ?? '').replace('%', ''));
const money = (x: any) => num(String(x ?? '').replace(/[^\d.-]/g, ''));

/** Merge A/B por mes (ganancias = ventas - inversiones) */
const mergeByMonth = (a: SeriesDataPoint[], b: SeriesDataPoint[]) => {
  const map: Record<string, { a?: number; b?: number }> = {};
  for (const it of a) map[it.fecha] = { ...(map[it.fecha] || {}), a: it.valor };
  for (const it of b) map[it.fecha] = { ...(map[it.fecha] || {}), b: it.valor };
  return Object.entries(map)
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([fecha, v]) => ({ fecha, valor: (v.b || 0) - (v.a || 0) }));
};

/** Normaliza series mensuales (x,y o mes,total/valor/y) */
const toMonthSeries = (list: any[], xKey: string, yKey: string): SeriesDataPoint[] =>
  (list || [])
    .map((r) => ({
      fecha: String(r?.[xKey] ?? ''),
      valor: Number(r?.[yKey] ?? 0),
    }))
    .filter((r) => !!r.fecha);

const toSeriesAny = (arr: any[]): SeriesDataPoint[] =>
  (arr || [])
    .map((r) => ({
      fecha: String(r?.mes ?? r?.fecha ?? r?.x ?? ''),
      valor: Number(r?.total ?? r?.valor ?? r?.y ?? 0),
    }))
    .filter((p) => !!p.fecha);

/** -----------------------
 * Ordenamiento inteligente (cosecha 1 -> 2 -> ... y fechas)
 * ------------------------ */
const _numFromLabel = (s: string) => {
  const m = String(s).match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};
const _sortComparativo = (rows: FilaComparativoCosecha[]) =>
  [...rows].sort((a, b) => {
    const na = _numFromLabel(a.cosecha);
    const nb = _numFromLabel(b.cosecha);
    if (na !== nb) return na - nb;
    return a.cosecha.localeCompare(b.cosecha);
  });

const _sortSeriesSmart = (arr: SeriesDataPoint[]) =>
  [...arr].sort((a, b) => {
    const na = _numFromLabel(a.fecha);
    const nb = _numFromLabel(b.fecha);
    if (na !== Number.MAX_SAFE_INTEGER || nb !== Number.MAX_SAFE_INTEGER) {
      if (na !== nb) return na - nb;
    }
    return String(a.fecha).localeCompare(String(b.fecha));
  });

/** -----------------------
 * Adaptador flexible:
 *   A) utils/reporting.py  -> { kpis, tabla:{columns,rows}, series:[...] }
 *   B) servicio “rico”     -> { resumen_ejecutivo, series:{}, comparativo_cosechas:[] }
 * Con fallbacks para graficar aunque el backend no mande series.
 * ------------------------ */
const adaptTemporadaToUI = (raw: any): ReporteProduccionData => {
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

  // -------- Opción A: salida directa de utils/reporting.py
  if (Array.isArray(raw.kpis) || raw.tabla) {
    const kpis: KPIData[] = (raw.kpis || []).map((k: any) => {
      const label = String(k?.label ?? k?.id ?? '');
      const value = k?.value;
      let format: KPIData['format'] | undefined;
      if (/roi/i.test(label) || /%/.test(String(value))) format = 'percentage';
      else if (/\$/.test(String(value)) || /inversi|ventas|ganan/i.test(label)) format = 'currency';
      else if (/cajas|productividad/i.test(label)) format = /productividad/i.test(label) ? undefined : 'number';
      const parsed =
        format === 'currency' ? money(value) :
        format === 'percentage' ? pct(value) :
        num(value);
      return { label, value: parsed, format };
    });

    const rawSeries = Array.isArray(raw.series) ? raw.series : [];
    const inv_s = rawSeries.find((s: any) => s?.id === 'inv_mensuales');
    const ven_s = rawSeries.find((s: any) => s?.id === 'ventas_mensuales');
    let inversiones = inv_s ? toMonthSeries(inv_s.data, 'x', 'y') : [];
    let ventas      = ven_s ? toMonthSeries(ven_s.data, 'x', 'y') : [];
    let ganancias   = inversiones.length && ventas.length ? mergeByMonth(inversiones, ventas) : [];

    let comparativo_cosechas: FilaComparativoCosecha[] | undefined;
    if (raw?.tabla?.rows && Array.isArray(raw.tabla.rows)) {
      comparativo_cosechas = raw.tabla.rows.map((r: any[]) => ({
        cosecha: String(r?.[0] ?? ''),
        inversion: money(r?.[1]),
        ventas: money(r?.[2]),
        ganancia: money(r?.[3]),
        roi: pct(r?.[4]),
        cajas: num(String(r?.[5] ?? '').replace(/[^\d.-]/g, '')),
      }));
      if (comparativo_cosechas.length) {
        comparativo_cosechas = _sortComparativo(comparativo_cosechas);
      }
    }

    if (!inversiones.length && !ventas.length && !ganancias.length && (comparativo_cosechas?.length)) {
      const mk = (k: 'inversion' | 'ventas' | 'ganancia') =>
        comparativo_cosechas!.map((r) => ({ fecha: String(r.cosecha || ''), valor: Number((r as any)[k] || 0) }));
      inversiones = mk('inversion');
      ventas      = mk('ventas');
      ganancias   = mk('ganancia');
    }

    inversiones = _sortSeriesSmart(inversiones);
    ventas      = _sortSeriesSmart(ventas);
    ganancias   = _sortSeriesSmart(ganancias);

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
  const series  = raw.series || {};
  const comp    = raw.comparativo_cosechas || [];

  const kpis: KPIData[] = [
    { label: 'Inversión Total', value: money(resumen.inversion_total), format: 'currency' },
    { label: 'Ventas Totales',  value: money(resumen.ventas_totales ?? resumen.ventas_total), format: 'currency' },
    { label: 'Gastos de Venta', value: money(resumen.total_gastos_venta ?? resumen.gastos_venta), format: 'currency' },
    { label: 'Ganancia Neta',   value: money(resumen.ganancia_neta), format: 'currency' },
    { label: 'ROI Temporada',   value: pct(resumen.roi_temporada ?? resumen.roi_porcentaje), format: 'percentage' },
    { label: 'Productividad',   value: num(resumen.productividad), format: 'number' },
    { label: 'Cajas Totales',   value: num(resumen.cajas_totales), format: 'number' },
  ];

  const invRaw = series.inversiones_mensuales ?? series.inversiones ?? [];
  const venRaw = series.ventas_mensuales     ?? series.ventas     ?? [];
  const ganRaw = series.ganancias_mensuales  ?? series.ganancias  ?? [];

  let inversiones = toSeriesAny(invRaw);
  let ventas      = toSeriesAny(venRaw);
  let ganancias   = ganRaw.length ? toSeriesAny(ganRaw)
    : (inversiones.length && ventas.length ? mergeByMonth(inversiones, ventas) : []);

  let comparativo_cosechas: FilaComparativoCosecha[] = (comp || []).map((x: any) => ({
    cosecha:  String(x.cosecha || x.nombre || ''),
    inversion: money(x.inversion || x.inversion_total),
    ventas:    money(x.ventas   || x.ventas_total),
    ganancia:  money(x.ganancia || x.ganancia_neta),
    roi:       pct(x.roi        || x.roi_porcentaje),
    cajas:     num(x.cajas      || x.cajas_totales),
  }));
  if (comparativo_cosechas.length) {
    comparativo_cosechas = _sortComparativo(comparativo_cosechas);
  }

  if (!inversiones.length && !ventas.length && !ganancias.length && comparativo_cosechas.length) {
    const mk = (k: 'inversion' | 'ventas' | 'ganancia') =>
      comparativo_cosechas.map((r) => ({ fecha: String(r.cosecha || ''), valor: Number((r as any)[k] || 0) }));
    inversiones = mk('inversion');
    ventas      = mk('ventas');
    ganancias   = mk('ganancia');
  }

  inversiones = _sortSeriesSmart(inversiones);
  ventas      = _sortSeriesSmart(ventas);
  ganancias   = _sortSeriesSmart(ganancias);

  const info = raw.informacion_general || {};
  const infoHuerta: InfoHuerta = {
    huerta_nombre: String(info.huerta_nombre || ''),
    huerta_tipo:   (info.huerta_tipo || '') as any,
    propietario:   String(info.propietario || ''),
    ubicacion:     String(info.ubicacion || ''),
    hectareas:     num(info.hectareas),
    temporada_año: info.temporada_año,
  };

  return {
    kpis,
    series: { inversiones, ventas, ganancias },
    tablas: { comparativo_cosechas },
    metadata: {
      periodo: { inicio: raw?.metadata?.periodo?.inicio || '', fin: raw?.metadata?.periodo?.fin || '' },
      entidad: {
        id: num(raw?.metadata?.entidad?.id ?? raw?.metadata?.temporada_id ?? raw?.temporada_id ?? 0),
        nombre: String(infoHuerta.huerta_nombre || 'Temporada'),
        tipo: 'temporada',
      },
      generado_en: raw?.metadata?.generado_en || new Date().toISOString(),
      generado_por: raw?.metadata?.generado_por || '',
      infoHuerta,
    },
  };
};

/** Retry con backoff ligero (2 intentos extra) */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 350): Promise<T> {
  try { return await fn(); }
  catch (e) {
    if (retries <= 0) throw e;
    await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, 2 - retries)));
    return withRetry(fn, retries - 1, baseDelay);
  }
}

/** -----------------------
 * Hook principal
 * ------------------------ */
export const useReporteTemporada = (id?: number) => {
  const [data, setData] = useState<ReporteProduccionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const myReq = ++reqIdRef.current;

    try {
      const resp = await withRetry(() =>
        reportesProduccionService.generarReporteTemporada({ temporada_id: id, formato: 'json' })
      );

      if (!mountedRef.current || myReq !== reqIdRef.current) return;

      if (resp.success) {
        const adapted = adaptTemporadaToUI(resp.data);
        setData(adapted);
        if ((!adapted.series.inversiones?.length && !adapted.series.ventas?.length && !adapted.series.ganancias?.length)) {
          // eslint-disable-next-line no-console
          console.warn('[ReporteTemporada] Sin series -> revisa backend o comparativo_cosechas');
        }
      } else {
        setError(resp.message || 'Error al cargar reporte de temporada');
      }
    } catch (e: any) {
      if (!mountedRef.current || myReq !== reqIdRef.current) return;
      setError(e?.response?.data?.message || e?.message || 'Error al cargar reporte de temporada');
    } finally {
      if (!mountedRef.current || myReq !== reqIdRef.current) return;
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
