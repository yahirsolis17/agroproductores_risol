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
  setSemana,      // 👈 nuevo
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
    setSemana: (v?: number) => dispatch(setSemana(v)),     // 👈 nuevo
    setPage: (v: number) => dispatch(setPage(v)),
    setPageSize: (v: number) => dispatch(setPageSize(v)),
  };

  // Helper opcional: sincroniza filtros desde el Tablero y (opcional) hace refetch
  const syncFromTablero = useCallback(
    (params: { bodegaId?: number; temporadaId?: number; semanaId?: number; refetchNow?: boolean }) => {
      if (typeof params.bodegaId !== 'undefined') dispatch(setBodega(params.bodegaId));
      if (typeof params.temporadaId !== 'undefined') dispatch(setTemporada(params.temporadaId));
      if (typeof params.semanaId !== 'undefined') dispatch(setSemana(params.semanaId));
      if (params?.refetchNow) void dispatch(fetchCapturas());
    },
    [dispatch]
  );

  return {
    items, meta, filters, loading, saving,
    refetch,
    create, update, archivar, restaurar, remove,
    ...actions,
    syncFromTablero, // 👈 para integrarlo en TableroBodegaPage
    get canOperate() {
      // Mantiene la regla actual: requiere bodega y temporada.
      // La semana filtra la vista, pero no es obligatoria para operar (el backend bloquea por cierre).
      return Boolean(filters?.bodega && filters?.temporada);
    },
    get reasonDisabled() {
      if (!filters?.bodega || !filters?.temporada) return 'Selecciona bodega y temporada.';
      return '';
    },
  };
}
