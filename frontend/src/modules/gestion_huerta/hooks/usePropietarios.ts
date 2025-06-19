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
  setEstado,
} from '../../../global/store/propietariosSlice';
import {
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

export function usePropietarios() {
  const dispatch = useAppDispatch();

  const {
    list: propietarios,
    loading,
    error,
    loaded,
    page,
    meta,
    estado,
  } = useAppSelector((s) => s.propietarios);

  /* ---------- side-effects ---------- */
  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchPropietarios({ page, estado }));
    }
  }, [dispatch, loaded, loading, page, estado]);

  /* ---------- CRUD wrappers ---------- */
  const addPropietario      = (p: PropietarioCreateData)            => dispatch(createPropietario(p)).unwrap();
  const editPropietario     = (id: number, p: PropietarioUpdateData) => dispatch(updatePropietario({ id, payload: p }));
  const removePropietario   = (id: number)                           => dispatch(deletePropietario(id)).unwrap();
  const archivarPropietario = (id: number)                           => dispatch(archivePropietario(id)).unwrap();
  const restaurarPropietario= (id: number)                           => dispatch(restorePropietario(id)).unwrap();

  const refetch = () => dispatch(fetchPropietarios({ page, estado }));

  return {
    propietarios,
    loading,
    error,
    meta,
    page,
    estado,
    setPage:   (p: number)                          => dispatch(setPage(p)),
    setEstado: (e: 'activos' | 'archivados' | 'todos') => dispatch(setEstado(e)),
    addPropietario,
    editPropietario,
    removePropietario,
    archivarPropietario,
    restaurarPropietario,
    fetchPropietarios: refetch,
  };
}
