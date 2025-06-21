/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchPropietarios,
  setPage,
  setEstado,
  createPropietario,
  updatePropietario,
  archivePropietario as archivePropietarioThunk,
  restorePropietario as restorePropietarioThunk,
  deletePropietario,
  Estado,
} from '../../../global/store/propietariosSlice';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

export function usePropietarios() {
  const dispatch = useAppDispatch();

  /* ---------- estado global ---------- */
  const {
    list: propietarios,
    loading,
    error,
    page,
    estado,
    meta,
  } = useAppSelector((s) => s.propietarios);

  /* ---------- fetch automático al cambiar page/estado ---------- */
  useEffect(() => {
    dispatch(fetchPropietarios({ page, estado }));
  }, [dispatch, page, estado]);

  /* ---------- CRUD wrappers ---------- */
  const addPropietario = (v: PropietarioCreateData): Promise<Propietario> =>
    dispatch(createPropietario(v)).unwrap();
const refetch = () => dispatch(fetchPropietarios({ page, estado }));

  const editPropietario = (
    id: number,
    v: PropietarioUpdateData
  ): Promise<Propietario> =>
    dispatch(updatePropietario({ id, payload: v })).unwrap();

  /** archiva y devuelve el objeto archivado */
  const doArchivePropietario = (id: number): Promise<Propietario> =>
    dispatch(archivePropietarioThunk(id)).unwrap();

  /** restaura y devuelve el objeto restaurado */
  const doRestorePropietario = (id: number): Promise<Propietario> =>
    dispatch(restorePropietarioThunk(id)).unwrap();

  /** elimina y devuelve el id eliminado */
  const removePropietario = (id: number): Promise<number> =>
    dispatch(deletePropietario(id)).unwrap();

  /* ---------- API del hook ---------- */
  return {
    propietarios,
    loading,
    error,
    page,
    estado,
    meta,

    /* navegación */
    changePage:   (p: number)           => dispatch(setPage(p)),
    changeEstado: (e: Estado)           => dispatch(setEstado(e)),

    /* acciones */
    addPropietario,
    editPropietario,
    archivePropietario: doArchivePropietario,
    restorePropietario: doRestorePropietario,
    removePropietario,
    refetch,
  };
}
