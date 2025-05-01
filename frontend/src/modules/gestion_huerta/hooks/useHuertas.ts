// src/modules/gestion_huerta/hooks/useHuertas.ts
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom'; // ← para detectar ruta actual
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertas,
  createHuerta,
  updateHuerta,
  deleteHuerta,
  setPage,
} from '../../../global/store/huertaSlice';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../types/huertaTypes';

export function useHuertas() {
  const dispatch = useAppDispatch();
  const location = useLocation();

  const {
    list: globalHuertas,
    loading,
    error,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.huerta);

  const [localHuertas, setLocalHuertas] = useState<Huerta[]>([]);
  const [lastPath, setLastPath] = useState<string>(''); // ← detectar navegación entre rutas

  // 1) sincronizar lista local
  useEffect(() => {
    setLocalHuertas(globalHuertas);
  }, [globalHuertas]);

  // 2) recarga forzada al volver a esta ruta
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.includes('/huertas') && lastPath !== currentPath) {
      dispatch(fetchHuertas(page));
    }
    setLastPath(currentPath);
  }, [location.pathname]);

  // 3) primera carga (por si nunca se ha cargado)
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchHuertas(page));
    }
  }, [dispatch, loaded, loading, page]);

  // CRUD
  const addHuerta = (payload: HuertaCreateData): Promise<Huerta> =>
    dispatch(createHuerta(payload)).unwrap();

  const editHuerta = (id: number, payload: HuertaUpdateData) =>
    dispatch(updateHuerta({ id, payload }));

  const removeHuerta = (id: number) => dispatch(deleteHuerta(id));

  const refetchHuertas = () => dispatch(fetchHuertas(page));

  // Archivar/restaurar visual inmediato
  const toggleActivoLocal = (id: number, nuevoEstado: boolean) =>
    setLocalHuertas((hs) =>
      hs.map((h) => (h.id === id ? { ...h, is_active: nuevoEstado } : h))
    );

  return {
    huertas: localHuertas,
    loading,
    error,
    loaded,
    meta,
    page,
    setPage: (newPage: number) => dispatch(setPage(newPage)),
    addHuerta,
    editHuerta,
    removeHuerta,
    fetchHuertas: refetchHuertas,
    toggleActivoLocal,
  };
}
