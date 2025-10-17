import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCapturas,
  createCapturaThunk,
  updateCapturaThunk,
  archivarCapturaThunk,
  restaurarCapturaThunk,
  deleteCapturaThunk,
  selectCapturas,
  selectCapturasMeta,
  selectCapturasFilters,
  selectCapturasLoading,
  selectCapturasSaving,
  setEstado,
  setSearch,
  setBodega,
  setTemporada,
  setTipoMango,
  setDateRange,
  setOrdering,
  setPage,
  setPageSize,
} from '../../../global/store/capturasSlice';
import type { CapturaCreatePayload, CapturaUpdatePayload } from '../types/capturasTypes';
import type { AppDispatch } from '../../../global/store/store';

export default function useCapturas() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector(selectCapturas);
  const meta = useSelector(selectCapturasMeta);
  const filters = useSelector(selectCapturasFilters);
  const loading = useSelector(selectCapturasLoading);
  const saving = useSelector(selectCapturasSaving);

  // fetch
  const refetch = useCallback(() => dispatch(fetchCapturas()).unwrap(), [dispatch]);

  // CRUD
  const create = useCallback(
    (payload: CapturaCreatePayload) => dispatch(createCapturaThunk(payload)).unwrap(),
    [dispatch]
  );

  const update = useCallback(
    (id: number, data: CapturaUpdatePayload) => dispatch(updateCapturaThunk({ id, data })).unwrap(),
    [dispatch]
  );

  const archivar = useCallback(
    (id: number) => dispatch(archivarCapturaThunk({ id })).unwrap(),
    [dispatch]
  );

  const restaurar = useCallback(
    (id: number) => dispatch(restaurarCapturaThunk({ id })).unwrap(),
    [dispatch]
  );

  const remove = useCallback(
    (id: number) => dispatch(deleteCapturaThunk({ id })).unwrap(),
    [dispatch]
  );

  // filtros
  const actions = {
    setEstado: (v: 'activas'|'archivadas'|'todas') => dispatch(setEstado(v)),
    setSearch: (v: string) => dispatch(setSearch(v)),
    setBodega: (v?: number) => dispatch(setBodega(v)),
    setTemporada: (v?: number) => dispatch(setTemporada(v)),
    setTipoMango: (v?: string) => dispatch(setTipoMango(v)),
    setDateRange: (desde?: string, hasta?: string) => dispatch(setDateRange({ desde, hasta })),
    setOrdering: (v: string) => dispatch(setOrdering(v)),
    setPage: (v: number) => dispatch(setPage(v)),
    setPageSize: (v: number) => dispatch(setPageSize(v)),
  };

  return {
    items, meta, filters, loading, saving,
    refetch,
    create, update, archivar, restaurar, remove,
    ...actions,
    get canOperate() {
      const ctx = Boolean(filters?.bodega && filters?.temporada);
      const semanaCerrada = Boolean((meta as any)?.semana_cerrada);
      const temporadaFinalizada = Boolean((meta as any)?.temporada_finalizada);
      return ctx && !semanaCerrada && !temporadaFinalizada;
    },
    get reasonDisabled() {
      if (!filters?.bodega || !filters?.temporada) return 'Selecciona bodega y temporada.';
      if ((meta as any)?.semana_cerrada) return 'Semana cerrada.';
      if ((meta as any)?.temporada_finalizada) return 'Temporada finalizada.';
      return '';
    },
  };
}
