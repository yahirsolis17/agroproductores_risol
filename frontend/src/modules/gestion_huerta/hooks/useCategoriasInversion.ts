// src/modules/gestion_huerta/hooks/useCategoriasInversion.ts
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchCategorias,
  createCategoria,
  updateCategoria,
  archiveCategoria,
  restoreCategoria,
  deleteCategoria,
  setPage,
} from '../../../global/store/categoriaInversionSlice';
import {
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../types/categoriaInversionTypes';

export function useCategoriasInversion() {
  const dispatch = useAppDispatch();
  const {
    list: categorias,
    loading,
    error,
    page,
    meta,
  } = useAppSelector((s) => s.categoriasInversion);

  // Fetch on mount + when page changes
  useEffect(() => {
    dispatch(fetchCategorias(page));
  }, [dispatch, page]);

  const refetch = () => dispatch(fetchCategorias(page));

  // Pagination
  const changePage = (p: number) => dispatch(setPage(p));

  // CRUD actions
  const addCategoria = (data: CategoriaInversionCreateData) =>
    dispatch(createCategoria(data)).unwrap();

  const editCategoria = (id: number, data: CategoriaInversionUpdateData) =>
    dispatch(updateCategoria({ id, payload: data })).unwrap();

  const removeCategoria = (id: number) =>
    dispatch(deleteCategoria(id)).unwrap();

  const archive = (id: number) =>
    dispatch(archiveCategoria(id)).unwrap();

  const restore = (id: number) =>
    dispatch(restoreCategoria(id)).unwrap();

  return {
    categorias,
    loading,
    error,
    page,
    meta,
    // navigation
    changePage,
    refetch,
    // CRUD
    addCategoria,
    editCategoria,
    removeCategoria,
    archive,
    restore,
  };
}

export default useCategoriasInversion;
