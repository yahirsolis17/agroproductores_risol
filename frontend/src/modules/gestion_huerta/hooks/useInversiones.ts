/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchInversiones,
  createInversion,
  updateInversion,
  deleteInversion,
  archiveInversion,
  restoreInversion,
  setIPage,
  setIEstado,
  setIFilters,
  setICosecha,
} from '../../../global/store/inversionesSlice';
import type { InversionCreate, InversionUpdate } from '../types/inversionTypes';
import type { InversionFilters, Estado } from '../services/inversionService';

export function useInversiones(cosechaId?: number) {
  const dispatch = useAppDispatch();
  const { list, loading, error, meta, page, estado, filters, cosechaId: cs } = useAppSelector((s) => s.inversiones);

  useEffect(() => { dispatch(setICosecha(cosechaId)); }, [cosechaId]);

  useEffect(() => {
    if (!cs) return;
    dispatch(fetchInversiones({ page, estado, filters, cosechaId: cs }));
  }, [dispatch, page, estado, filters, cs]);

  const addInversion    = (p: InversionCreate)                  => dispatch(createInversion(p)).unwrap();
  const editInversion   = (id: number, p: InversionUpdate)      => dispatch(updateInversion({ id, payload: p })).unwrap();
  const removeInversion = (id: number)                          => dispatch(deleteInversion(id)).unwrap();
  const archive         = (id: number)                          => dispatch(archiveInversion(id)).unwrap();
  const restore         = (id: number)                          => dispatch(restoreInversion(id)).unwrap();
  const refetch         = () => cs && dispatch(fetchInversiones({ page, estado, filters, cosechaId: cs }));

  const setPage    = (n: number)            => dispatch(setIPage(n));
  const setEstado  = (e: Estado)            => dispatch(setIEstado(e));
  const setFilters = (f: InversionFilters)  => dispatch(setIFilters(f));
  
  return {
    inversiones: list,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
    setPage,
    setEstado,
    setFilters,
    refetch,
    addInversion,
    editInversion,
    removeInversion,
    archive,
    restore,
    cosechaId: cs,
  };
}

export default useInversiones;
