// src/modules/gestion_huerta/hooks/useHuertaRentada.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertasRentadas,
  createHuertaRentada,
  updateHuertaRentada,
  deleteHuertaRentada,
  setPage
} from '../../../global/store/huertaRentadaSlice';
import {
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData
} from '../types/huertaRentadaTypes';

export function useHuertaRentada() {
  const dispatch = useAppDispatch();

  const {
    list: huertasRentadas,
    loading,
    error,
    loaded,
    page,
    meta
  } = useAppSelector(state => state.huertaRentada);

  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchHuertasRentadas(page));
    }
  }, [dispatch, loaded, loading, page]);

  const addHuertaRentada = (payload: HuertaRentadaCreateData) =>
    dispatch(createHuertaRentada(payload)).unwrap();

  const editHuertaRentada = (id: number, payload: HuertaRentadaUpdateData) =>
    dispatch(updateHuertaRentada({ id, payload }));

  const removeHuertaRentada = (id: number) =>
    dispatch(deleteHuertaRentada(id));

  const fetchHuertasAgain = () =>
    dispatch(fetchHuertasRentadas(page));

  return {
    huertasRentadas,
    loading,
    error,
    loaded,
    page,
    meta,
    setPage: (newPage: number) => dispatch(setPage(newPage)),
    addHuertaRentada,
    editHuertaRentada,
    removeHuertaRentada,
    fetchHuertasRentadas: fetchHuertasAgain,
  };
}
