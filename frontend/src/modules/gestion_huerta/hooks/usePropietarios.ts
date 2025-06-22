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
  setFilters as setFiltersAction,
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
    filters
  } = useAppSelector((s) => s.propietarios);

  // Log para ver el valor real de filters en cada render
  console.log('[Hook] Estado global obtenido:', { page, estado, filters });

  /* ---------- fetch automático al cambiar page/estado/filters ---------- */
  useEffect(() => {
    const fetchObj = { page, estado, ...filters };
    console.log("[Hook] useEffect ejecutado. fetchObj:", fetchObj);
    dispatch(fetchPropietarios(fetchObj));
  }, [dispatch, page, estado, filters]);
  /* ---------- CRUD wrappers ---------- */
  const addPropietario = (v: PropietarioCreateData): Promise<Propietario> => {
    console.log('[Hook] addPropietario:', v);
    return dispatch(createPropietario(v)).unwrap();
  };
  const refetch = () => {
    const fetchObj = { page, estado, ...filters };
    console.log('[Hook] refetch:', fetchObj);
    return dispatch(fetchPropietarios(fetchObj));
  };
  const editPropietario = (
    id: number,
    v: PropietarioUpdateData
  ): Promise<Propietario> => {
    console.log('[Hook] editPropietario:', { id, v });
    return dispatch(updatePropietario({ id, payload: v })).unwrap();
  };
  const doArchivePropietario = (id: number): Promise<Propietario> => {
    console.log('[Hook] archivePropietario:', id);
    return dispatch(archivePropietarioThunk(id)).unwrap();
  };
  const doRestorePropietario = (id: number): Promise<Propietario> => {
    console.log('[Hook] restorePropietario:', id);
    return dispatch(restorePropietarioThunk(id)).unwrap();
  };
  const removePropietario = (id: number): Promise<number> => {
    console.log('[Hook] removePropietario:', id);
    return dispatch(deletePropietario(id)).unwrap();
  };

  
  /* ---------- API del hook ---------- */
  return {
    propietarios,
    loading,
    error,
    page,
    estado,
    meta,
    filters,
    /* navegación */
    changePage:   (p: number)           => dispatch(setPage(p)),
    changeEstado: (e: Estado)           => dispatch(setEstado(e)),
    changeFilters: (f: Record<string, any>) => {
      console.log('[Hook] changeFilters despachando setFilters:', f);
      dispatch(setFiltersAction({ ...f }));
    },
    /* acciones */
    addPropietario,
    editPropietario,
    archivePropietario: doArchivePropietario,
    restorePropietario: doRestorePropietario,
    removePropietario,
    refetch,
  };
}
