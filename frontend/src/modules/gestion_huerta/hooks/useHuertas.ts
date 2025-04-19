// src/modules/gestion_huerta/hooks/useHuertas.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertas,
  createHuerta,
  updateHuerta,
  deleteHuerta,
  setPage
} from '../../../global/store/huertaSlice';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';

export function useHuertas() {
  const dispatch = useAppDispatch();

  const {
    list: huertas,
    loading,
    error,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.huerta);

  // Cargar huertas si no se han cargado aún
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchHuertas(page));
    }
  }, [dispatch, loaded, loading, page]);

  // Agregar huerta
  const addHuerta = (payload: HuertaCreateData): Promise<Huerta> =>
    dispatch(createHuerta(payload)).unwrap();

  // Editar huerta
  const editHuerta = (id: number, payload: HuertaUpdateData) =>
    dispatch(updateHuerta({ id, payload }));

  // Eliminar huerta
  const removeHuerta = (id: number) =>
    dispatch(deleteHuerta(id));

  // Refrescar lista
  const fetchHuertasReload = () => dispatch(fetchHuertas(page));

  return {
    huertas,
    loading,
    error,
    loaded,
    meta,
    page,
    setPage: (newPage: number) => dispatch(setPage(newPage)),
    addHuerta,
    editHuerta,
    removeHuerta,
    fetchHuertas: fetchHuertasReload,
  };
}
