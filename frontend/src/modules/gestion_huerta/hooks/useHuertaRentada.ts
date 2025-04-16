// src/modules/gestion_huerta/hooks/useHuertaRentada.ts
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertasRentadas,
  createHuertaRentada,
  updateHuertaRentada,
  deleteHuertaRentada
} from '../../../global/store/huertaRentadaSlice';
import {
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData
} from '../types/huertaRentadaTypes';
import { useEffect } from 'react';

export function useHuertaRentada() {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector(state => state.huertaRentada);

  useEffect(() => {
    if (!list.length) {
      dispatch(fetchHuertasRentadas());
    }
  }, [dispatch, list.length]);

  const addHuertaRentada = (payload: HuertaRentadaCreateData) => dispatch(createHuertaRentada(payload));
  const editHuertaRentada = (id: number, payload: HuertaRentadaUpdateData) => dispatch(updateHuertaRentada({ id, payload }));
  const removeHuertaRentada = (id: number) => dispatch(deleteHuertaRentada(id));

  return {
    huertasRentadas: list,
    loading,
    error,
    fetchHuertasRentadas: () => dispatch(fetchHuertasRentadas()),
    addHuertaRentada,
    editHuertaRentada,
    removeHuertaRentada,
  };
}
