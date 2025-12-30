// useReporteCosecha.ts
import { useCallback, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchReporteCosecha } from '../../../global/store/reporteCosechaSlice';
import type { ReporteProduccionData } from '../types/reportesProduccionTypes';

export const useReporteCosecha = (id?: number, from?: string, to?: string) => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((state) => state.reporteCosecha);

  const fetchData = useCallback(() => {
    if (!id) return;
    dispatch(fetchReporteCosecha({ cosechaId: id, from, to }));
  }, [dispatch, id, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    if (!data) return null;
    const inv = (data.tablas.inversiones || []).reduce((a: number, r: any) => a + (r.monto || 0), 0);
    const ven = (data.tablas.ventas || []).reduce((a: number, r: any) => a + (r.total || 0), 0);
    return { inversiones: inv, ventas: ven };
  }, [data]);

  return {
    data: data as ReporteProduccionData | null,
    loading,
    error,
    refetch: fetchData,
    totals,
  };
};
