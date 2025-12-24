// src/modules/gestion_huerta/hooks/useVentas.ts
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
import {
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../types/ventaTypes';

export function useVentas() {
  const dispatch = useAppDispatch();
  const {
    items: ventas,
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

  // Auto-fetch cuando cambien contexto / paginación / filtros
  useEffect(() => {
    if (!temporadaId || !cosechaId) return;
    dispatch(fetchVentas());
  }, [dispatch, huertaId, huertaRentadaId, temporadaId, cosechaId, page, filters]);

  // Context setters
  const setContextIds = (args: { huertaId?: number; huertaRentadaId?: number; temporadaId: number; cosechaId: number }) =>
    dispatch(setContext(args));

  // Pagination & filters
  const changePage    = (p: number)          => dispatch(setPage(p));
  const changeFilters = (f: typeof filters)   => dispatch(setFilters(f));

  // CRUD actions
  const addVenta = (data: VentaHuertaCreateData) =>
    dispatch(createVenta(data)).unwrap();

  const editVenta = (id: number, data: VentaHuertaUpdateData) =>
    dispatch(updateVenta({ id, payload: data })).unwrap();

  const removeVenta = (id: number) =>
    dispatch(deleteVenta(id)).unwrap();

  const archive = (id: number) => dispatch(archiveVenta(id)).unwrap();
  const restore = (id: number) => dispatch(restoreVenta(id)).unwrap();

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
    // CRUD
    addVenta,
    editVenta,
    removeVenta,
    archive,
    restore,
  };
}

export default useVentas;
