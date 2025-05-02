// src/modules/gestion_huerta/hooks/useHuertasRentadas.ts
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertasRentadas,
  createHuertaRentada,
  updateHuertaRentada,
  deleteHuertaRentada,
  setPage,
} from '../../../global/store/huertaRentadaSlice';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../types/huertaRentadaTypes';

export function useHuertasRentadas() {
  const dispatch = useAppDispatch();
  const {
    list, loading, error, loaded, page, meta,
  } = useAppSelector((state) => state.huertaRentada);

  const [localHuertas, setLocalHuertas] = useState<HuertaRentada[]>([]);

  // 1. Sincronizar lista local
  useEffect(() => {
    setLocalHuertas(list);
  }, [list]);

  // 2. Primera carga si no está cargado
  useEffect(() => {
    if (!loaded && !loading) dispatch(fetchHuertasRentadas(page));
  }, [dispatch, loaded, loading, page]);

  // CRUD
  const addHuerta = (payload: HuertaRentadaCreateData): Promise<HuertaRentada> =>
    dispatch(createHuertaRentada(payload)).unwrap();

  const editHuerta = (id: number, payload: HuertaRentadaUpdateData) =>
    dispatch(updateHuertaRentada({ id, payload }));

  const removeHuerta = (id: number) => dispatch(deleteHuertaRentada(id));

  const refetchHuertas = () => dispatch(fetchHuertasRentadas(page));

  const toggleActivoLocal = (id: number, activo: boolean) =>
    setLocalHuertas((hs) => hs.map((h) => (h.id === id ? { ...h, is_active: activo } : h)));

  return {
    huertas: localHuertas,
    loading,
    error,
    loaded,
    meta,
    page,
    setPage: (n: number) => dispatch(setPage(n)),
    addHuerta,
    editHuerta,
    removeHuerta,
    fetchHuertas: refetchHuertas,
    toggleActivoLocal,
  };
}
