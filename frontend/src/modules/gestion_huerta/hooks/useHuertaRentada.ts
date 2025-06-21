/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertasRentadas,
  createHuertaRentada,
  updateHuertaRentada,
  deleteHuertaRentada,
  setHRPage,
  setHREstado,
  setHRFilters,
  HRFilters,
  Estado,
  archiveHuertaRentada,
  restoreHuertaRentada,
} from '../../../global/store/huertaRentadaSlice';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../types/huertaRentadaTypes';

/** Hook para HUERTAS RENTADAS */
export function useHuertasRentadas() {
  const dispatch = useAppDispatch();
  const {
    list,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
  } = useAppSelector((s) => s.huertaRentada);

  useEffect(() => {
    dispatch(fetchHuertasRentadas({ page, estado, filters }));
  }, [dispatch, page, estado, filters]);

  /* ——— helpers redux ——— */
  const changePage    = (n: number)        => dispatch(setHRPage(n));
  const changeEstado  = (e: Estado)        => dispatch(setHREstado(e));
  const changeFilters = (f: HRFilters)     => dispatch(setHRFilters(f));
  const refetch       = ()                 => dispatch(fetchHuertasRentadas({ page, estado, filters }));

  /* ——— CRUD ——— */
  const addHuerta = (p: HuertaRentadaCreateData): Promise<HuertaRentada> =>
    dispatch(createHuertaRentada(p)).unwrap();

  const editHuerta = (id: number, p: HuertaRentadaUpdateData) =>
    dispatch(updateHuertaRentada({ id, payload: p }));

  const removeHuerta = (id: number) => dispatch(deleteHuertaRentada(id));

  const archive = (id: number) => dispatch(archiveHuertaRentada(id)).unwrap();
  const restore = (id: number) => dispatch(restoreHuertaRentada(id)).unwrap();

  return {
    huertas: list,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
    setPage:        changePage,
    changeEstado,
    changeFilters,
    refetch,
    addHuerta,
    editHuerta,
    removeHuerta,
    archive,
    restore,
  };
}
