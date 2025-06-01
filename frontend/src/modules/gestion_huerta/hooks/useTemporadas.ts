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
    error,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.temporada);

  const [temporadas, setTemporadas] = useState<Temporada[]>([]);

  // Sincronizar Redux → estado local
  useEffect(() => {
    setTemporadas(temporadasList);
  }, [temporadasList]);

  // Primera carga
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchTemporadas(page));
    }
  }, [dispatch, loaded, loading, page]);

  // Mostrar errores generales del slice (si los hubiera)
  // (opcional: por si el slice setea error en fetch, etc.)
  // usamos un useEffect para no “silenciar” errores no catched en el componente
  useEffect(() => {
    if (error) {
      // Aquí no llamamos a handleBackendNotification, 
      // porque el componente padre será quien lo haga.
    }
  }, [error]);

  // ───────────────────────────────────────────────────────────────────
  // CRUD + acciones especiales. Cada método RETORNA la promesa sin atrapar.
  // El componente padre será quien haga try/catch y se encargue del toast.
  // ───────────────────────────────────────────────────────────────────

  const addTemporada = (payload: TemporadaCreateData) => {
    // 1) Lanza createTemporada
    // 2) Luego fetchTemporadas (para recargar la lista)
    // 3) Dejar que el componente atrape cualquier excepción
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
