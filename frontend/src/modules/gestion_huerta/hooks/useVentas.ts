/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchVentas,
  createVenta,
  updateVenta,
  deleteVenta,
  archiveVenta,
  restoreVenta,
  setVPage,
  setVEstado,
  setVFilters,
  setVCosecha,
} from '../../../global/store/ventasSlice';
import type { VentaCreate, VentaUpdate } from '../types/ventaTypes';
import type { VentaFilters, Estado } from '../services/ventaService';

export function useVentas(cosechaId?: number) {
  const dispatch = useAppDispatch();
  const { list, loading, error, meta, page, estado, filters, cosechaId: cs } = useAppSelector((s) => s.ventas);

  useEffect(() => { dispatch(setVCosecha(cosechaId)); }, [cosechaId]);

  useEffect(() => {
    if (!cs) return;
    dispatch(fetchVentas({ page, estado, filters, cosechaId: cs }));
  }, [dispatch, page, estado, filters, cs]);

  const addVenta    = (p: VentaCreate)                 => dispatch(createVenta(p)).unwrap();
  const editVenta   = (id: number, p: VentaUpdate)     => dispatch(updateVenta({ id, payload: p })).unwrap();
  const removeVenta = (id: number)                     => dispatch(deleteVenta(id)).unwrap();
  const archive     = (id: number)                     => dispatch(archiveVenta(id)).unwrap();
  const restore     = (id: number)                     => dispatch(restoreVenta(id)).unwrap();
  const refetch     = () => cs && dispatch(fetchVentas({ page, estado, filters, cosechaId: cs }));

  const setPage    = (n: number)           => dispatch(setVPage(n));
  const setEstado  = (e: Estado)           => dispatch(setVEstado(e));
  const setFilters = (f: VentaFilters)     => dispatch(setVFilters(f));

  return {
    ventas: list,
    loading,
    error,
    meta,
    page,
    estado,
    filters,
    setPage,
    setEstado,
    setFilters,
    refetch,
    addVenta,
    editVenta,
    removeVenta,
    archive,
    restore,
    cosechaId: cs,
  };
}

export default useVentas;
