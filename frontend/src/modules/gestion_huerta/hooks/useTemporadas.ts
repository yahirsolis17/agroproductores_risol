// src/modules/gestion_huerta/hooks/useTemporadas.ts
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useCallback } from 'react';
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
import { TemporadaCreateData, EstadoTemporada } from '../types/temporadaTypes';

export function useTemporadas({ enabled = true }: { enabled?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const {
    items: temporadas,
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
    if (!enabled) return;
    if (!huertaId && !huertaRentadaId) return;

    dispatch(
      fetchTemporadas({
        page,
        año: yearFilter || undefined,
        huertaId: huertaId || undefined,
        huertaRentadaId: huertaRentadaId || undefined,
        estado: estadoFilter,                   // ✅ consistente
        finalizada: finalizadaFilter ?? undefined,
        search: searchFilter || undefined,
      })
    );
  }, [
    enabled,
    dispatch,
    page,
    yearFilter,
    huertaId,
    huertaRentadaId,
    estadoFilter,
    finalizadaFilter,
    searchFilter,
  ]);

  const setPageNumber = useCallback((n: number) => dispatch(setPage(n)), [dispatch]);
  const setYear = useCallback((y: number | null) => dispatch(setYearFilter(y)), [dispatch]);
  const setHuerta = useCallback((id: number | null) => dispatch(setHuertaId(id)), [dispatch]);
  const setHuertaRentada = useCallback((id: number | null) => dispatch(setHuertaRentadaId(id)), [dispatch]);
  const setEstado = useCallback((estado: EstadoTemporada) => dispatch(setEstadoFilter(estado)), [dispatch]);
  const setFinalizada = useCallback((finalizada: boolean | null) => dispatch(setFinalizadaFilter(finalizada)), [dispatch]);
  const setSearch = useCallback((search: string) => dispatch(setSearchFilter(search)), [dispatch]);

  const refreshWithCurrentFilters = () =>
    dispatch(
      fetchTemporadas({
        page,
        año: yearFilter || undefined,
        huertaId: huertaId || undefined,
        huertaRentadaId: huertaRentadaId || undefined,
        estado: estadoFilter,                  // ✅ consistente
        finalizada: finalizadaFilter ?? undefined,
        search: searchFilter || undefined,
      })
    ).unwrap();

  const addTemporada = (payload: TemporadaCreateData) =>
    dispatch(createTemporada(payload)).unwrap().then(refreshWithCurrentFilters);

  const removeTemporada = (id: number) =>
    dispatch(deleteTemporada(id)).unwrap().then(refreshWithCurrentFilters);

  const finalizeTemporada = (id: number) =>
    dispatch(finalizarTemporada(id)).unwrap().then(refreshWithCurrentFilters);

  const archiveTemporada = (id: number) =>
    dispatch(archivarTemporada(id)).unwrap().then(refreshWithCurrentFilters);

  const restoreTemporada = (id: number) =>
    dispatch(restaurarTemporada(id)).unwrap().then(refreshWithCurrentFilters);

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
export default useTemporadas;
