// frontend/modules/gestion_huerta/hooks/useReporte.ts
import { useState } from 'react';
import { reporteService } from '../services/reporteService';
import { ReporteContrato } from '../types/reportTypes';

export function useReporte() {
  const [data, setData] = useState<ReporteContrato | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCosecha = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reporteService.getCosecha(id);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemporada = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reporteService.getTemporada(id);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHuerta = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reporteService.getHuertaPerfil(id);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchCosecha, fetchTemporada, fetchHuerta };
}

export default useReporte;

