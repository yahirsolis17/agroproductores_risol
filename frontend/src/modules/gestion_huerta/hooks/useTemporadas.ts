// src/modules/gestion_huerta/hooks/useTemporadas.ts

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchTemporadas,
  createTemporada,
  deleteTemporada,
  finalizarTemporada,
  archivarTemporada,
  restaurarTemporada,
  setPage,
  setYearFilter,
  setHuertaId,
  setHuertaRentadaId,
  setEstadoFilter,
  setFinalizadaFilter,
  setSearchFilter,
} from '../../../global/store/temporadaSlice';
import {
  TemporadaCreateData,
} from '../types/temporadaTypes';

export function useTemporadas() {
  const dispatch = useAppDispatch();
  const {
    list: temporadas,
    loading,
    loaded,
    page,
    meta,
    yearFilter,
    huertaId,
    huertaRentadaId,
    estadoFilter,
    finalizadaFilter,
    searchFilter,
  } = useAppSelector((state) => state.temporada);

  useEffect(() => {
    dispatch(fetchTemporadas({ 
      page, 
      año: yearFilter || undefined, 
      huertaId: huertaId || undefined, 
      huertaRentadaId: huertaRentadaId || undefined,
      estado: estadoFilter,
      finalizada: finalizadaFilter || undefined,
      search: searchFilter || undefined,
    }));
  }, [dispatch, page, yearFilter, huertaId, huertaRentadaId, estadoFilter, finalizadaFilter, searchFilter]);

  const setPageNumber = (n: number) => dispatch(setPage(n));
  const setYear = (y: number | null) => dispatch(setYearFilter(y));
  const setHuerta = (id: number | null) => dispatch(setHuertaId(id));
  const setHuertaRentada = (id: number | null) => dispatch(setHuertaRentadaId(id));
  const setEstado = (estado: 'activas' | 'archivadas' | 'todas') => dispatch(setEstadoFilter(estado));
  const setFinalizada = (finalizada: boolean | null) => dispatch(setFinalizadaFilter(finalizada));
  const setSearch = (search: string) => dispatch(setSearchFilter(search));

  // Helper para refrescar con filtros actuales
  const refreshWithCurrentFilters = () => {
    return dispatch(fetchTemporadas({ 
      page, 
      año: yearFilter || undefined, 
      huertaId: huertaId || undefined, 
      huertaRentadaId: huertaRentadaId || undefined,
      estado: estadoFilter,
      finalizada: finalizadaFilter || undefined,
      search: searchFilter || undefined,
    })).unwrap();
  };

  // CRUD + acciones especiales. Cada método devuelve la promesa
  const addTemporada = (payload: TemporadaCreateData) => {
    return dispatch(createTemporada(payload)).unwrap().then(() => {
      return refreshWithCurrentFilters();
    });
  };

  const removeTemporada = (id: number) => {
    return dispatch(deleteTemporada(id)).unwrap().then(() => {
      return refreshWithCurrentFilters();
    });
  };

  const finalizeTemporada = (id: number) => {
    return dispatch(finalizarTemporada(id)).unwrap().then(() => {
      return refreshWithCurrentFilters();
    });
  };

  const archiveTemporada = (id: number) => {
    return dispatch(archivarTemporada(id)).unwrap().then(() => {
      return refreshWithCurrentFilters();
    });
  };

  const restoreTemporada = (id: number) => {
    return dispatch(restaurarTemporada(id)).unwrap().then(() => {
      return refreshWithCurrentFilters();
    });
  };

  return {
    temporadas,
    loading,
    loaded,
    page,
    meta,
    yearFilter,
    estadoFilter,
    finalizadaFilter,
    searchFilter,
    setPage: setPageNumber,
    setYear,
    huertaId,
    setHuerta,
    huertaRentadaId,
    setHuertaRentada,
    setEstado,
    setFinalizada,
    setSearch,
    addTemporada,
    removeTemporada,
    finalizeTemporada,
    archiveTemporada,
    restoreTemporada,
  };
}
