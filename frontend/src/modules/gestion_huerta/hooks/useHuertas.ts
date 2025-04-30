// src/modules/gestion_huerta/hooks/useHuertas.ts
import { useEffect, useState } from 'react';
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

/**
 * Hook centralizado para la gestión de huertas.
 *   – Mantiene una copia local ("localHuertas") que se sincroniza con el slice
 *     pero que podemos modificar optimistamente sin que la UI parpadee.
 *   – Devuelve helpers CRUD + toggleActivoLocal() para archivar/restaurar
 *     de forma instantánea.
 */
export function useHuertas() {
  const dispatch = useAppDispatch();

  /* ───────────────────────────── slice ─────────────────────────────── */
  const {
    list: globalHuertas,
    loading,
    error,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.huerta);

  /* ─────────────── copia local reactiva para updates rápidos ────────── */
  const [localHuertas, setLocalHuertas] = useState<Huerta[]>([]);

  // 1) cuando el slice cambia → actualizamos la copia local
  useEffect(() => {
    setLocalHuertas(globalHuertas);
  }, [globalHuertas]);

  // 2) carga inicial (si aún no se cargó)
  useEffect(() => {
    if (!loaded && !loading) dispatch(fetchHuertas(page));
  }, [dispatch, loaded, loading, page]);

  /* ───────────────────────────── acciones ───────────────────────────── */
  const addHuerta = (payload: HuertaCreateData): Promise<Huerta> =>
    dispatch(createHuerta(payload)).unwrap();

  const editHuerta = (id: number, payload: HuertaUpdateData) =>
    dispatch(updateHuerta({ id, payload }));

  const removeHuerta = (id: number) => dispatch(deleteHuerta(id));

  const refetchHuertas = () => dispatch(fetchHuertas(page));

  /**
   * Cambia el flag `is_active` de la huerta localmente para “responder” al
   * usuario al instante.  Si luego el server falla, el caller podrá revertir.
   */
  const toggleActivoLocal = (id: number, nuevoEstado: boolean) =>
    setLocalHuertas((hs) =>
      hs.map((h) => (h.id === id ? { ...h, is_active: nuevoEstado } : h))
    );

  /* ───────────────────────────── return ─────────────────────────────── */
  return {
    /* datos */
    huertas: localHuertas,
    loading,
    error,
    loaded,
    meta,
    page,

    /* setters / helpers */
    setPage: (newPage: number) => dispatch(setPage(newPage)),
    addHuerta,
    editHuerta,
    removeHuerta,
    fetchHuertas: refetchHuertas,

    /* optimista */
    toggleActivoLocal,
  };
}
