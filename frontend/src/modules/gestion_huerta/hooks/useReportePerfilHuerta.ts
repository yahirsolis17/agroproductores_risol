// useReportePerfilHuerta.ts
// frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts
import { useCallback, useEffect, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import {
  ReporteProduccionData,
  KPIData,
  SeriesDataPoint,
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
      const resp = await reportesProduccionService.generarReportePerfilHuerta({
        formato: 'json',
        huerta_id: huertaId,
        huerta_rentada_id: huertaRentadaId,
        años,
      });

      if (!resp.success) {
        setError(resp.message || 'Error al cargar perfil de huerta');
        setLoading(false);
        return;
      }

      const rep = (resp.data || {}) as AnyRecord;
      const repSeries = (rep.series ?? {}) as AnyRecord;
      const infoHuertaRaw = (rep.infoHuerta ?? undefined) as AnyRecord | undefined;

      // KPIs: detecta formato (currency/percentage) por label o valor
      let kpis: KPIData[] = [];
      if (Array.isArray(rep.kpis)) {
        kpis = (rep.kpis as AnyRecord[]).map((k): KPIData => {
          const rawVal = (k as AnyRecord).value;
          const numeric = toNumber(rawVal);
          const valueStr = String(rawVal ?? '');
          const labelStr = String((k as AnyRecord).label ?? (k as AnyRecord).id ?? '');
          const isPct = valueStr.includes('%') || /roi|porcentaje/i.test(labelStr);
          const isCurrency = /\$|inversi|venta|gananc|gasto/i.test(labelStr);
          return {
            label: labelStr,
            value: numeric,
            format: isPct ? 'percentage' : isCurrency ? 'currency' : 'number',
          };
        });
      }

      // Series (opcional según backend) + cálculo de GANANCIAS
      let series: {
        inversiones?: SeriesDataPoint[];
        ventas?: SeriesDataPoint[];
        ganancias?: SeriesDataPoint[];
      } = {};

      const ivg = repSeries['ingresos_vs_gastos'] as AnyRecord[] | undefined;
      if (Array.isArray(ivg)) {
        const yearOr = (row: AnyRecord) => `${getNum(row, 'year', new Date().getFullYear())}-01-01`;
        const inv = ivg.map((row): SeriesDataPoint => ({
          fecha: yearOr(row),
          valor: toNumber(row['inversion']),
        }));
        const ven = ivg.map((row): SeriesDataPoint => ({
          fecha: yearOr(row),
          valor: toNumber(row['ventas']),
        }));
        // ganancias = ventas - inversiones por año
        const map = new Map<string, { inv?: number; ven?: number }>();
        inv.forEach((p) => map.set(p.fecha, { ...(map.get(p.fecha) || {}), inv: p.valor }));
        ven.forEach((p) => map.set(p.fecha, { ...(map.get(p.fecha) || {}), ven: p.valor }));
        const gan: SeriesDataPoint[] = Array.from(map.entries()).map(([fecha, v]) => ({
          fecha,
          valor: (v.ven || 0) - (v.inv || 0),
        }));

        series = { inversiones: inv, ventas: ven, ganancias: gan };
      }

      setData({
        kpis,
        series,
        tablas: {},
        metadata: {
          periodo: { inicio: '', fin: '' },
          entidad: {
            id: Number(huertaId ?? huertaRentadaId),
            nombre: getStr(rep, 'nombre', 'Huerta'),
            tipo: 'huerta',
          },
          generado_en: getStr(rep, 'generado_en', new Date().toISOString()),
          generado_por: getStr(rep, 'generado_por', ''),
          infoHuerta: {
            huerta_nombre:
              getStr(infoHuertaRaw, 'huerta_nombre') ||
              getStr(rep, 'nombre', 'Huerta'),
            huerta_tipo: huertaRentadaId ? 'Rentada' : 'Propia',
            propietario: getStr(infoHuertaRaw, 'propietario', ''),
            ubicacion: getStr(infoHuertaRaw, 'ubicacion', ''),
            hectareas: getNum(infoHuertaRaw, 'hectareas', getNum(rep, 'hectareas', 0)),
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
