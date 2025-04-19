import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchPropietarios,
  createPropietario,
  updatePropietario,
  deletePropietario,
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

  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchPropietarios(page));
    }
  }, [dispatch, loaded, loading, page]);

  const addPropietario = (payload: PropietarioCreateData) =>
    dispatch(createPropietario(payload)).unwrap();

  const editPropietario = (id: number, payload: PropietarioUpdateData) =>
    dispatch(updatePropietario({ id, payload }));

  const removePropietario = (id: number) =>
    dispatch(deletePropietario(id));

  const fetchPropietariosReload = () => dispatch(fetchPropietarios(page));

  return {
    propietarios: list,
    loading,
    error,
    loaded,
    page,
    meta,
    setPage: (newPage: number) => dispatch(setPage(newPage)),
    addPropietario,
    editPropietario,
    removePropietario,
    fetchPropietarios: fetchPropietariosReload,
  };
}
