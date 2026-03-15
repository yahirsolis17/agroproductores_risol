import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchComprasMadera,
  fetchConsumibles,
  createConsumibleThunk,
  updateConsumibleThunk,
  createCompraMaderaThunk,
  updateCompraMaderaThunk,
  createAbonoMaderaThunk,
  setBodega,
  setTemporada,
  setSemana,
  setPage,
  setPageSize,
} from '../../../global/store/gastosSlice';

export function useGastos() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.gastos);
  const { comprasMadera, consumibles, filters, saving } = state;

  const refetchCompras = useCallback(() => dispatch(fetchComprasMadera()), [dispatch]);
  const refetchConsumibles = useCallback(() => dispatch(fetchConsumibles()), [dispatch]);

  const createConsumible = useCallback((payload: any) => dispatch(createConsumibleThunk(payload)).unwrap(), [dispatch]);
  const updateConsumible = useCallback((id: number, data: any) => dispatch(updateConsumibleThunk({ id, data })).unwrap(), [dispatch]);
  
  const createCompra = useCallback((payload: any) => dispatch(createCompraMaderaThunk(payload)).unwrap(), [dispatch]);
  const updateCompra = useCallback((id: number, data: any) => dispatch(updateCompraMaderaThunk({ id, data })).unwrap(), [dispatch]);
  const createAbono = useCallback((id: number, payload: any) => dispatch(createAbonoMaderaThunk({ id, payload })).unwrap(), [dispatch]);

  const actions = {
    setBodega: (v?: number) => dispatch(setBodega(v)),
    setTemporada: (v?: number) => dispatch(setTemporada(v)),
    setSemana: (v?: number) => dispatch(setSemana(v)),
    setPage: (v: number) => dispatch(setPage(v)),
    setPageSize: (v: number) => dispatch(setPageSize(v)),
  };

  const syncFromTablero = useCallback(
    (params: { bodegaId?: number; temporadaId?: number; semanaId?: number }) => {
      let changed = false;
      if (typeof params.bodegaId !== 'undefined') { dispatch(setBodega(params.bodegaId)); changed = true; }
      if (typeof params.temporadaId !== 'undefined') { dispatch(setTemporada(params.temporadaId)); changed = true; }
      if (typeof params.semanaId !== 'undefined') { dispatch(setSemana(params.semanaId)); changed = true; }
      if (changed) dispatch(setPage(1));
    },
    [dispatch]
  );

  return {
    comprasMadera,
    consumibles,
    filters,
    saving,
    
    refetchCompras,
    refetchConsumibles,
    
    createConsumible,
    updateConsumible,
    createCompra,
    updateCompra,
    createAbono,
    
    syncFromTablero,
    ...actions,
  };
}
