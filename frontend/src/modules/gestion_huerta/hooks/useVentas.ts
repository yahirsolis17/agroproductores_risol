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
  setEstado,
} from '../../../global/store/ventasSlice';
import type { VentaFilters } from '../types/ventaTypes';
import {
  VentaCreateData,
  VentaUpdateData,
} from '../types/ventaTypes';

/**
 * Hook para manejar la lista de ventas en el frontend.
 * Expone la lista, metadatos de paginación, filtros, contexto y operaciones CRUD.
 * Se dispara automáticamente fetchVentas cuando cambian el contexto, la página, los filtros o el estado (activas/archivadas/todas).
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
    temporadaId,
    cosechaId,
    filters,
    estado,
  } = useAppSelector((s) => s.ventas);

  // Fetch on context / page / filters / estado change
  useEffect(() => {
    dispatch(fetchVentas());
  }, [dispatch, huertaId, temporadaId, cosechaId, page, filters, estado]);

  const refetch = () => dispatch(fetchVentas());

  // Context
  const setContextIds = (h: number, t: number, c: number) =>
    dispatch(setContext({ huertaId: h, temporadaId: t, cosechaId: c }));

  // Pagination & filters
  const changePage    = (p: number)       => dispatch(setPage(p));
  const changeFilters = (f: VentaFilters) => dispatch(setFilters(f));

  // Estado (activas, archivadas o todas)
  const changeEstado  = (e: 'activas' | 'archivadas' | 'todas') =>
    dispatch(setEstado(e));

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
    temporadaId,
    cosechaId,
    filters,
    estado,
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
