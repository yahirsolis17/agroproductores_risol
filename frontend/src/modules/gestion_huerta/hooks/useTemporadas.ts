// src/modules/gestion_huerta/hooks/useTemporadas.ts

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchTemporadas,
  createTemporada,
  updateTemporada,
  deleteTemporada,
  finalizarTemporada,
  archivarTemporada,
  restaurarTemporada,
  setPage,
} from '../../../global/store/temporadaSlice';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import {
  Temporada,
  TemporadaCreateData,
  TemporadaUpdateData,
} from '../types/temporadaTypes';

export function useTemporadas() {
  const dispatch = useAppDispatch();
  const {
    list: temporadasList,
    loading,
    error,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.temporada);

  // Local state for optimistic updates
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);

  // Sync Redux → local
  useEffect(() => {
    setTemporadas(temporadasList);
  }, [temporadasList]);

  // Initial fetch
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchTemporadas(page));
    }
  }, [dispatch, loaded, loading, page]);

  // Show backend errors as toasts
  useEffect(() => {
    if (error) {
      handleBackendNotification(error.notification || error);
    }
  }, [error]);

  // CRUD + special actions, always refetch page after success
  const addTemporada = async (payload: TemporadaCreateData) => {
    try {
      await dispatch(createTemporada(payload)).unwrap();
      await dispatch(fetchTemporadas(page)).unwrap();
    } catch {
      // error handled by slice + toasts
    }
  };

  const editTemporada = async (id: number, payload: TemporadaUpdateData) => {
    try {
      await dispatch(updateTemporada({ id, payload })).unwrap();
      await dispatch(fetchTemporadas(page)).unwrap();
    } catch {
      // error handled
    }
  };

  const removeTemporada = async (id: number) => {
    try {
      await dispatch(deleteTemporada(id)).unwrap();
      await dispatch(fetchTemporadas(page)).unwrap();
    } catch {
      // error handled
    }
  };

  const finalizeTemporada = async (id: number) => {
    try {
      await dispatch(finalizarTemporada(id)).unwrap();
      await dispatch(fetchTemporadas(page)).unwrap();
    } catch {
      // error handled
    }
  };

  const archiveTemporada = async (id: number) => {
    try {
      await dispatch(archivarTemporada(id)).unwrap();
      await dispatch(fetchTemporadas(page)).unwrap();
    } catch {
      // error handled
    }
  };

  const restoreTemporada = async (id: number) => {
    try {
      await dispatch(restaurarTemporada(id)).unwrap();
      await dispatch(fetchTemporadas(page)).unwrap();
    } catch {
      // error handled
    }
  };

  const fetchAllTemporadas = () => dispatch(fetchTemporadas(page));
  const changePage = (newPage: number) => {
    dispatch(setPage(newPage));
    dispatch(fetchTemporadas(newPage));
  };

  return {
    temporadas,
    loading,
    meta,
    page,
    setPage: changePage,
    fetchTemporadas: fetchAllTemporadas,
    addTemporada,
    editTemporada,
    removeTemporada,
    finalizeTemporada,
    archiveTemporada,
    restoreTemporada,
  };
}
