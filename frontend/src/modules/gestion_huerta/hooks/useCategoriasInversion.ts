// src/modules/gestion_huerta/hooks/useCategoriasInversion.ts
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchCategoriasInversion,
  createCategoriaInversion
  // etc...
} from '../../../global/store/categoriaInversionSlice';
import { useEffect } from 'react';

export function useCategoriasInversion() {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector(state => state.categoriasInversion);

  useEffect(() => {
    // si quieres auto-cargar
    if (!list.length) {
      dispatch(fetchCategoriasInversion());
    }
  }, [dispatch, list.length]);

  const addCategoriaInversion = (payload: { nombre: string }) => dispatch(createCategoriaInversion(payload));
  // etc.

  return {
    categorias: list,
    loading,
    error,
    fetchCategorias: () => dispatch(fetchCategoriasInversion()),
    addCategoriaInversion,
  };
}
