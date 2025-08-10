/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchInversiones,
  createInversion,
  updateInversion,
  archiveInversion,
  restoreInversion,
  deleteInversion,
  setPage,
  setContext,
  setFilters,
} from '../../../global/store/inversionesSlice';
import {
  InversionHuertaCreateData,
  InversionHuertaUpdateData,
} from '../types/inversionTypes';

export function useInversiones() {
  const dispatch = useAppDispatch();
  const {
    list: inversiones,
    loading,
    error,
    page,
    meta,
    huertaId,
    huertaRentadaId,
    temporadaId,
    cosechaId,
    filters,
  } = useAppSelector((s) => s.inversiones);

  // Auto-fetch cuando cambien contexto / paginación / filtros
  useEffect(() => {
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) return;
    dispatch(fetchInversiones());
  }, [dispatch, huertaId, huertaRentadaId, temporadaId, cosechaId, page, filters]);

  // Context setters
  const setContextIds = (args: { huertaId?: number; huertaRentadaId?: number; temporadaId: number; cosechaId: number }) =>
    dispatch(setContext(args));

  // Pagination & filters
  const changePage    = (p: number)          => dispatch(setPage(p));
  const changeFilters = (f: typeof filters)   => dispatch(setFilters(f));

  // CRUD actions
  const addInversion = (data: InversionHuertaCreateData) =>
    dispatch(createInversion(data)).unwrap();

  const editInversion = (id: number, data: InversionHuertaUpdateData) =>
    dispatch(updateInversion({ id, payload: data })).unwrap();

  const removeInversion = (id: number) =>
    dispatch(deleteInversion(id)).unwrap();

  const archive = (id: number) => dispatch(archiveInversion(id)).unwrap();
  const restore = (id: number) => dispatch(restoreInversion(id)).unwrap();

  return {
    inversiones,
    loading,
    error,
    page,
    meta,
    huertaId,
    huertaRentadaId,
    temporadaId,
    cosechaId,
    filters,
    // context
    setContext: setContextIds,
    // navigation
    changePage,
    changeFilters,
    // CRUD
    addInversion,
    editInversion,
    removeInversion,
    archive,
    restore,
  };
}

export default useInversiones;
