// src/modules/gestion_huerta/hooks/useTemporadas.ts

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchTemporadas,
  createTemporada,
  deleteTemporada,
  finalizarTemporada,
  archivarTemporada,
  restaurarTemporada,
  setPage,
  setYearFilter,
  setHuertaId,
  setHuertaRentadaId,
} from '../../../global/store/temporadaSlice';
import {
  TemporadaCreateData,
} from '../types/temporadaTypes';

export function useTemporadas() {
  const dispatch = useAppDispatch();
  const {
    list: temporadas,
    loading,
    loaded,
    page,
    meta,
    yearFilter,
    huertaId,
    huertaRentadaId,
  } = useAppSelector((state) => state.temporada);

  useEffect(() => {
    dispatch(fetchTemporadas({ page, año: yearFilter || undefined, huertaId: huertaId || undefined, huertaRentadaId: huertaRentadaId || undefined }));
  }, [dispatch, page, yearFilter, huertaId, huertaRentadaId]);

  const setPageNumber = (n: number) => dispatch(setPage(n));
  const setYear = (y: number | null) => dispatch(setYearFilter(y));
  const setHuerta = (id: number | null) => dispatch(setHuertaId(id));
  const setHuertaRentada = (id: number | null) => dispatch(setHuertaRentadaId(id));

  // CRUD + acciones especiales. Cada método devuelve la promesa
  const addTemporada = (payload: TemporadaCreateData) => {
    return dispatch(createTemporada(payload)).unwrap().then(() => {
      return dispatch(fetchTemporadas({ page, año: yearFilter || undefined, huertaId: huertaId || undefined, huertaRentadaId: huertaRentadaId || undefined })).unwrap();
    });
  };

  const removeTemporada = (id: number) => {
    return dispatch(deleteTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas({ page, año: yearFilter || undefined, huertaId: huertaId || undefined, huertaRentadaId: huertaRentadaId || undefined })).unwrap();
    });
  };

  const finalizeTemporada = (id: number) => {
    return dispatch(finalizarTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas({ page, año: yearFilter || undefined, huertaId: huertaId || undefined, huertaRentadaId: huertaRentadaId || undefined })).unwrap();
    });
  };

  const archiveTemporada = (id: number) => {
    return dispatch(archivarTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas({ page, año: yearFilter || undefined, huertaId: huertaId || undefined, huertaRentadaId: huertaRentadaId || undefined })).unwrap();
    });
  };

  const restoreTemporada = (id: number) => {
    return dispatch(restaurarTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas({ page, año: yearFilter || undefined, huertaId: huertaId || undefined, huertaRentadaId: huertaRentadaId || undefined })).unwrap();
    });
  };

  return {
    temporadas,
    loading,
    loaded,
    page,
    meta,
    yearFilter,
    setPage: setPageNumber,
    setYear,
    huertaId,
    setHuerta,
    huertaRentadaId,
    setHuertaRentada,
    addTemporada,
    removeTemporada,
    finalizeTemporada,
    archiveTemporada,
    restoreTemporada,
  };
}
