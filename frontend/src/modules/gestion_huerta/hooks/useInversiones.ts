// src/modules/gestion_huerta/hooks/useInversiones.ts
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchInversionesByCosecha,
  createInversion,
  updateInversion,
  deleteInversion,
} from '../../../global/store/inversionesSlice';
import { InversionCreateData, InversionUpdateData } from '../types/inversionTypes';

export function useInversiones() {
  const dispatch = useAppDispatch();
  const { count, next, previous, results, loading, error } = useAppSelector(state => state.inversiones);

  const getInversionesByCosecha = (cosechaId: number, page?: number) =>
    dispatch(fetchInversionesByCosecha({ cosechaId, page }));

  const addInversion = (payload: InversionCreateData) => dispatch(createInversion(payload));
  const editInversion = (id: number, payload: InversionUpdateData) => dispatch(updateInversion({ id, payload }));
  const removeInversion = (id: number) => dispatch(deleteInversion(id));

  return {
    count,
    next,
    previous,
    inversiones: results,
    loading,
    error,
    getInversionesByCosecha,
    addInversion,
    editInversion,
    removeInversion,
  };
}
