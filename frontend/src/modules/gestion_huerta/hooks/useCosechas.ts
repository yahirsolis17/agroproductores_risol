import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchCosechas,
  setPage,
  setTemporadaId,
  setSearch,
  setFinalizada,
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
    finalizada,
    estado,
  } = useAppSelector((s) => s.cosechas);

  useEffect(() => {
    if (!temporadaId) return;
    dispatch(fetchCosechas({ page, temporadaId, search, finalizada, estado }));
  }, [dispatch, page, temporadaId, search, finalizada, estado]);

  return {
    cosechas: list,
    loading,
    error,
    page,
    meta,
    temporadaId,
    search,
    finalizada,
    estado,

    setPage: (p: number) => dispatch(setPage(p)),
    setTemporadaId: (id: number | null) => dispatch(setTemporadaId(id)),
    setSearch: (q: string) => dispatch(setSearch(q)),
    setFinalizada: (v: boolean | null) => dispatch(setFinalizada(v)),
    setEstado: (v: 'activas'|'archivadas'|'todas') => dispatch(setEstado(v)),

    addCosecha: (payload: CosechaCreateData) => dispatch(createCosecha(payload)).unwrap(),
    renameCosecha: (id: number, data: CosechaUpdateData) => dispatch(updateCosecha({ id, data })).unwrap(),
    removeCosecha: (id: number) => dispatch(deleteCosecha(id)).unwrap(),
    archiveCosecha: (id: number) => dispatch(archivarCosecha(id)).unwrap(),
    restoreCosecha: (id: number) => dispatch(restaurarCosecha(id)).unwrap(),
    toggleFinalizada: (id: number) => dispatch(toggleFinalizadaCosecha(id)).unwrap(),
    refetch: () => {
      if (!temporadaId) return;
      return dispatch(fetchCosechas({ page, temporadaId, search, finalizada, estado }));
    },
  };
}
