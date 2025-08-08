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
  VentaFilters,
} from '../../../global/store/ventasSlice';
import {
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../types/ventaTypes';

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
  } = useAppSelector((s) => s.ventas);

  // Fetch on context / page / filters change
  useEffect(() => {
    dispatch(fetchVentas());
  }, [dispatch, huertaId, temporadaId, cosechaId, page, filters]);

  const refetch = () => dispatch(fetchVentas());

  // Context
  const setContextIds = (h: number, t: number, c: number) =>
    dispatch(setContext({ huertaId: h, temporadaId: t, cosechaId: c }));

  // Pagination & filters
  const changePage    = (p: number)         => dispatch(setPage(p));
  const changeFilters = (f: VentaFilters)   => dispatch(setFilters(f));

  // CRUD
  const addVenta = (data: VentaHuertaCreateData) =>
    dispatch(createVenta(data)).unwrap();

  const editVenta = (id: number, data: VentaHuertaUpdateData) =>
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
    // context
    setContext: setContextIds,
    // navigation
    changePage,
    changeFilters,
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
