/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchVentas,
  createVenta,
  updateVenta,
  archiveVenta,
  restoreVenta,
  deleteVenta,
  setPage,
  setContext,
  setFilters,
} from '../../../global/store/ventasSlice';
import type { VentaFilters } from '../types/ventaTypes';
import {
  VentaCreateData,
  VentaUpdateData,
} from '../types/ventaTypes';

/**
 * Hook para manejar la lista de ventas en el frontend.
 * Expone la lista, metadatos de paginación, filtros, contexto y operaciones CRUD.
 * Se dispara automáticamente fetchVentas cuando cambian el contexto, la página, los filtros o el estado (activos/archivados/todos).
 */
export function useVentas() {
  const dispatch = useAppDispatch();
  const {
    list: ventas,
    loading,
    error,
    page,
    meta,
    huertaId,
    huertaRentadaId,
    temporadaId,
    cosechaId,
    filters,
  } = useAppSelector((s) => s.ventas);

  // Fetch on context / page / filters / estado change
  useEffect(() => {
    dispatch(fetchVentas());
  }, [dispatch, huertaId, huertaRentadaId, temporadaId, cosechaId, page, filters]);

  const refetch = () => dispatch(fetchVentas());

  // Context
  const setContextIds = (args: { huertaId?: number; huertaRentadaId?: number; temporadaId: number; cosechaId: number }) =>
    dispatch(setContext(args));

  // Pagination & filters
  const changePage    = (p: number)       => dispatch(setPage(p));
  const changeFilters = (f: VentaFilters) => dispatch(setFilters(f));
  // Cambia el estado de las ventas (activas/archivadas/todas) actualizando el filtro
  const changeEstado = (e: 'activas' | 'archivadas' | 'todas') => {
    dispatch(setFilters({ ...filters, estado: e }));
  };

  // CRUD
  const addVenta = (data: VentaCreateData) =>
    dispatch(createVenta(data)).unwrap();

  const editVenta = (id: number, data: VentaUpdateData) =>
    dispatch(updateVenta({ id, payload: data })).unwrap();

  const removeVenta = (id: number) =>
    dispatch(deleteVenta(id)).unwrap();

  const archive = (id: number) =>
    dispatch(archiveVenta(id)).unwrap();

  const restore = (id: number) =>
    dispatch(restoreVenta(id)).unwrap();

  return {
    ventas,
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
    changeEstado,
    refetch,
    // CRUD
    addVenta,
    editVenta,
    removeVenta,
    archive,
    restore,
  };
}

export default useVentas;