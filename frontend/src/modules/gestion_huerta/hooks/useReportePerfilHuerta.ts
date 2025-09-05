// useReportePerfilHuerta.ts
// frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts
import { useCallback, useEffect, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import {
  ReporteProduccionData,
  KPIData,
  SeriesDataPoint,
  FilaResumenHistorico,
} from '../types/reportesProduccionTypes';

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
  try { return String(v); } catch { return fallback; }
};

const getNum = (obj: AnyRecord | undefined, key: string, fallback = 0): number => {
  const v = obj?.[key];
  const n = toNumber(v);
  return Number.isFinite(n) ? n : fallback;
};

const sortISO = (arr?: SeriesDataPoint[]) =>
  (arr || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 350): Promise<T> {
  try { return await fn(); }
  catch (e) {
    if (retries <= 0) throw e;
    await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, 2 - retries)));
    return withRetry(fn, retries - 1, baseDelay);
  }
}

export const useReportePerfilHuerta = (
  huertaId?: number,
  huertaRentadaId?: number,
  años: number = 5
) => {
  const [data, setData] = useState<ReporteProduccionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!huertaId && !huertaRentadaId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await withRetry(() =>
        reportesProduccionService.generarReportePerfilHuerta({
          formato: 'json',
          huerta_id: huertaId,
          huerta_rentada_id: huertaRentadaId,
          años,
        })
      );

      if (!resp.success) {
        setError(resp.message || 'Error al cargar perfil de huerta');
        setLoading(false);
        return;
      }

      const rep = (resp.data || {}) as AnyRecord;
      const ui = (rep.ui ?? {}) as AnyRecord;

      // KPIs: preferir ui.kpis; fallback a rep.kpis (contrato legacy)
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

      // Series: ui.series o derivar de resumen_historico; fallback legacy ingresos_vs_gastos
      const uiSeries = (ui.series ?? {}) as AnyRecord;
      let inversiones: SeriesDataPoint[] | undefined = Array.isArray((uiSeries as AnyRecord)['inversiones'])
        ? ((uiSeries as AnyRecord)['inversiones'] as AnyRecord[]).map((p) => ({ fecha: String(p?.fecha ?? ''), valor: toNumber(p?.valor) }))
        : undefined;
      let ventas: SeriesDataPoint[] | undefined = Array.isArray((uiSeries as AnyRecord)['ventas'])
        ? ((uiSeries as AnyRecord)['ventas'] as AnyRecord[]).map((p) => ({ fecha: String(p?.fecha ?? ''), valor: toNumber(p?.valor) }))
        : undefined;
      let ganancias: SeriesDataPoint[] | undefined = Array.isArray((uiSeries as AnyRecord)['ganancias'])
        ? ((uiSeries as AnyRecord)['ganancias'] as AnyRecord[]).map((p) => ({ fecha: String(p?.fecha ?? ''), valor: toNumber(p?.valor) }))
        : undefined;

      const hist = Array.isArray(rep.resumen_historico) ? (rep.resumen_historico as AnyRecord[]) : [];
      const getYear = (row: AnyRecord): number => {
        const y = (row as AnyRecord)['año'] ?? (row as AnyRecord)['anio'] ?? (row as AnyRecord)['a��o'];
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
        const ivg = ((rep.series as AnyRecord)['ingresos_vs_gastos'] as AnyRecord[]);
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

      // Ordenar series por ISO (siempre estable)
      inversiones = sortISO(inversiones);
      ventas      = sortISO(ventas);
      ganancias   = sortISO(ganancias);

      const infoGeneral = (rep.informacion_general ?? {}) as AnyRecord;
      const meta = (rep.metadata ?? {}) as AnyRecord;

      // Tabla: Resumen histórico por año (Perfil de Huerta)
      const resumenHistoricoTable: FilaResumenHistorico[] | undefined = hist.length
        ? hist
            .slice()
            .sort((a, b) => {
              const A = getYear(a as AnyRecord);
              const B = getYear(b as AnyRecord);
              return A - B; // ascendente
            })
            .map((row) => ({
              anio: getYear(row as AnyRecord),
              inversion: toNumber((row as AnyRecord)['inversion']),
              ventas: toNumber((row as AnyRecord)['ventas']),
              ganancia: toNumber((row as AnyRecord)['ganancia']),
              roi: toNumber((row as AnyRecord)['roi']),
              productividad: toNumber((row as AnyRecord)['productividad']),
              cosechas_count: Number((row as AnyRecord)['cosechas_count'] ?? 0),
            }))
        : undefined;

      setData({
        kpis,
        series: { inversiones, ventas, ganancias },
        tablas: { resumen_historico: resumenHistoricoTable },
        metadata: {
          periodo: { inicio: '', fin: '' },
          entidad: { id: Number(huertaId ?? huertaRentadaId), nombre: getStr(infoGeneral, 'huerta_nombre', 'Huerta'), tipo: 'huerta' },
          generado_en: getStr(meta as AnyRecord, 'fecha_generacion', new Date().toISOString()),
          generado_por: getStr(meta as AnyRecord, 'generado_por', ''),
          infoHuerta: {
            huerta_nombre: getStr(infoGeneral, 'huerta_nombre', 'Huerta'),
            huerta_tipo: huertaRentadaId ? 'Rentada' : 'Propia',
            propietario: getStr(infoGeneral, 'propietario', ''),
            ubicacion: getStr(infoGeneral, 'ubicacion', ''),
            hectareas: getNum(infoGeneral, 'hectareas', 0),
          },
        },
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar perfil de huerta');
    } finally {
      setLoading(false);
    }
  }, [huertaId, huertaRentadaId, años]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
