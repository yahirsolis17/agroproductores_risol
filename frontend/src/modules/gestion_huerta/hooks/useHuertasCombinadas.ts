/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchHuertasCombinadas, setPage, setEstado, setFilters } from '../../../global/store/huertasCombinadasSlice';
import {  HCFilters } from '../services/huertasCombinadasService';
import { Estado } from '../types/shared';

export function useHuertasCombinadas() {
  const dispatch = useAppDispatch();
  const { list: huertas, loading, error, meta, page, estado, filters } = useAppSelector((s) => s.huertasCombinadas);

  useEffect(() => {
    dispatch(fetchHuertasCombinadas({ page, estado, filters }));
  }, [dispatch, page, estado, filters]);

  return {
    huertas,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
    setPage:    (p: number)    => dispatch(setPage(p)),
    setEstado:  (e: Estado)    => dispatch(setEstado(e)),
    setFilters: (f: HCFilters) => dispatch(setFilters(f)),
    refetch:    ()             => dispatch(fetchHuertasCombinadas({ page, estado, filters })),
  };
}
export default useHuertasCombinadas;
