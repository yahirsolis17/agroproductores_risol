// src/modules/gestion_huerta/hooks/useHuertas.ts
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertas,
  createHuerta,
  updateHuerta,
  deleteHuerta,
  archiveHuerta,
  restoreHuerta,
  setHPage,
  setHEstado,
  setHFilters,
  HuertaFilters,   // ← ahora incluye opcionalmente `search`
  Estado,
} from '../../../global/store/huertaSlice';
import { HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';

/** Hook para HUERTAS PROPIAS – 100 % server-side paginación y filtros */
export function useHuertas() {
  const dispatch = useAppDispatch();
  const {
    list: huertas,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
  } = useAppSelector((s) => s.huerta);

  /* fetch on mount + cuando cambien page / estado / filters */
  useEffect(() => {
    dispatch(fetchHuertas({ page, estado, filters }));
  }, [dispatch, page, estado, filters]);

  /* CRUD */
  const addHuerta    = (p: HuertaCreateData)        => dispatch(createHuerta(p)).unwrap();
  const editHuerta   = (id: number, p: HuertaUpdateData) => dispatch(updateHuerta({ id, payload: p }));
  const removeHuerta = (id: number)                 => dispatch(deleteHuerta(id));
  const archive      = (id: number)                 => dispatch(archiveHuerta(id)).unwrap();
  const restore      = (id: number)                 => dispatch(restoreHuerta(id)).unwrap();
  const refetch      = ()                           => dispatch(fetchHuertas({ page, estado, filters }));

  /* setters Redux */
  const setPage    = (n: number)      => dispatch(setHPage(n));
  const setEstado  = (e: Estado)      => dispatch(setHEstado(e));
  const setFilters = (f: HuertaFilters) => dispatch(setHFilters(f));

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

export default useHuertas;
