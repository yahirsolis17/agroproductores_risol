// src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertasCombinadas,
  setPage,
  setEstado,
  setFilters,
} from '../../../global/store/huertasCombinadasSlice';
import { Estado, HCFilters } from '../services/huertasCombinadasService';

/** Hook para HUERTAS COMBINADAS – paginación y filtros en backend */
export function useHuertasCombinadas() {
  const dispatch = useAppDispatch();
  const {
    list: huertas,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
  } = useAppSelector((s) => s.huertasCombinadas);

  /* fetch inicial + dependencias */
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
    /* setters */
    setPage:    (p: number)    => dispatch(setPage(p)),
    setEstado:  (e: Estado)    => dispatch(setEstado(e)),
    setFilters: (f: HCFilters) => dispatch(setFilters(f)),
    /* refetch manual */
    refetch:    () => dispatch(fetchHuertasCombinadas({ page, estado, filters })),
  };
}

export default useHuertasCombinadas;
