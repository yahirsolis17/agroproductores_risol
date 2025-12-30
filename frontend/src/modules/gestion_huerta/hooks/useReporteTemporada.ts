// useReporteTemporada.ts
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchReporteTemporada } from '../../../global/store/reporteTemporadaSlice';
import type { ReporteProduccionData } from '../types/reportesProduccionTypes';

export const useReporteTemporada = (id?: number) => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((state) => state.reporteTemporada);

  const fetchData = useCallback(() => {
    if (!id) return;
    dispatch(fetchReporteTemporada({ temporadaId: id }));
  }, [dispatch, id]);

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
