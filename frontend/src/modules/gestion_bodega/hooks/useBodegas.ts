// src/modules/gestion_bodega/hooks/useBodegas.ts
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';

import {
  // thunks
  fetchBodegas,
  createBodega,
  updateBodega,
  deleteBodega,
  archiveBodega,
  restoreBodega,
  // reducers
  setBPage,
  setBEstado,
  setBFilters,
} from '../../../global/store/bodegasSlice';

import type {
  BodegaCreateData,
  BodegaUpdateData,
  BodegaFilters,
  EstadoBodega,
} from '../types/bodegaTypes';

/**
 * Hook de orquestación para la pantalla de Bodegas.
 * - Auto-fetch en cambios de page/estado/filters (opt-in por defecto).
 * - Devuelve state + acciones de paginación/filtros.
 * - CRUD y acciones de negocio (archivar/restaurar) tipadas.
 *
 * Mantiene la misma interfaz mental que useHuertas / useTemporadas.
 */
export function useBodegas(autoFetch: boolean = true) {
  const dispatch = useAppDispatch();

  // Clave del slice en el store: 'bodegas'
  const state = useAppSelector((s) => s.bodegas);

  // Auto carga cuando cambian page/estado/filtros (igual patrón que huerta)
  useEffect(() => {
    if (!autoFetch) return;
    dispatch(fetchBodegas({ page: state.page, estado: state.estado, filters: state.filters }));
  }, [dispatch, autoFetch, state.page, state.estado, state.filters]);

  // Manual reload (y alias refetch para compatibilidad con componentes existentes)
  const reload = useCallback(
    () => dispatch(fetchBodegas({ page: state.page, estado: state.estado, filters: state.filters })),
    [dispatch, state.page, state.estado, state.filters]
  );

  const refetch = reload; // alias

  // Paginación / estado / filtros
  const setPage = useCallback((page: number) => dispatch(setBPage(page)), [dispatch]);
  const setEstado = useCallback((estado: EstadoBodega) => dispatch(setBEstado(estado)), [dispatch]);
  const setFiltersAction = useCallback(
    (filters: BodegaFilters) => dispatch(setBFilters(filters)),
    [dispatch]
  );

  // CRUD
  const crear = useCallback(
    async (payload: BodegaCreateData) => {
      const result = await dispatch(createBodega(payload)).unwrap();
      await reload();
      return result;
    },
    [dispatch, reload]
  );

  const actualizar = useCallback(
    (id: number, payload: BodegaUpdateData) => dispatch(updateBodega({ id, payload })).unwrap(),
    [dispatch]
  );

  const eliminar = useCallback((id: number) => dispatch(deleteBodega(id)).unwrap(), [dispatch]);

  // Acciones de negocio
  const archivar = useCallback((id: number) => dispatch(archiveBodega(id)).unwrap(), [dispatch]);
  const restaurar = useCallback((id: number) => dispatch(restoreBodega(id)).unwrap(), [dispatch]);

  return {
    // state
    list: state.list,
    loading: state.loading,
    loaded: state.loaded,
    error: state.error,
    page: state.page,
    estado: state.estado,
    filters: state.filters,
    meta: state.meta,

    // acciones UI
    setPage,
    setEstado,
    setFilters: setFiltersAction,

    // fetchers
    reload,
    refetch, // alias

    // crud
    crear,
    create: crear,
    actualizar,
    update: actualizar,
    eliminar,
    remove: eliminar,

    // negocio
    archivar,
    restaurar,
  };
}

export default useBodegas;
