// frontend/src/modules/gestion_huerta/hooks/useReporteHuertaPerfil.ts
import { useCallback, useEffect, useState } from 'react';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { ReporteProduccionData } from '../types/reportesProduccionTypes';

export const useReporteHuertaPerfil = (id?: number, from?: string, to?: string) => {
  const [data, setData] = useState<ReporteProduccionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await reportesProduccionService.generarReportePerfilHuerta({
        huerta_id: id,
        fecha_inicio: from,
        fecha_fin: to,
        formato: 'json'
      });
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Error al cargar perfil de huerta');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar perfil de huerta');
    } finally {
      setLoading(false);
    }
  }, [id, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
