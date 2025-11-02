// frontend/src/modules/gestion_bodega/hooks/useCierres.ts
// Hook maestro para gestionar Cierres Semanales de Bodega.
// - Lista de cierres con paginación.
// - Índice general de semanas de la temporada (mapa/overview).
// - Creación de cierre semanal (abrir semana o cerrada de una vez).
// - Cierre de temporada.
// Nota: finalizar una semana ABIERTA requiere endpoint específico (start/finish).
// Si más adelante exponemos /bodega/tablero/week/finish/ usaremos ese flujo.

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../../global/store/store";
import {
  selectCierres,
  setContext,
  setIsoSemana,
  setPagination,
  openCreateModal,
  closeCreateModal,
  setDraftDates,
  markRefetch,
  consumeRefetch,
  resetCierres,
} from "../../../global/store/cierresSlice";

import cierresService from "../services/cierresService";
import type {
  CierresIndexResponse,
  CierreSemanalListResponse,
  CierreSemanalCreatePayload,
  CierreSemanalCreateResponse,
  CierreTemporadaResponse,
} from "../types/cierreTypes";

// Claves de cache
const QK = {
  index: (temporadaId: number | null) => ["bodega", "cierres", "index", temporadaId] as const,
  list: (
    temporadaId: number | null,
    bodegaId: number | null,
    iso: string | null,
    page: number,
    pageSize: number
  ) => ["bodega", "cierres", "list", temporadaId, bodegaId, iso, page, pageSize] as const,
};

// Formateo mínimo para mostrar rangos
function fmtDate(d?: string | null) {
  return d ? d : "—";
}

export function useCierres() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const state = useAppSelector(selectCierres);

  const temporadaId = state.temporadaId;
  const bodegaId = state.bodegaId;
  const { page, page_size, iso_semana } = state;

  // INDEX de semanas por temporada (mapa general)
  const indexQ = useQuery<CierresIndexResponse>({
    queryKey: QK.index(temporadaId),
    enabled: !!temporadaId,
    queryFn: () => cierresService.index(temporadaId as number),
    staleTime: 30_000,
    retry: 1,
  });

  // LIST paginado de cierres (filtrable por iso_semana/bodega/temporada)
  const listQ = useQuery<CierreSemanalListResponse>({
    queryKey: QK.list(temporadaId, bodegaId, iso_semana, page, page_size),
    enabled: !!temporadaId && !!bodegaId,
    queryFn: () =>
      cierresService.list({
        temporada: temporadaId!,
        bodega: bodegaId!,
        iso_semana,
        page,
        page_size,
      }),
    staleTime: 15_000,
    retry: 1,
  });

  const rowsUI = useMemo(() => {
    const rows = listQ.data?.results ?? [];
    return rows.map((r) => ({
      id: r.id,
      iso: r.iso_semana,
      rango: `${fmtDate(r.fecha_desde)} → ${fmtDate(r.fecha_hasta)}`,
      abierta: r.fecha_hasta == null,
      locked_by: r.locked_by ?? null,
      archivado: r.is_active === false || !!r.archivado_en,
      creado_en: r.creado_en,
    }));
  }, [listQ.data]);

  const metaUI = useMemo(() => {
    const m = (listQ.data?.meta ?? {}) as any;
    const total = (m.total ?? m.count ?? 0) as number;

    // ❗ FIX TS5076: no mezclar ?? y || sin paréntesis
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
  }, [listQ.data, page, page_size]);

  // ===== Mutations =====

  // Crear cierre semanal (abrir semana si sin fecha_hasta; cerrada si trae hasta)
  const createSemanaMx = useMutation<CierreSemanalCreateResponse, any, CierreSemanalCreatePayload>({
    mutationFn: (payload) => cierresService.semanal(payload),
    onSuccess: async () => {
      // Refrescamos lista + índice
      await Promise.all([
        qc.invalidateQueries({ queryKey: QK.list(temporadaId, bodegaId, iso_semana, page, page_size) }),
        qc.invalidateQueries({ queryKey: QK.index(temporadaId) }),
      ]);
      dispatch(closeCreateModal());
      // Señal de refetch por si otro componente escucha
      dispatch(markRefetch());
      dispatch(consumeRefetch());
    },
  });

  // Cerrar temporada (no se pueden editar más semanas)
  const closeTemporadaMx = useMutation<CierreTemporadaResponse, any, { temporada: number }>({
    mutationFn: (body) => cierresService.temporada(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.index(temporadaId) });
      await qc.invalidateQueries({ queryKey: QK.list(temporadaId, bodegaId, iso_semana, page, page_size) });
      dispatch(markRefetch());
      dispatch(consumeRefetch());
    },
  });

  // ===== Acciones UI =====

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
      // Regresamos a la primera página al cambiar filtro
      dispatch(setPagination({ page: 1 }));
    },
    [dispatch]
  );

  // Apertura simple (semana ABIERTA: sin fecha_hasta)
  const openWeek = useCallback(
    (fromISO: string) => {
      if (!temporadaId || !bodegaId) return;
      createSemanaMx.mutate({
        temporada: temporadaId,
        bodega: bodegaId,
        fecha_desde: fromISO,
        fecha_hasta: null,
      });
    },
    [createSemanaMx, temporadaId, bodegaId]
  );

  // Crear semana ya cerrada (rango completo)
  const createClosedWeek = useCallback(
    (fromISO: string, toISO: string) => {
      if (!temporadaId || !bodegaId) return;
      createSemanaMx.mutate({
        temporada: temporadaId,
        bodega: bodegaId,
        fecha_desde: fromISO,
        fecha_hasta: toISO,
      });
    },
    [createSemanaMx, temporadaId, bodegaId]
  );

  const requestCloseTemporada = useCallback(() => {
    if (!temporadaId) return;
    closeTemporadaMx.mutate({ temporada: temporadaId });
  }, [closeTemporadaMx, temporadaId]);

  const showCreate = useCallback(() => dispatch(openCreateModal()), [dispatch]);
  const hideCreate = useCallback(() => dispatch(closeCreateModal()), [dispatch]);

  const setDraft = useCallback(
    (draft: { desde?: string | null; hasta?: string | null }) => dispatch(setDraftDates(draft)),
    [dispatch]
  );

  const doCreateFromDraft = useCallback(() => {
    if (!state.draft.desde) return;
    if (state.draft.hasta) {
      createClosedWeek(state.draft.desde, state.draft.hasta);
    } else {
      openWeek(state.draft.desde);
    }
  }, [state.draft, createClosedWeek, openWeek]);

  const onReset = useCallback(() => dispatch(resetCierres()), [dispatch]);

  return {
    // Datos crudos
    index: indexQ.data,
    list: listQ.data,

    // UI mapeada
    rows: rowsUI,
    meta: metaUI,
    weeks: indexQ.data?.weeks ?? [],
    currentWeekIndex: indexQ.data?.current_semana_ix ?? null,

    // Cargando / Error
    loading: indexQ.isLoading || listQ.isLoading,
    loadingIndex: indexQ.isLoading,
    loadingList: listQ.isLoading,
    errorIndex: indexQ.error as any,
    errorList: listQ.error as any,
    creating: createSemanaMx.isPending,
    closingSeason: closeTemporadaMx.isPending,

    // Estado global
    temporadaId,
    bodegaId,
    iso_semana,
    page,
    page_size,
    draft: state.draft,
    showCreateModal: state.showCreateModal,

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
