// frontend/src/modules/gestion_bodega/hooks/useCierres.ts
// Hook para gestionar Cierres Semanales de Bodega - Redux Puro (sin React Query)
import { useCallback, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../global/store/store";
import {
  setContext,
  setIsoSemana,
  setPagination,
  openCreateModal,
  closeCreateModal,
  setDraftDates,
  resetCierres,
  fetchCierresIndex,
  fetchCierresList,
  createCierreSemanal,
  closeCierreTemporada,
} from "../../../global/store/cierresSlice";

// Formateo mínimo para mostrar rangos
function fmtDate(d?: string | null) {
  return d ? d : "—";
}

export function useCierres() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.cierres);

  const {
    temporadaId,
    bodegaId,
    iso_semana,
    page,
    page_size,
    index,
    list,
    loadingIndex,
    loadingList,
    creating,
    closingSeason,
    errorIndex,
    errorList,
    draft,
    showCreateModal,
  } = state;

  // Auto-fetch index cuando cambia temporadaId
  useEffect(() => {
    if (temporadaId) {
      dispatch(fetchCierresIndex(temporadaId));
    }
  }, [dispatch, temporadaId]);

  // Auto-fetch list cuando cambian los filtros
  useEffect(() => {
    if (temporadaId && bodegaId) {
      dispatch(fetchCierresList({ temporada: temporadaId, bodega: bodegaId, iso_semana, page, page_size }));
    }
  }, [dispatch, temporadaId, bodegaId, iso_semana, page, page_size]);

  // Mapear rows para UI
  const rowsUI = useMemo(() => {
    const rows = list?.results ?? [];
    return rows.map((r: any) => ({
      id: r.id,
      iso: r.iso_semana,
      rango: `${fmtDate(r.fecha_desde)} → ${fmtDate(r.fecha_hasta)}`,
      abierta: r.fecha_hasta == null,
      locked_by: r.locked_by ?? null,
      archivado: r.is_active === false || !!r.archivado_en,
      creado_en: r.creado_en,
    }));
  }, [list]);

  // Meta de paginación
  const metaUI = useMemo(() => {
    const m = (list?.meta ?? {}) as any;
    const total = (m.total ?? m.count ?? 0) as number;
    const fallbackPages = (Math.ceil(total / (page_size ?? 10)) || 1) as number;
    const pages = (m.pages ?? m.total_pages ?? fallbackPages) as number;

    return {
      page: (m.page ?? page) as number,
      page_size: (m.page_size ?? page_size) as number,
      total,
      pages,
      next: (m.next ?? null) as string | null,
      previous: (m.previous ?? null) as string | null,
    };
  }, [list, page, page_size]);

  // Acciones
  const setContextIds = useCallback(
    (next: { temporadaId?: number | null; bodegaId?: number | null }) => {
      dispatch(setContext(next));
    },
    [dispatch]
  );

  const onChangePage = useCallback(
    (nextPage: number) => {
      dispatch(setPagination({ page: nextPage }));
    },
    [dispatch]
  );

  const onChangePageSize = useCallback(
    (nextPageSize: number) => {
      dispatch(setPagination({ page_size: nextPageSize, page: 1 }));
    },
    [dispatch]
  );

  const onSelectIsoSemana = useCallback(
    (iso: string | null) => {
      dispatch(setIsoSemana(iso));
      dispatch(setPagination({ page: 1 }));
    },
    [dispatch]
  );

  // Apertura simple (semana ABIERTA: sin fecha_hasta)
  const openWeek = useCallback(
    async (fromISO: string) => {
      if (!temporadaId || !bodegaId) return;
      await dispatch(createCierreSemanal({
        temporada: temporadaId,
        bodega: bodegaId,
        fecha_desde: fromISO,
        fecha_hasta: null,
      })).unwrap();
      // Refetch después de crear
      dispatch(fetchCierresIndex(temporadaId));
      dispatch(fetchCierresList({ temporada: temporadaId, bodega: bodegaId, iso_semana, page, page_size }));
    },
    [dispatch, temporadaId, bodegaId, iso_semana, page, page_size]
  );

  // Crear semana ya cerrada (rango completo)
  const createClosedWeek = useCallback(
    async (fromISO: string, toISO: string) => {
      if (!temporadaId || !bodegaId) return;
      await dispatch(createCierreSemanal({
        temporada: temporadaId,
        bodega: bodegaId,
        fecha_desde: fromISO,
        fecha_hasta: toISO,
      })).unwrap();
      // Refetch después de crear
      dispatch(fetchCierresIndex(temporadaId));
      dispatch(fetchCierresList({ temporada: temporadaId, bodega: bodegaId, iso_semana, page, page_size }));
    },
    [dispatch, temporadaId, bodegaId, iso_semana, page, page_size]
  );

  const requestCloseTemporada = useCallback(async () => {
    if (!temporadaId) return;
    await dispatch(closeCierreTemporada({ temporada: temporadaId })).unwrap();
    dispatch(fetchCierresIndex(temporadaId));
    if (bodegaId) {
      dispatch(fetchCierresList({ temporada: temporadaId, bodega: bodegaId, iso_semana, page, page_size }));
    }
  }, [dispatch, temporadaId, bodegaId, iso_semana, page, page_size]);

  const showCreate = useCallback(() => dispatch(openCreateModal()), [dispatch]);
  const hideCreate = useCallback(() => dispatch(closeCreateModal()), [dispatch]);

  const setDraft = useCallback(
    (draftData: { desde?: string | null; hasta?: string | null }) => dispatch(setDraftDates(draftData)),
    [dispatch]
  );

  const doCreateFromDraft = useCallback(async () => {
    if (!draft.desde) return;
    if (draft.hasta) {
      await createClosedWeek(draft.desde, draft.hasta);
    } else {
      await openWeek(draft.desde);
    }
  }, [draft, createClosedWeek, openWeek]);

  const onReset = useCallback(() => dispatch(resetCierres()), [dispatch]);

  return {
    // Datos crudos
    index,
    list,

    // UI mapeada
    rows: rowsUI,
    meta: metaUI,
    weeks: index?.weeks ?? [],
    currentWeekIndex: index?.current_semana_ix ?? null,

    // Cargando / Error
    loading: loadingIndex || loadingList,
    loadingIndex,
    loadingList,
    errorIndex,
    errorList,
    creating,
    closingSeason,

    // Estado global
    temporadaId,
    bodegaId,
    iso_semana,
    page,
    page_size,
    draft,
    showCreateModal,

    // Acciones
    setContextIds,
    onChangePage,
    onChangePageSize,
    onSelectIsoSemana,

    showCreate,
    hideCreate,
    setDraft,
    doCreateFromDraft,

    openWeek,
    createClosedWeek,
    requestCloseTemporada,

    onReset,
  };
}

export default useCierres;
