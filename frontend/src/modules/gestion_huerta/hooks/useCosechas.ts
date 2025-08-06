// src/modules/gestion_huerta/hooks/useCosechas.ts
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
    list: cosechas,
    loading,
    error,
    page,
    meta,
    temporadaId,
    search,
    estado,
  } = useAppSelector((s) => s.cosechas);

  // Auto‐fetch cuando cambien filtros/página
  useEffect(() => {
    if (temporadaId !== null) {
      dispatch(fetchCosechas());
    }
  }, [dispatch, page, temporadaId, search, estado]);

  const refresh = async () => {
    if (temporadaId !== null) {
      await dispatch(fetchCosechas()).unwrap();
    }
  };

  return {
    cosechas,
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
    setEstado: (v: 'activas' | 'archivadas' | 'todas') => dispatch(setEstado(v)),

    addCosecha: async (data: CosechaCreateData) => {
      await dispatch(createCosecha(data)).unwrap();
      await refresh();
    },
    renameCosecha: async (id: number, data: CosechaUpdateData) => {
      await dispatch(updateCosecha({ id, data })).unwrap();
      await refresh();
    },
    removeCosecha: async (id: number) => {
      await dispatch(deleteCosecha(id)).unwrap();
      await refresh();
    },
    archiveCosecha: async (id: number) => {
      await dispatch(archivarCosecha(id)).unwrap();
      await refresh();
    },
    restoreCosecha: async (id: number) => {
      await dispatch(restaurarCosecha(id)).unwrap();
      await refresh();
    },
    toggleFinalizada: async (id: number) => {
      await dispatch(toggleFinalizadaCosecha(id)).unwrap();
      await refresh();
    },
  };
}
