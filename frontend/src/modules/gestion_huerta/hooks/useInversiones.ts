// ============================================================================
// src/modules/gestion_huerta/hooks/useInversiones.ts
// ============================================================================
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
  setContext as setCtx,
  setFilters as setFs,
} from '../../../global/store/inversionesSlice';
import { InversionHuertaCreateData, InversionHuertaUpdateData } from '../types/inversionTypes';
import { InversionFilters } from '../services/inversionService';

export function useInversiones() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.inversiones);
  const { list, loading, loaded, error, page, meta, huertaId, huertaRentadaId, temporadaId, cosechaId, filters } = state;

  useEffect(() => {
    if (temporadaId && cosechaId && (huertaId || huertaRentadaId)) {
      dispatch(fetchInversiones());
    }
  }, [dispatch, page, filters, huertaId, huertaRentadaId, temporadaId, cosechaId]);

  return {
    // state
    inversiones: list,
    loading,
    loaded,
    error,
    page,
    meta,
    huertaId,
    huertaRentadaId,
    temporadaId,
    cosechaId,
    filters,

    // context
    setContext: (args: { temporadaId: number; cosechaId: number; huertaId?: number | null; huertaRentadaId?: number | null }) =>
      dispatch(setCtx(args)),

    // navigation
    changePage: (p: number) => dispatch(setPage(p)),
    changeFilters: (f: InversionFilters) => dispatch(setFs(f)),
    refetch: () => dispatch(fetchInversiones()),

    // CRUD
    addInversion:  (data: InversionHuertaCreateData)               => dispatch(createInversion(data)).unwrap(),
    editInversion: (id: number, data: InversionHuertaUpdateData)   => dispatch(updateInversion({ id, payload: data })).unwrap(),
    removeInversion: (id: number)                                   => dispatch(deleteInversion(id)).unwrap(),
    archive: (id: number)                                           => dispatch(archiveInversion(id)).unwrap(),
    restore: (id: number)                                           => dispatch(restoreInversion(id)).unwrap(),
  };
}

export default useInversiones;
