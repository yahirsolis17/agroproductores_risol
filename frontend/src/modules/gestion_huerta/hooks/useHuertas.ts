/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertas,
  createHuerta,
  updateHuerta,
  deleteHuerta,
  setHPage,
  setHEstado,
  setHFilters,
  HuertaFilters,
  Estado,            // <- exportado por el slice
  archiveHuerta,
  restoreHuerta,
} from '../../../global/store/huertaSlice';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../types/huertaTypes';

/** Hook para HUERTAS PROPIAS – todo el paginado / filtrado viene del backend */
export function useHuertas() {
  const dispatch  = useAppDispatch();
  const location  = useLocation();

  const {
    list: globalHuertas,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
  } = useAppSelector((s) => s.huerta);

  /* ——— fetch automático al cambiar page / estado / filters ——— */
  useEffect(() => {
    dispatch(fetchHuertas({ page, estado, filters }));
  }, [dispatch, page, estado, filters]);

  useEffect(() => {
    if (location.pathname.includes('/huertas')) {
      dispatch(fetchHuertas({ page, estado, filters }));
    }
  }, [location.pathname]);

  /* ——— CRUD helpers ——— */
  const addHuerta = (p: HuertaCreateData): Promise<Huerta> =>
    dispatch(createHuerta(p)).unwrap();

  const editHuerta = (id: number, p: HuertaUpdateData) =>
    dispatch(updateHuerta({ id, payload: p }));

  const removeHuerta = (id: number) => dispatch(deleteHuerta(id));

  const refetch = () => dispatch(fetchHuertas({ page, estado, filters }));

  const archive = (id: number) => dispatch(archiveHuerta(id)).unwrap();
  const restore = (id: number) => dispatch(restoreHuerta(id)).unwrap();

  /* ——— setters redux ——— */
  const changePage    = (n: number)                          => dispatch(setHPage(n));
  const changeEstado  = (e: Estado)                          => dispatch(setHEstado(e));
  const changeFilters = (f: HuertaFilters)                   => dispatch(setHFilters(f));

  /* ——— API pública del hook ——— */
  return {
    huertas: globalHuertas,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
    setPage: changePage,
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
