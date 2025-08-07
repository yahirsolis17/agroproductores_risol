/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchCategoriasInversion,
  createCategoriaInversion,
  updateCategoriaInversion,
  deleteCategoriaInversion,
  setCPage,
  setCSearch,
} from '../../../global/store/categoriaInversionSlice';
import { categoriaInversionService } from '../services/categoriaInversionService';
import type {
  CategoriaInversionCreate,
  CategoriaInversionUpdate,
} from '../types/categoriaInversionTypes';

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

export function useCategoriasInversion() {
  const dispatch = useAppDispatch();
  const { list, loading, error, meta, page, search } = useAppSelector((s) => s.categoriasInversion);

  useEffect(() => {
    dispatch(fetchCategoriasInversion({ page, search }));
  }, [dispatch, page, search]);

  // CRUD (via slice)
  const createCategoria = (payload: CategoriaInversionCreate) =>
    dispatch(createCategoriaInversion(payload)).unwrap();

  const updateCategoria = (id: number, payload: CategoriaInversionUpdate) =>
    dispatch(updateCategoriaInversion({ id, payload })).unwrap();

  const removeCategoria = (id: number) =>
    dispatch(deleteCategoriaInversion(id)).unwrap();

  // Archive/Restore (via service) + refetch
  const archiveCategoria = async (id: number) => {
    await categoriaInversionService.archivar(id);
    await dispatch(fetchCategoriasInversion({ page, search }));
  };

  const restoreCategoria = async (id: number) => {
    await categoriaInversionService.restaurar(id);
    await dispatch(fetchCategoriasInversion({ page, search }));
  };

  // Helpers/aliases
  const setPage = (n: number) => dispatch(setCPage(n));
  const setSearch = (q: string | undefined) => dispatch(setCSearch(q));
  const refetch = () => dispatch(fetchCategoriasInversion({ page, search }));

  // Aliases para compatibilidad con llamadas existentes en la página
  const addCategoria = createCategoria;
  const editCategoria = updateCategoria;

  return {
    categorias: list,
    loading,
    error,
    meta: meta as PaginationMeta,
    page,
    search,

    setPage,
    setSearch,
    refetch,

    // nombres principales
    createCategoria,
    updateCategoria,
    removeCategoria,
    archiveCategoria,
    restoreCategoria,

    // aliases (compat)
    addCategoria,
    editCategoria,
  };
}

export default useCategoriasInversion;
