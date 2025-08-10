/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchHuertas,
  createHuerta,
  updateHuerta,
  deleteHuerta,
  archiveHuerta,
  restoreHuerta,
  setHPage,
  setHEstado,
  setHFilters,
  HuertaFilters,
} from '../../../global/store/huertaSlice';
import { HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';
import { Estado } from '../types/shared';

export function useHuertas() {
  const dispatch = useAppDispatch();
  const { list: huertas, loading, error, meta, page, estado, filters } = useAppSelector((s) => s.huerta);

  useEffect(() => {
    dispatch(fetchHuertas({ page, estado, filters }));
  }, [dispatch, page, estado, filters]);

  const addHuerta    = (p: HuertaCreateData)            => dispatch(createHuerta(p)).unwrap();
  const editHuerta   = (id: number, p: HuertaUpdateData)=> dispatch(updateHuerta({ id, payload: p }));
  const removeHuerta = (id: number)                     => dispatch(deleteHuerta(id));
  const archive      = (id: number)                     => dispatch(archiveHuerta(id)).unwrap();
  const restore      = (id: number)                     => dispatch(restoreHuerta(id)).unwrap();
  const refetch      = ()                               => dispatch(fetchHuertas({ page, estado, filters }));

  const setPage      = (n: number)         => dispatch(setHPage(n));
  const setEstado    = (e: Estado)         => dispatch(setHEstado(e));
  const setFilters   = (f: HuertaFilters)  => dispatch(setHFilters(f));

  return { huertas, loading, error, meta, page, estado, filters, setPage, setEstado, setFilters, refetch, addHuerta, editHuerta, removeHuerta, archive, restore };
}
export default useHuertas;
