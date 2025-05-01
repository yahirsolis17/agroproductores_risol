// src/modules/gestion_huerta/hooks/usePropietarios.ts
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchPropietarios,
  createPropietario,
  updatePropietario,
  deletePropietario,
  archivePropietario,
  restorePropietario,
  setPage,
} from '../../../global/store/propietariosSlice';
import {
  PropietarioCreateData,
  PropietarioUpdateData,
  Propietario,
} from '../types/propietarioTypes';

export function usePropietarios() {
  const dispatch = useAppDispatch();
  const location = useLocation();

  const {
    list: globalPropietarios,
    loading,
    error,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.propietarios);

  const [localPropietarios, setLocalPropietarios] = useState<Propietario[]>([]);
  const [lastPath, setLastPath] = useState<string>('');

  // 1) sincronizar lista global → copia local
  useEffect(() => {
    setLocalPropietarios(globalPropietarios);
  }, [globalPropietarios]);

  // 2) recarga si entramos a /propietarios desde otra vista
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.includes('/propietarios') && lastPath !== currentPath) {
      dispatch(fetchPropietarios(page));
    }
    setLastPath(currentPath);
  }, [location.pathname]);

  // 3) carga inicial
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchPropietarios(page));
    }
  }, [dispatch, loaded, loading, page]);

  // acciones
  const addPropietario = (p: PropietarioCreateData) =>
    dispatch(createPropietario(p)).unwrap();

  const editPropietario = (id: number, p: PropietarioUpdateData) =>
    dispatch(updatePropietario({ id, payload: p }));

  const removePropietario = (id: number) =>
    dispatch(deletePropietario(id)).unwrap();

  const archivarPropietario = (id: number) =>
    dispatch(archivePropietario(id)).unwrap();

  const restaurarPropietario = (id: number) =>
    dispatch(restorePropietario(id)).unwrap();

  const refetch = () => dispatch(fetchPropietarios(page));

  // cambio local instantáneo para UI
  const toggleActivoLocal = (id: number, nuevoEstado: boolean) =>
    setLocalPropietarios((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, archivado_en: nuevoEstado ? new Date().toISOString() : null } : p
      )
    );

  return {
    propietarios: localPropietarios,
    loading,
    error,
    loaded,
    meta,
    page,
    setPage: (p: number) => dispatch(setPage(p)),
    addPropietario,
    editPropietario,
    removePropietario,
    archivarPropietario,
    restaurarPropietario,
    fetchPropietarios: refetch,
    toggleActivoLocal, // ← por si lo necesitas después
  };
}
