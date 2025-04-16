// src/modules/gestion_huerta/hooks/useHuertas.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertas,
  createHuerta,
  updateHuerta,
  deleteHuerta,
} from '../../../global/store/huertaSlice';
import { HuertaCreateData, HuertaUpdateData } from '../types/cosechaTypes';

export function useHuertas() {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector((state) => state.huerta);

  // Efecto que carga huertas automáticamente si la lista está vacía y no se está cargando.
  useEffect(() => {
    if (!list.length && !loading) {
      dispatch(fetchHuertas());
    }
  }, [dispatch, list.length, loading]);

  // Funciones para crear/actualizar/eliminar
  const addHuerta = (payload: HuertaCreateData) => dispatch(createHuerta(payload));
  const editHuerta = (id: number, payload: HuertaUpdateData) =>
    dispatch(updateHuerta({ id, payload }));
  const removeHuerta = (id: number) => dispatch(deleteHuerta(id));

  // Exponemos estos valores
  return {
    huertas: list,
    loading,
    error,
    addHuerta,
    editHuerta,
    removeHuerta,
    // Opcionalmente, si deseas refrescar manualmente:
    fetchHuertas: () => dispatch(fetchHuertas()),
  };
}
