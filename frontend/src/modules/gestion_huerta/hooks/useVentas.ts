// src/modules/gestion_huerta/hooks/useVentas.ts
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchVentasByCosecha,
  createVenta,
  updateVenta,
  deleteVenta,
} from '../../../global/store/ventasSlice';
import { VentaCreateData, VentaUpdateData } from '../types/ventaTypes';

export function useVentas() {
  const dispatch = useAppDispatch();
  const { count, next, previous, results, loading, error } = useAppSelector(state => state.ventas);

  const getVentasByCosecha = (cosechaId: number, page?: number) =>
    dispatch(fetchVentasByCosecha({ cosechaId, page }));

  const addVenta = (payload: VentaCreateData) => dispatch(createVenta(payload));
  const editVenta = (id: number, payload: VentaUpdateData) => dispatch(updateVenta({ id, payload }));
  const removeVenta = (id: number) => dispatch(deleteVenta(id));

  return {
    count,
    next,
    previous,
    ventas: results,
    loading,
    error,
    getVentasByCosecha,
    addVenta,
    editVenta,
    removeVenta,
  };
}
