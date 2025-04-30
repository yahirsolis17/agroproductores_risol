// modules/gestion_huerta/hooks/usePropietarios.ts
import { useEffect } from 'react';
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
} from '../types/propietarioTypes';

export function usePropietarios() {
  const dispatch = useAppDispatch();

  const {
    list,
    loading,
    error,
    loaded,
    page,
    meta,
  } = useAppSelector((state) => state.propietarios);

  /* ---------- primera carga ---------- */
  useEffect(() => {
    if (!loaded && !loading) dispatch(fetchPropietarios(page));
  }, [dispatch, loaded, loading, page]);

  /* ---------- acciones ---------- */
  const addPropietario       = (p: PropietarioCreateData) => dispatch(createPropietario(p)).unwrap();
  const editPropietario      = (id: number, p: PropietarioUpdateData) => dispatch(updatePropietario({ id, payload: p }));
  const removePropietario    = (id: number) => dispatch(deletePropietario(id)).unwrap();
  const archivarPropietario  = (id: number) => dispatch(archivePropietario(id)).unwrap();
  const restaurarPropietario = (id: number) => dispatch(restorePropietario(id)).unwrap();
  const refetch              = () => dispatch(fetchPropietarios(page));

  return {
    propietarios: list,
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
  };
}
