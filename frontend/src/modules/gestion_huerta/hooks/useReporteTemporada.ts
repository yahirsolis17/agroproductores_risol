// frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts
import { useCallback, useEffect, useState } from 'react';
import { reporteService } from '../services/reporteService';
import { ReportPayload } from '../types/reportTypes';

export const useReporteTemporada = (id?: number, from?: string, to?: string) => {
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await reporteService.getTemporada(id, from, to);
      setData(payload);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar reporte de temporada');
    } finally {
      setLoading(false);
    }
  }, [id, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
