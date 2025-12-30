// useReportePerfilHuerta.ts
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchReportePerfilHuerta } from '../../../global/store/reportePerfilHuertaSlice';
import type { ReporteProduccionData } from '../types/reportesProduccionTypes';

export const useReportePerfilHuerta = (
  huertaId?: number,
  huertaRentadaId?: number,
  años: number = 5
) => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((state) => state.reportePerfilHuerta);

  const fetchData = useCallback(() => {
    if (!huertaId && !huertaRentadaId) return;
    dispatch(fetchReportePerfilHuerta({ huertaId, huertaRentadaId, años }));
  }, [dispatch, huertaId, huertaRentadaId, años]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: data as ReporteProduccionData | null,
    loading,
    error,
    refetch: fetchData,
  };
};
