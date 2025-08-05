// src/modules/gestion_huerta/hooks/usePropietarios.ts
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
  propietarioService
} from '../services/propietarioService';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

export function usePropietarios() {
  const dispatch = useAppDispatch();

  const {
    list: propietarios,
    loading,
    error,
    page,
    estado,
    meta,
    filters
  } = useAppSelector((s) => s.propietarios);

  /* fetch automático al cambiar page/estado/filters */
  useEffect(() => {
    dispatch(fetchPropietarios({ page, estado, ...filters }));
  }, [dispatch, page, estado, filters]);

  /* ——— Nuevo método: sólo propietarios con huertas ——— */
  const getConHuertas = async (): Promise<Propietario[]> => {
    // Aquí pasamos '' para cumplir la firma getConHuertas(search: string, ...)
    const { propietarios: lista } = await propietarioService.getConHuertas('');
    return lista;
  };

  /* CRUD wrappers */
  const addPropietario = (v: PropietarioCreateData): Promise<Propietario> =>
    dispatch(createPropietario(v)).unwrap();

  const editPropietario = (id: number, v: PropietarioUpdateData): Promise<Propietario> =>
    dispatch(updatePropietario({ id, payload: v })).unwrap();

  const archivePropietario = (id: number): Promise<Propietario> =>
    dispatch(archivePropietarioThunk(id)).unwrap();

  const restorePropietario = (id: number): Promise<Propietario> =>
    dispatch(restorePropietarioThunk(id)).unwrap();

  const removePropietario = (id: number): Promise<number> =>
    dispatch(deletePropietario(id)).unwrap();

  const refetch = () =>
    dispatch(fetchPropietarios({ page, estado, ...filters }));

  /* API del hook */
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
    changeFilters:(f: Record<string, any>) => dispatch(setFiltersAction(f)),

    /* acciones */
    addPropietario,
    editPropietario,
    archivePropietario,
    restorePropietario,
    removePropietario,
    refetch,

    /* nuevo: sólo con huertas */
    getConHuertas,
  };
}
