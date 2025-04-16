// src/modules/gestion_huerta/hooks/useHuertas.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertas,
  createHuerta,
  updateHuerta,
  deleteHuerta,
} from '../../../global/store/huertaSlice';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';

export function useHuertas() {
  const dispatch = useAppDispatch();
  const { list, loading, error, loaded } = useAppSelector((state) => state.huerta);

  // Cargar sólo si aún no se ha intentado y no está cargando
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchHuertas());
    }
  }, [dispatch, loaded, loading]);

  // Aquí forzamos que addHuerta retorne un Promise con el resultado de createHuerta.
  const addHuerta = (payload: HuertaCreateData): Promise<Huerta> =>
    dispatch(createHuerta(payload)).unwrap();

  const editHuerta = (id: number, payload: HuertaUpdateData) =>
    dispatch(updateHuerta({ id, payload }));

  const removeHuerta = (id: number) =>
    dispatch(deleteHuerta(id));

  // Si deseas refrescar manual:
  const reloadHuertas = () => dispatch(fetchHuertas());

  return {
    huertas: list,
    loading,
    error,
    loaded,
    addHuerta,
    editHuerta,
    removeHuerta,
    fetchHuertas: reloadHuertas,
  };
}
