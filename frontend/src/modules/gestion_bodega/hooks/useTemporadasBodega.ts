/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchTemporadasBodega,
  addTemporadaBodega,
  editTemporadaBodega,
  archiveTemporada,
  restoreTemporada,
  finalizeTemporada,
  setFilters,
  setPage,
  setPageSize,
  setOrdering,
  setBodegaFilter,
  setYearFilter,
  setEstado,
  setCurrentTemporada,
} from "../../../global/store/temporadabodegaSlice";

import {
  selectTemporadas,
  selectTemporadasMeta,
  selectTemporadaOps,
  selectTemporadasFilters,
  selectTemporadasError,
  selectTemporadaCurrent,
} from "../../../global/store/temporadabodegaSlice";

import type {
  TemporadaBodegaCreateData,
  TemporadaBodegaUpdateData,
  EstadoTemporadaBodega,
  TemporadaBodega,
} from "../types/temporadaBodegaTypes";

type Options = { autoFetch?: boolean };

export default function useTemporadasBodega(opts: Options = { autoFetch: true }) {
  const dispatch = useDispatch();

  const items   = useSelector(selectTemporadas);
  const meta    = useSelector(selectTemporadasMeta);
  const ops     = useSelector(selectTemporadaOps);
  const filters = useSelector(selectTemporadasFilters);
  const error   = useSelector(selectTemporadasError);
  const current = useSelector(selectTemporadaCurrent);

  // Listado
  const reload = useCallback(
    (override?: Partial<typeof filters>) => {
      const merged = { ...filters, ...(override ?? {}) };
      dispatch(setFilters(override ?? {}));
      dispatch(fetchTemporadasBodega(merged) as any);
    },
    [dispatch, filters]
  );

  useEffect(() => {
    if (!opts.autoFetch) return;
    dispatch(fetchTemporadasBodega(filters) as any);
  }, [
    dispatch,
    opts.autoFetch,
    filters.page,
    filters.page_size,
    filters.ordering,
    filters.estado,
    filters.bodegaId,
    filters.year,
    filters.finalizada,
  ]);

  // CRUD
  const create = useCallback(
    async (payload: TemporadaBodegaCreateData & { bodegaId: number }) => {
      const res = await dispatch(addTemporadaBodega(payload) as any);
      dispatch(fetchTemporadasBodega(filters) as any);
      return res;
    },
    [dispatch, filters]
  );

  const update = useCallback(
    async (id: number, payload: TemporadaBodegaUpdateData) => {
      const res = await dispatch(editTemporadaBodega({ id, data: payload }) as any);
      dispatch(fetchTemporadasBodega(filters) as any);
      return res;
    },
    [dispatch, filters]
  );

  const archive = useCallback(
    async (id: number) => {
      const res = await dispatch(archiveTemporada(id) as any);
      dispatch(fetchTemporadasBodega(filters) as any);
      return res;
    },
    [dispatch, filters]
  );

  const restore = useCallback(
    async (id: number) => {
      const res = await dispatch(restoreTemporada(id) as any);
      dispatch(fetchTemporadasBodega(filters) as any);
      return res;
    },
    [dispatch, filters]
  );

  const toggleFinalize = useCallback(
    async (id: number) => {
      const res = await dispatch(finalizeTemporada(id) as any);
      dispatch(fetchTemporadasBodega(filters) as any);
      return res;
    },
    [dispatch, filters]
  );

  // Filtros / estado UI
  const setPageSafe      = useCallback((page: number) => dispatch(setPage(page)), [dispatch]);
  const setPageSizeSafe  = useCallback((size: number) => dispatch(setPageSize(size)), [dispatch]);
  const setOrderingSafe  = useCallback((ord?: string) => dispatch(setOrdering(ord)), [dispatch]);
  const setBodegaSafe    = useCallback((id?: number) => dispatch(setBodegaFilter(id)), [dispatch]);
  const setYearSafe      = useCallback((year?: number) => dispatch(setYearFilter(year)), [dispatch]);
  const setEstadoSafe    = useCallback((e: EstadoTemporadaBodega) => dispatch(setEstado(e)), [dispatch]);
  const setCurrent       = useCallback((t: TemporadaBodega | null) => dispatch(setCurrentTemporada(t)), [dispatch]);

  return {
    // data
    items,
    meta,
    error,
    current,
    ops,
    filters,

    // loaders
    isLoading:    ops.listing,
    isCreating:   ops.creating,
    isUpdating:   ops.updating,
    isArchiving:  ops.archiving,
    isRestoring:  ops.restoring,
    isFinalizing: ops.finalizing,

    // actions
    reload,
    create,
    update,
    archive,
    restore,
    toggleFinalize,

    // filters
    setPage:     setPageSafe,
    setPageSize: setPageSizeSafe,
    setOrdering: setOrderingSafe,
    setBodega:   setBodegaSafe,
    setYear:     setYearSafe,
    setEstado:   setEstadoSafe,
    setCurrent,
  };
}
