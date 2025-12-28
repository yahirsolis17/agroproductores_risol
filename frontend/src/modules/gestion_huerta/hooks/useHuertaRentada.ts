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
  HRFilters,
  
} from '../../../global/store/huertaRentadaSlice';
import { HuertaRentadaCreateData, HuertaRentadaUpdateData } from '../types/huertaRentadaTypes';
import { Estado } from '../types/shared';

export function useHuertasRentadas() {
  const dispatch = useAppDispatch();
  const { items: huertas, loading, error, meta, page, estado, filters } = useAppSelector((s) => s.huertaRentada);

  useEffect(() => {
    dispatch(fetchHuertasRentadas({ page, estado, filters }));
  }, [dispatch, page, estado, filters]);

  const addHuerta    = (p: HuertaRentadaCreateData)            => dispatch(createHuertaRentada(p)).unwrap();
  const editHuerta   = (id: number, p: HuertaRentadaUpdateData) => dispatch(updateHuertaRentada({ id, payload: p }));
  const removeHuerta = (id: number)                             => dispatch(deleteHuertaRentada(id));
  const archive      = (id: number)                             => dispatch(archiveHuertaRentada(id)).unwrap();
  const restore      = (id: number)                             => dispatch(restoreHuertaRentada(id)).unwrap();
  const refetch      = ()                                       => dispatch(fetchHuertasRentadas({ page, estado, filters }));

  const setPage      = (n: number)      => dispatch(setHRPage(n));
  const setEstado    = (e: Estado)      => dispatch(setHREstado(e));
  const setFilters   = (f: HRFilters)   => dispatch(setHRFilters(f));

  return { huertas, loading, error, meta, page, estado, filters, setPage, setEstado, setFilters, refetch, addHuerta, editHuerta, removeHuerta, archive, restore };
}
export default useHuertasRentadas;
