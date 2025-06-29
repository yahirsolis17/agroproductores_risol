// src/modules/gestion_huerta/hooks/useHuertaRentada.ts
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertasRentadas,
  createHuertaRentada,
  updateHuertaRentada,
  deleteHuertaRentada,
  archiveHuertaRentada,
  restoreHuertaRentada,
  setHRPage,
  setHREstado,
  setHRFilters,
  HRFilters,     // ← incluye `search`
  Estado,
} from '../../../global/store/huertaRentadaSlice';
import {
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../types/huertaRentadaTypes';

/** Hook para HUERTAS RENTADAS – mismo patrón que useHuertas */
export function useHuertasRentadas() {
  const dispatch = useAppDispatch();
  const {
    list: huertas,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
  } = useAppSelector((s) => s.huertaRentada);

  /* fetch inicial + dependencias */
  useEffect(() => {
    dispatch(fetchHuertasRentadas({ page, estado, filters }));
  }, [dispatch, page, estado, filters]);

  /* CRUD */
  const addHuerta    = (p: HuertaRentadaCreateData)           => dispatch(createHuertaRentada(p)).unwrap();
  const editHuerta   = (id: number, p: HuertaRentadaUpdateData) => dispatch(updateHuertaRentada({ id, payload: p }));
  const removeHuerta = (id: number)                           => dispatch(deleteHuertaRentada(id));
  const archive      = (id: number)                           => dispatch(archiveHuertaRentada(id)).unwrap();
  const restore      = (id: number)                           => dispatch(restoreHuertaRentada(id)).unwrap();
  const refetch      = ()                                     => dispatch(fetchHuertasRentadas({ page, estado, filters }));

  /* setters Redux */
  const setPage    = (n: number)     => dispatch(setHRPage(n));
  const setEstado  = (e: Estado)     => dispatch(setHREstado(e));
  const setFilters = (f: HRFilters)  => dispatch(setHRFilters(f));

  return {
    huertas,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
    /* navegación */
    setPage,
    setEstado,
    setFilters,
    refetch,
    /* CRUD */
    addHuerta,
    editHuerta,
    removeHuerta,
    archive,
    restore,
  };
}

export default useHuertasRentadas;
