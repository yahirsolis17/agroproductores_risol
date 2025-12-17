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
  setBodega,
  setTemporada,
  setSemana,
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

  // filtros mínimos (contexto, semana y paginación)
  const actions = {
    setBodega: (v?: number) => dispatch(setBodega(v)),
    setTemporada: (v?: number) => dispatch(setTemporada(v)),
    setSemana: (v?: number) => dispatch(setSemana(v)),
    setPage: (v: number) => dispatch(setPage(v)),
    setPageSize: (v: number) => dispatch(setPageSize(v)),
  };

  // Helper opcional: sincroniza filtros desde el Tablero y (opcional) hace refetch
  const syncFromTablero = useCallback(
    (params: { bodegaId?: number; temporadaId?: number; semanaId?: number; refetchNow?: boolean }) => {
      let resetPage = false;
      if (typeof params.bodegaId !== 'undefined') dispatch(setBodega(params.bodegaId));
      if (typeof params.bodegaId !== 'undefined') resetPage = true;
      if (typeof params.temporadaId !== 'undefined') dispatch(setTemporada(params.temporadaId));
      if (typeof params.temporadaId !== 'undefined') resetPage = true;
      if (typeof params.semanaId !== 'undefined') dispatch(setSemana(params.semanaId));
      if (typeof params.semanaId !== 'undefined') resetPage = true;
      if (resetPage) dispatch(setPage(1));
      if (params?.refetchNow) void dispatch(fetchCapturas());
    },
    [dispatch]
  );

  return {
    items,
    meta,
    filters,
    loading,
    saving,

    refetch,
    create,
    update,
    archivar,
    restaurar,
    remove,

    ...actions,
    syncFromTablero,

    get canOperate() {
      if (!filters?.bodega || !filters?.temporada) return false;
      if (meta?.temporada_finalizada) return false;
      if (meta?.semana_cerrada) return false;
      return true;
    },

    get reasonDisabled() {
      if (!filters?.bodega || !filters?.temporada) return 'Selecciona bodega y temporada.';
      if (meta?.temporada_finalizada) return 'La temporada está finalizada.';
      if (meta?.semana_cerrada) return 'La semana está cerrada.';
      return '';
    },
  };
}
