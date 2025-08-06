import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchCosechas,
  setPage,
  setTemporadaId,
  setSearch,
  setEstado,
  createCosecha,
  updateCosecha,
  deleteCosecha,
  archivarCosecha,
  restaurarCosecha,
  toggleFinalizadaCosecha,
} from '../../../global/store/cosechasSlice';
import type { CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';

export function useCosechas() {
  const dispatch = useAppDispatch();
  const {
    list,
    loading,
    error,
    page,
    meta,
    temporadaId,
    search,
    estado,
  } = useAppSelector((s) => s.cosechas);

  useEffect(() => {
    if (!temporadaId) return;
    dispatch(fetchCosechas({ page, temporadaId, search, estado }));
  }, [dispatch, page, temporadaId, search, estado]);

  const refreshWithCurrentFilters = () => {
    if (!temporadaId) return Promise.resolve();
    return dispatch(fetchCosechas({ page, temporadaId, search, estado })).unwrap();
  };

  return {
    cosechas: list,
    loading,
    error,
    page,
    meta,
    temporadaId,
    search,
    estado,

    setPage: (p: number) => dispatch(setPage(p)),
    setTemporadaId: (id: number | null) => dispatch(setTemporadaId(id)),
    setSearch: (q: string) => dispatch(setSearch(q)),
    setEstado: (v: 'activas'|'archivadas'|'todas') => dispatch(setEstado(v)),

    addCosecha: (payload: CosechaCreateData) =>
      dispatch(createCosecha(payload)).unwrap().then(() => refreshWithCurrentFilters()),
    renameCosecha: (id: number, data: CosechaUpdateData) =>
      dispatch(updateCosecha({ id, data })).unwrap().then(() => refreshWithCurrentFilters()),
    removeCosecha: (id: number) =>
      dispatch(deleteCosecha(id)).unwrap().then(() => refreshWithCurrentFilters()),
    archiveCosecha: (id: number) =>
      dispatch(archivarCosecha(id)).unwrap().then(() => refreshWithCurrentFilters()),
    restoreCosecha: (id: number) =>
      dispatch(restaurarCosecha(id)).unwrap().then(() => refreshWithCurrentFilters()),
    toggleFinalizada: (id: number) =>
      dispatch(toggleFinalizadaCosecha(id)).unwrap().then(() => refreshWithCurrentFilters()),
    refetch: () => refreshWithCurrentFilters(),
  };
}
