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

export default function useCategoriasInversion() {
  const dispatch = useAppDispatch();
  const {
    list,
    loading,
    loaded,
    error,
    page,
    meta,
  } = useAppSelector(s => s.categoriasInversion);

  /* ——— carga inicial + cambios de página ——— */
  useEffect(() => { dispatch(fetchCategorias(page)); }, [dispatch, page]);

  /* helpers */
  const refetch    = () => dispatch(fetchCategorias(page));
  const changePage = (p: number) => dispatch(setPage(p));

  const addCategoria   = (d: CategoriaInversionCreateData) =>
    dispatch(createCategoria(d)).unwrap();
  const editCategoria  = (id:number,d:CategoriaInversionUpdateData)=>
    dispatch(updateCategoria({ id,payload:d })).unwrap();
  const archive        = (id:number)=>dispatch(archiveCategoria(id)).unwrap();
  const restore        = (id:number)=>dispatch(restoreCategoria(id)).unwrap();
  const removeCategoria= (id:number)=>dispatch(deleteCategoria(id)).unwrap();

  /* ——— siempre devolvemos un ARRAY, nunca undefined ——— */
  return {
    categorias: list ?? [],
    loading,
    loaded,
    error,
    page,
    meta,
    changePage,
    refetch,
    addCategoria,
    editCategoria,
    archive,
    restore,
    removeCategoria,
  };
}
