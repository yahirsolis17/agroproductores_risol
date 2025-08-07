/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  archiveCategoria,
  restoreCategoria,
  setCPage,
  setCSearch,
  toggleShowAll,
} from '../../../global/store/categoriaInversionSlice';
import type {
  CategoriaInversionCreate,
  CategoriaInversionUpdate,
} from '../types/categoriaInversionTypes';

export function useCategoriasInversion(showAll = false) {
  const dispatch = useAppDispatch();

  /* 🔑  nota: root reducer la registra como `categoriasInversion` */
  const {
    list,
    loading,
    error,
    meta,
    page,
    search,
    showAll: sliceShowAll,
  } = useAppSelector((s) => s.categoriasInversion);

  /* Sincronizar prop → slice */
  useEffect(() => {
    if (showAll !== sliceShowAll) dispatch(toggleShowAll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  /* Fetch */
  useEffect(() => {
    dispatch(fetchCategorias({ page, search, showAll }));
  }, [dispatch, page, search, showAll]);

  // CRUD
  const addCategoria    = (p: CategoriaInversionCreate) =>
    dispatch(createCategoria(p)).unwrap();

  const editCategoria   = (id: number, p: CategoriaInversionUpdate) =>
    dispatch(updateCategoria({ id, payload: p })).unwrap();

  const removeCategoria = (id: number) =>
    dispatch(deleteCategoria(id)).unwrap();

  // Archive / Restore
  const archive = (id: number) => dispatch(archiveCategoria(id)).unwrap();
  const restore = (id: number) => dispatch(restoreCategoria(id)).unwrap();

  // Helpers
  const setPage   = (n: number)  => dispatch(setCPage(n));
  const setSearch = (q?: string) => dispatch(setCSearch(q));
  const refetch   = ()            => dispatch(fetchCategorias({ page, search, showAll }));

  return {
    categorias: list,
    loading,
    error,
    meta,
    page,
    search,
    showAll,

    setPage,
    setSearch,
    toggleShowAll: () => dispatch(toggleShowAll()),

    addCategoria,
    editCategoria,
    removeCategoria,
    archive,
    restore,
    refetch,
  };
}

export default useCategoriasInversion;
