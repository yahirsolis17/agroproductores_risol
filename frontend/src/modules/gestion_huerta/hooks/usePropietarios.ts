// src/modules/gestion_huerta/hooks/usePropietarios.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchPropietarios,
  createPropietario,
  updatePropietario,
  deletePropietario,
} from '../../../global/store/propietariosSlice';
import {
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

export function usePropietarios() {
  const dispatch = useAppDispatch();
  const { list, loading, error, loaded } = useAppSelector((state) => state.propietarios);

  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchPropietarios());
    }
  }, [dispatch, loaded, loading]);

  const addPropietario = (payload: PropietarioCreateData) =>
    dispatch(createPropietario(payload)).unwrap();

  const editPropietario = (id: number, payload: PropietarioUpdateData) =>
    dispatch(updatePropietario({ id, payload }));

  const removePropietario = (id: number) => dispatch(deletePropietario(id));

  const reloadPropietarios = () => dispatch(fetchPropietarios());

  return {
    propietarios: list,
    loading,
    error,
    loaded,
    addPropietario,
    editPropietario,
    removePropietario,
    fetchPropietarios: reloadPropietarios,
  };
}
