// src/modules/gestion_huerta/hooks/useTemporadas.ts

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchTemporadas,
  createTemporada,
  deleteTemporada,
  finalizarTemporada,
  archivarTemporada,
  restaurarTemporada,
  setPage,
} from '../../../global/store/temporadaSlice';
import {
  Temporada,
  TemporadaCreateData,
} from '../types/temporadaTypes';

export function useTemporadas() {
  const dispatch = useAppDispatch();
  const {
    list: temporadasList,
    loading,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.temporada);

  const [temporadas, setTemporadas] = useState<Temporada[]>([]);

  // 1) Sincronizar Redux → estado local
  useEffect(() => {
    setTemporadas(temporadasList);
  }, [temporadasList]);

  // 2) Primera carga
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchTemporadas(page));
    }
  }, [dispatch, loaded, loading, page]);

  // CRUD + acciones especiales. Cada método devuelve la promesa
  const addTemporada = (payload: TemporadaCreateData) => {
    return dispatch(createTemporada(payload)).unwrap().then(() => {
      return dispatch(fetchTemporadas(page)).unwrap();
    });
  };

  const removeTemporada = (id: number) => {
    return dispatch(deleteTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas(page)).unwrap();
    });
  };

  const finalizeTemporada = (id: number) => {
    return dispatch(finalizarTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas(page)).unwrap();
    });
  };

  const archiveTemporada = (id: number) => {
    return dispatch(archivarTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas(page)).unwrap();
    });
  };

  const restoreTemporada = (id: number) => {
    return dispatch(restaurarTemporada(id)).unwrap().then(() => {
      return dispatch(fetchTemporadas(page)).unwrap();
    });
  };

  const fetchAllTemporadas = () => dispatch(fetchTemporadas(page));
  const changePage = (newPage: number) => {
    dispatch(setPage(newPage));
    return dispatch(fetchTemporadas(newPage));
  };

  return {
    temporadas,
    loading,
    meta,
    page,
    setPage: changePage,
    fetchTemporadas: fetchAllTemporadas,
    addTemporada,
    removeTemporada,
    finalizeTemporada,
    archiveTemporada,
    restoreTemporada,
  };
}
