// frontend/src/modules/gestion_huerta/utils/reportesAdapters.ts
import type {
  ReporteProduccionData,
  KPIData,
  SeriesDataPoint,
  InfoHuerta,
  FilaComparativoCosecha,
  FilaResumenHistorico,
} from '../types/reportesProduccionTypes';

const num = (x: any, d = 0) => {
  const n = Number(String(x ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : d;
};
const pct = (x: any) => num(String(x ?? '').replace('%', ''));
const money = (x: any) => num(String(x ?? '').replace(/[^\d.-]/g, ''));

const toSeriesAny = (arr: any[]): SeriesDataPoint[] =>
  (arr || [])
    .map((r) => ({
      fecha: String(r?.mes ?? r?.fecha ?? r?.x ?? ''),
      valor: Number(r?.total ?? r?.valor ?? r?.y ?? 0),
    }))
    .filter((p) => !!p.fecha);

const toMonthSeries = (list: any[], xKey: string, yKey: string): SeriesDataPoint[] =>
  (list || [])
    .map((r) => ({
      fecha: String(r?.[xKey] ?? ''),
      valor: Number(r?.[yKey] ?? 0),
    }))
    .filter((r) => !!r.fecha);

const mergeByMonth = (a: SeriesDataPoint[], b: SeriesDataPoint[]) => {
  const map: Record<string, { a?: number; b?: number }> = {};
  for (const it of a) map[it.fecha] = { ...(map[it.fecha] || {}), a: it.valor };
  for (const it of b) map[it.fecha] = { ...(map[it.fecha] || {}), b: it.valor };
  return Object.entries(map)
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([fecha, v]) => ({ fecha, valor: (v.b || 0) - (v.a || 0) }));
};

const sortISOIfPossible = (arr: SeriesDataPoint[]) => {
  const iso = /^\d{4}-\d{2}(-\d{2})?$/;
  const allISO = arr.every((a) => iso.test(String(a.fecha || '')));
  if (allISO) {
    return [...arr].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  }
  const numFromLabel = (s: string) => {
    const m = String(s).match(/(\d+)(?!.*\d)/);
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
  };
  return [...arr].sort((a, b) => {
    const na = numFromLabel(a.fecha);
    const nb = numFromLabel(b.fecha);
    if (na !== Number.MAX_SAFE_INTEGER || nb !== Number.MAX_SAFE_INTEGER) {
      if (na !== nb) return na - nb;
    }
    return String(a.fecha).localeCompare(String(b.fecha));
  });
};

const sortComparativo = (rows: FilaComparativoCosecha[]) =>
  [...rows].sort((a, b) => {
    const numFromLabelEnd = (s: string) => {
      const m = String(s).match(/(\d+)(?!.*\d)/);
      return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
    };
    const na = numFromLabelEnd(a.cosecha);
    const nb = numFromLabelEnd(b.cosecha);
    if (na !== nb) return nb - na;
    return b.cosecha.localeCompare(a.cosecha);
  });

const sumByDate = (items: any[], dateKey: string, valueKey: string) => {
  const acc: Record<string, number> = {};
  for (const it of items || []) {
    const raw = it?.[dateKey];
    if (!raw) continue;
    const d = String(raw).slice(0, 10);
    const val = Number(it?.[valueKey] ?? 0);
    acc[d] = (acc[d] ?? 0) + (Number.isFinite(val) ? val : 0);
  }
  return Object.entries(acc)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([fecha, valor]) => ({ fecha, valor }));
};

const sortISO = (arr: SeriesDataPoint[]) =>
  [...arr].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

export const withRetry = async <T,>(fn: () => Promise<T>, retries = 2, baseDelay = 350): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, 2 - retries)));
    return withRetry(fn, retries - 1, baseDelay);
  }
};

export const adaptTemporadaToUI = (raw: any): ReporteProduccionData => {
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
    let ventas = ven_s ? toMonthSeries(ven_s.data, 'x', 'y') : [];
    let ganancias = inversiones.length && ventas.length ? mergeByMonth(inversiones, ventas) : [];

    let comparativo_cosechas: FilaComparativoCosecha[] = [];
    if (raw?.tabla?.rows && Array.isArray(raw.tabla.rows)) {
      comparativo_cosechas = raw.tabla.rows.map((r: any[]) => {
        const cosecha = String(r?.[0] ?? '');
        const inversion = money(r?.[1]);
        const ventas = money(r?.[2]);
        const ganancia = money(r?.[3]);
        const roi = pct(r?.[4]);
        const cajas = num(String(r?.[5] ?? '').replace(/[^\d.-]/g, ''));
        const gastos_venta = Math.max(0, ventas - inversion - ganancia);
        return { cosecha, inversion, ventas, gastos_venta, ganancia, roi, cajas };
      });
      if (comparativo_cosechas.length) {
        comparativo_cosechas = sortComparativo(comparativo_cosechas);
      }
    }

    if (!inversiones.length && !ventas.length && !ganancias.length && comparativo_cosechas.length) {
      const mk = (k: 'inversion' | 'ventas' | 'ganancia') =>
        comparativo_cosechas.map((r) => ({ fecha: String(r.cosecha || ''), valor: Number((r as any)[k] || 0) }));
      inversiones = mk('inversion');
      ventas = mk('ventas');
      ganancias = mk('ganancia');
    }

    inversiones = sortISOIfPossible(inversiones);
    ventas = sortISOIfPossible(ventas);
    ganancias = sortISOIfPossible(ganancias);

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

  const resumen = raw.resumen_ejecutivo || {};
  const series = raw.series || {};
  let comparativo_cosechas: FilaComparativoCosecha[] = (raw.comparativo_cosechas || []).map((x: any) => {
    const inversion = money(x.inversion || x.inversion_total);
    const ventas = money(x.ventas || x.ventas_total);
    const ganancia = money(x.ganancia || x.ganancia_neta);
    const gastos = money(x.gastos_venta ?? x.gasto_venta ?? x.gastos);
    const gastos_venta = gastos || Math.max(0, ventas - inversion - ganancia);
    return {
      cosecha: String(x.cosecha || x.nombre || ''),
      inversion,
      ventas,
      gastos_venta,
      ganancia,
      roi: pct(x.roi || x.roi_porcentaje),
      cajas: num(x.cajas || x.cajas_totales),
    };
  });
  if (comparativo_cosechas.length) {
    comparativo_cosechas = sortComparativo(comparativo_cosechas);
  }

  const inversiones = toSeriesAny(series.inversiones || []);
  const ventas = toSeriesAny(series.ventas || []);
  const ganancias = toSeriesAny(series.ganancias || []);

  return {
    kpis: (resumen.kpis || []).map((k: any) => ({
      label: String(k?.label ?? k?.id ?? ''),
      value: num(k?.value ?? 0),
      format: k?.format,
    })),
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
    },
  };
};

export const adaptCosechaToUI = (reporte: any, filtroFrom?: string, filtroTo?: string): ReporteProduccionData => {
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

  let kpis: KPIData[] = Array.isArray(ui.kpis) ? ui.kpis : [];
  let series: { inversiones?: SeriesDataPoint[]; ventas?: SeriesDataPoint[]; ganancias?: SeriesDataPoint[] } =
    typeof ui.series === 'object'
      ? {
          inversiones: toSeriesAny(ui.series?.inversiones || []),
          ventas: toSeriesAny(ui.series?.ventas || []),
          ganancias: toSeriesAny(ui.series?.ganancias || []),
        }
      : {};

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
      ventas: sortISO(ven),
      ganancias: sortISO(gan),
    };
  }

  const tablasBase = {
    inversiones:
      Array.isArray(ui?.tablas?.inversiones) && ui.tablas.inversiones.length
        ? ui.tablas.inversiones
        : detalleInv.map((x: any) => ({
            id: Number(x.id ?? 0),
            categoria: x.categoria || 'Sin categoría',
            descripcion: x.descripcion || '',
            monto: Number(x.total || 0),
            fecha: x.fecha || '',
          })),
    ventas:
      Array.isArray(ui?.tablas?.ventas) && ui.tablas.ventas.length
        ? ui.tablas.ventas
        : detalleVen.map((x: any) => ({
            id: Number(x.id ?? 0),
            fecha: x.fecha || '',
            cantidad: Number(x.num_cajas || 0),
            precio_unitario: Number(x.precio_por_caja || 0),
            total: Number(x.total_venta || 0),
            gasto: Number(x.gasto || 0),
            comprador: '',
          })),
  };

  const analisisCategoriasUi = Array.isArray(ui?.tablas?.analisis_categorias) ? ui.tablas.analisis_categorias : null;
  const analisisVariedadesUi = Array.isArray(ui?.tablas?.analisis_variedades) ? ui.tablas.analisis_variedades : null;

  const analisisCategoriasRaw = Array.isArray(reporte?.analisis_categorias) ? reporte.analisis_categorias : [];
  const analisisVariedadesRaw = Array.isArray(reporte?.analisis_variedades) ? reporte.analisis_variedades : [];

  const tablas = {
    ...tablasBase,
    analisis_categorias: analisisCategoriasUi
      ? analisisCategoriasUi
      : analisisCategoriasRaw.map((x: any) => ({
          categoria: String(x.categoria ?? 'Sin categoría'),
          monto: Number(x.total ?? x.monto ?? 0),
          porcentaje: Number(x.porcentaje ?? 0),
        })),
    analisis_variedades: analisisVariedadesUi
      ? analisisVariedadesUi
      : analisisVariedadesRaw.map((x: any) => ({
          variedad: String(x.variedad ?? 'Sin variedad'),
          cajas: Number(x.total_cajas ?? x.cajas ?? 0),
          precio_prom: Number(x.precio_promedio ?? x.precio_prom ?? 0),
          total: Number(x.total_venta ?? x.total ?? 0),
          porcentaje: Number(x.porcentaje ?? 0),
        })),
  };

  const periodoInicio =
    (meta?.periodo && (meta.periodo.inicio || meta.periodo.start)) || info.fecha_inicio || filtroFrom || '';
  const periodoFin = (meta?.periodo && (meta.periodo.fin || meta.periodo.end)) || info.fecha_fin || filtroTo || '';

  const infoHuertaSource: any = meta?.infoHuerta || info;
  const infoHuerta: InfoHuerta = {
    huerta_nombre: String(infoHuertaSource.huerta_nombre || ''),
    huerta_tipo: (infoHuertaSource.huerta_tipo || '') as any,
    propietario: String(infoHuertaSource.propietario || ''),
    ubicacion: String(infoHuertaSource.ubicacion || ''),
    hectareas: Number(infoHuertaSource.hectareas || 0),
    temporada_año: infoHuertaSource.temporada_año,
    cosecha_nombre: String(infoHuertaSource.cosecha_nombre || ''),
    estado: String(infoHuertaSource.estado || ''),
    fecha_inicio: infoHuertaSource.fecha_inicio || '',
    fecha_fin: infoHuertaSource.fecha_fin || '',
  };

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
      generado_en: meta.generado_en || meta.fecha_generacion || new Date().toISOString(),
      generado_por: meta.generado_por || '',
      infoHuerta,
    },
  };
};

const normalizePerfilHuertaResponse = (rep: any) => {
  if (!rep || typeof rep !== 'object') return rep;

  const histPaths = [
    ['resumen_historico'],
    ['ui', 'tablas', 'resumen_historico'],
  ];

  const normalizeArray = (arr: any[]) => {
    if (!Array.isArray(arr)) return arr;
    return arr.map((row: any) => {
      const año =
        row?.año ??
        row?.año ??
        row?.['a\u00F1o'] ??
        row?.['año'] ??
        row?.['aï¿½ï¿½o'] ??
        row?.['añó'] ??
        row?.['ano'];
      return {
        ...row,
        año,
      };
    });
  };

  for (const p of histPaths) {
    let node: any = rep;
    for (const key of p) {
      node = node?.[key];
      if (node === undefined) break;
    }
    if (node !== undefined) {
      const fixed = normalizeArray(node);
      if (p.length === 1) {
        rep[p[0]] = fixed;
      } else if (p.length === 3) {
        rep.ui = rep.ui || {};
        rep.ui.tablas = rep.ui.tablas || {};
        rep.ui.tablas.resumen_historico = fixed;
      }
    }
  }

  return rep;
};

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.replace(/[,$\s%]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

type AnyRecord = Record<string, unknown>;

const getStr = (obj: AnyRecord | undefined, key: string, fallback = ''): string => {
  const v = obj?.[key];
  if (typeof v === 'string') return v;
  if (v == null) return fallback;
  try {
    return String(v);
  } catch {
    return fallback;
  }
};

const getNum = (obj: AnyRecord | undefined, key: string, fallback = 0): number => {
  const v = obj?.[key];
  const n = toNumber(v);
  return Number.isFinite(n) ? n : fallback;
};

export const adaptPerfilHuertaToUI = (
  raw: any,
  huertaId?: number,
  huertaRentadaId?: number
): ReporteProduccionData => {
  const rep = normalizePerfilHuertaResponse(raw || {});
  const ui = (rep.ui ?? {}) as AnyRecord;

  let kpis: KPIData[] = [];
  const sourceKpis: AnyRecord[] | undefined = Array.isArray(ui.kpis)
    ? (ui.kpis as AnyRecord[])
    : (Array.isArray((rep as AnyRecord).kpis) ? ((rep as AnyRecord).kpis as AnyRecord[]) : undefined);
  if (sourceKpis) {
    kpis = sourceKpis.map((k): KPIData => {
      const rawVal = (k as AnyRecord).value;
      const numeric = toNumber(rawVal);
      const valueStr = String(rawVal ?? '');
      const labelStr = String((k as AnyRecord).label ?? (k as AnyRecord).id ?? '');
      const isPct = valueStr.includes('%') || /roi|porcentaje/i.test(labelStr);
      const isCurrency = /\$|inversi|venta|gananc|gasto/i.test(labelStr);
      return { label: labelStr, value: numeric, format: isPct ? 'percentage' : isCurrency ? 'currency' : 'number' };
    });
  }

  const uiSeries = (ui.series ?? {}) as AnyRecord;
  let inversiones: SeriesDataPoint[] | undefined = Array.isArray((uiSeries as AnyRecord)['inversiones'])
    ? ((uiSeries as AnyRecord)['inversiones'] as AnyRecord[]).map((p) => ({
        fecha: String(p?.fecha ?? ''),
        valor: toNumber(p?.valor),
      }))
    : undefined;
  let ventas: SeriesDataPoint[] | undefined = Array.isArray((uiSeries as AnyRecord)['ventas'])
    ? ((uiSeries as AnyRecord)['ventas'] as AnyRecord[]).map((p) => ({
        fecha: String(p?.fecha ?? ''),
        valor: toNumber(p?.valor),
      }))
    : undefined;
  let ganancias: SeriesDataPoint[] | undefined = Array.isArray((uiSeries as AnyRecord)['ganancias'])
    ? ((uiSeries as AnyRecord)['ganancias'] as AnyRecord[]).map((p) => ({
        fecha: String(p?.fecha ?? ''),
        valor: toNumber(p?.valor),
      }))
    : undefined;

  const hist = Array.isArray(rep.resumen_historico) ? (rep.resumen_historico as AnyRecord[]) : [];
  const getYear = (row: AnyRecord): number => {
    const y = (row as AnyRecord)['año'] ?? (row as AnyRecord)['año'];
    const n = Number(y);
    return Number.isFinite(n) ? n : new Date().getFullYear();
  };
  if ((!inversiones || !inversiones.length) && hist.length) {
    inversiones = hist.map((row) => ({
      fecha: `${getYear(row as AnyRecord)}-01-01`,
      valor: toNumber((row as AnyRecord)['inversion']),
    }));
  }
  if ((!ventas || !ventas.length) && hist.length) {
    ventas = hist.map((row) => ({
      fecha: `${getYear(row as AnyRecord)}-01-01`,
      valor: toNumber((row as AnyRecord)['ventas']),
    }));
  }
  if ((!ganancias || !ganancias.length) && hist.length) {
    ganancias = hist.map((row) => ({
      fecha: `${getYear(row as AnyRecord)}-01-01`,
      valor: toNumber((row as AnyRecord)['ganancia']),
    }));
  }

  if ((!inversiones || !ventas) && rep.series && Array.isArray((rep.series as AnyRecord)['ingresos_vs_gastos'])) {
    const ivg = (rep.series as AnyRecord)['ingresos_vs_gastos'] as AnyRecord[];
    const yearOr = (row: AnyRecord) => `${getNum(row, 'year', new Date().getFullYear())}-01-01`;
    const inv = ivg.map((row): SeriesDataPoint => ({ fecha: yearOr(row), valor: toNumber(row['inversion']) }));
    const ven = ivg.map((row): SeriesDataPoint => ({ fecha: yearOr(row), valor: toNumber(row['ventas']) }));
    inversiones = inversiones && inversiones.length ? inversiones : inv;
    ventas = ventas && ventas.length ? ventas : ven;
    const map = new Map<string, { inv?: number; ven?: number }>();
    (inversiones || []).forEach((p) => map.set(p.fecha, { ...(map.get(p.fecha) || {}), inv: p.valor }));
    (ventas || []).forEach((p) => map.set(p.fecha, { ...(map.get(p.fecha) || {}), ven: p.valor }));
    ganancias = Array.from(map.entries()).map(([fecha, v]) => ({ fecha, valor: (v.ven || 0) - (v.inv || 0) }));
  }

  inversiones = sortISO(inversiones || []);
  ventas = sortISO(ventas || []);
  ganancias = sortISO(ganancias || []);

  const infoGeneral = (rep.informacion_general ?? {}) as AnyRecord;
  const meta = (rep.metadata ?? {}) as AnyRecord;

  const resumenHistoricoTable: FilaResumenHistorico[] | undefined = hist.length
    ? hist
        .slice()
        .sort((a, b) => {
          const A = getYear(a as AnyRecord);
          const B = getYear(b as AnyRecord);
          return A - B;
        })
        .map((row) => ({
          año: getYear(row as AnyRecord),
          inversion: toNumber((row as AnyRecord)['inversion']),
          ventas: toNumber((row as AnyRecord)['ventas']),
          ganancia: toNumber((row as AnyRecord)['ganancia']),
          roi: toNumber((row as AnyRecord)['roi']),
          productividad: toNumber((row as AnyRecord)['productividad']),
          cosechas_count: Number((row as AnyRecord)['cosechas_count'] ?? 0),
        }))
    : undefined;

  return {
    kpis,
    series: { inversiones, ventas, ganancias },
    tablas: { resumen_historico: resumenHistoricoTable },
    metadata: {
      periodo: { inicio: '', fin: '' },
      entidad: {
        id: Number(huertaId ?? huertaRentadaId),
        nombre: getStr(infoGeneral, 'huerta_nombre', 'Huerta'),
        tipo: 'huerta',
      },
      generado_en: getStr(meta, 'fecha_generacion', new Date().toISOString()),
      generado_por: getStr(meta, 'generado_por', ''),
      infoHuerta: {
        huerta_nombre: getStr(infoGeneral, 'huerta_nombre', 'Huerta'),
        huerta_tipo: huertaRentadaId ? 'Rentada' : 'Propia',
        propietario: getStr(infoGeneral, 'propietario', ''),
        ubicacion: getStr(infoGeneral, 'ubicacion', ''),
        hectareas: getNum(infoGeneral, 'hectareas', 0),
      },
    },
  };
};
