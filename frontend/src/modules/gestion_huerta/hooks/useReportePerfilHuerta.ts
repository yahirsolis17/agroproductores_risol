import { useCallback, useEffect, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { ReporteProduccionData, KPIData, SeriesDataPoint } from '../types/reportesProduccionTypes';

const toNumber = (v: any) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.replace(/[,$\s%]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const useReportePerfilHuerta = (huertaId?: number, huertaRentadaId?: number, años: number = 5) => {
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

      const rep = resp.data || {};
      // kpis desde "kpis" o desde métricas históricas
      let kpis: KPIData[] = [];
      if (Array.isArray(rep.kpis)) {
        kpis = rep.kpis.map((k: any) => ({
          label: String(k.label ?? k.id ?? ''),
          value: toNumber(k.value ?? 0),
          format: String(k.value ?? '').includes('%') ? 'percentage' : 'number',
        }));
      }

      // series (si el backend las devuelve en perfil; si no, omitimos y el viewer maneja vacío)
      let series: { inversiones?: SeriesDataPoint[]; ventas?: SeriesDataPoint[]; ganancias?: SeriesDataPoint[] } = {};
      if (rep.series) {
        series = {
          inversiones: (rep.series.ingresos_vs_gastos || []).map((x: any) => ({ fecha: `${x.year}-01-01`, valor: toNumber(x.inversion) })),
          ventas: (rep.series.ingresos_vs_gastos || []).map((x: any) => ({ fecha: `${x.year}-01-01`, valor: toNumber(x.ventas) })),
        };
      }

      setData({
        kpis,
        series,
        tablas: {
          // si viene una tabla resumida por año, no la mostramos aquí para mantener el viewer simple
        },
        metadata: {
          periodo: { inicio: '', fin: '' },
          entidad: { id: Number(huertaId ?? huertaRentadaId), nombre: rep?.nombre || 'Huerta', tipo: 'huerta' },
          generado_en: rep?.generado_en || new Date().toISOString(),
          generado_por: rep?.generado_por || '',
          infoHuerta: {
            huerta_nombre: rep?.infoHuerta?.huerta_nombre || rep?.nombre || 'Huerta',
            huerta_tipo: huertaRentadaId ? 'Rentada' : 'Propia',
            propietario: rep?.infoHuerta?.propietario || '',
            ubicacion: rep?.infoHuerta?.ubicacion || '',
            hectareas: toNumber(rep?.infoHuerta?.hectareas || rep?.hectareas || 0),
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
