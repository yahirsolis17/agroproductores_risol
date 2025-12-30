// frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts
import { useCallback, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../global/store/store";

import {
  fetchEmpaques,
  fetchEmpaqueById,
  createEmpaque,
  updateEmpaque,
  archivarEmpaque,
  bulkUpsertEmpaques,
  setEmpaquesFilters,
  clearEmpaquesError,
  clearEmpaquesCurrent,
  clearEmpaquesBulkState,
  selectEmpaques,
  selectEmpaquesMeta,
  selectEmpaquesFilters,
  selectEmpaquesStatus,
  selectEmpaquesSaving,
  selectEmpaquesError,
  selectEmpaquesBulkSaving,
  selectEmpaquesBulkError,
  selectEmpaquesLastBulkSummary,
  type EmpaquesQueryParams,
} from "../../../global/store/empaquesSlice";

import type {
  EmpaquesFilters,
  EmpaqueCreateDTO,
  EmpaqueUpdateDTO,
  EmpaqueBulkUpsertDTO,
} from "../types/empaquesTypes";

export function useEmpaques(autoFetch: boolean = true) {
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectEmpaques);
  const meta = useAppSelector(selectEmpaquesMeta);
  const filters = useAppSelector(selectEmpaquesFilters);
  const status = useAppSelector(selectEmpaquesStatus);
  const saving = useAppSelector(selectEmpaquesSaving);
  const error = useAppSelector(selectEmpaquesError);

  const bulkSaving = useAppSelector(selectEmpaquesBulkSaving);
  const bulkError = useAppSelector(selectEmpaquesBulkError);
  const lastBulkSummary = useAppSelector(selectEmpaquesLastBulkSummary);

  // Para evitar efectos raros por referencia de objeto
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    if (!autoFetch) return;
    dispatch(fetchEmpaques(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, dispatch, filtersKey]);

  const refetch = useCallback(
    (override?: EmpaquesQueryParams) => {
      // Mantiene filtros base del slice y permite overrides tipados (recepcion/bodega/temporada/ordering/etc)
      const next: EmpaquesQueryParams = { ...(filters as EmpaquesQueryParams), ...(override ?? {}) };
      dispatch(fetchEmpaques(next));
    },
    [dispatch, filters]
  );

  const setFilters = useCallback(
    (patch: EmpaquesFilters) => {
      dispatch(setEmpaquesFilters(patch));
    },
    [dispatch]
  );

  const getById = useCallback((id: number) => dispatch(fetchEmpaqueById(id)), [dispatch]);

  const add = useCallback((dto: EmpaqueCreateDTO) => dispatch(createEmpaque(dto)), [dispatch]);

  const edit = useCallback(
    (id: number, dto: EmpaqueUpdateDTO) => dispatch(updateEmpaque({ id, dto })),
    [dispatch]
  );

  const archive = useCallback((id: number) => dispatch(archivarEmpaque(id)), [dispatch]);

  const bulkUpsert = useCallback((dto: EmpaqueBulkUpsertDTO) => dispatch(bulkUpsertEmpaques(dto)), [dispatch]);

  const clearError = useCallback(() => dispatch(clearEmpaquesError()), [dispatch]);
  const clearCurrent = useCallback(() => dispatch(clearEmpaquesCurrent()), [dispatch]);
  const clearBulk = useCallback(() => dispatch(clearEmpaquesBulkState()), [dispatch]);

  return {
    // data
    empaques: items,
    meta,
    filters,

    // status
    status,
    saving,
    error,

    bulkSaving,
    bulkError,
    lastBulkSummary,

    // actions
    setFilters,
    refetch,
    getById,
    add,
    edit,
    archive,
    bulkUpsert,
    clearError,
    clearCurrent,
    clearBulk,
  };
}

export default useEmpaques;
