// frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts
/* Hook maestro del Tablero — unifica constants + mappers + filtros + colas
   Ahora con soporte de isoSemana (YYYY-Www) → deriva fecha_desde/fecha_hasta,
   y expone colas para los tres resúmenes (recepciones/inventarios/logistica).
   SIN dayjs: usa Date + Intl nativo para formateo en America/Mexico_City. */

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../../global/store/store";

import {
  getDashboardSummary,
  getDashboardQueues,
  getDashboardAlerts,
} from "../services/tableroBodegaService";

import type {
  DashboardAlertResponse,
  DashboardQueueResponse,
  DashboardSummaryResponse,
  QueueItem,
  QueueType,
  KpiSummary,
} from "../types/tableroBodegaTypes";

import {
  selectTablero,
  setTemporadaId,
  setActiveQueue,
  setFilters,
  scheduleRefetch,
  applyRefetch,
} from "../../../global/store/tableroBodegaSlice";

import {
  isoKeyToRange,
  guessIsoFromRange,
} from "./useIsoWeek";

// ───────────────────────────────────────────────────────────────────────────────
// CONFIG (constants centralizados)
const LOCAL_TZ = "America/Mexico_City";

const QUERY_KEYS = {
  summary: (temporadaId: number, signature: string) =>
    ["bodega", "dashboard", "summary", temporadaId, signature] as const,
  alerts: (temporadaId: number, stamp: number | null) =>
    ["bodega", "dashboard", "alerts", temporadaId, stamp] as const,
  queue: (temporadaId: number, type: QueueType, signature: string) =>
    ["bodega", "dashboard", "queue", temporadaId, type, signature] as const,
};

const DEFAULTS = {
  PAGE_SIZE: 10,
  ORDER_BY: {
    recepciones: "fecha_recepcion:asc,id:asc",
    ubicaciones: "prioridad:desc,recepcion__fecha_recepcion:desc", // inventarios
    despachos: "fecha_programada:asc,id:asc",
  } as Record<QueueType, string>,
  RETRY: 1,
  STALE_MS: 30_000,
};

const ROUTES = {
  dashboard: (temporadaId: number) => `/bodega/tablero?temporada=${temporadaId}`,
  deepLink: (path: string, query?: Record<string, any>) => {
    if (!query) return path;
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v == null) return;
      qs.append(k, String(v));
    });
    const tail = qs.toString();
    return tail ? `${path}?${tail}` : path;
  },
};

// ───────────────────────────────────────────────────────────────────────────────
// HELPERS (nativo: Date + Intl)
function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function fmtCajas(n?: number) {
  const v = typeof n === "number" ? n : 0;
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(v) + " cajas";
}

function fmtPct01(n?: number | null) {
  if (n == null) return "N/A";
  const v = clamp01(n);
  return new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 }).format(v);
}

function formatDDMMYYYY_HHmm(date: Date, timeZone = LOCAL_TZ) {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

function fmtDateTimeISO(iso: string) {
  return formatDDMMYYYY_HHmm(new Date(iso), LOCAL_TZ);
}

// ───────────────────────────────────────────────────────────────────────────────
/** MAPPERS (API → UI) */
export type KpiCard =
  | { id: "recepcion"; title: string; primary: string; secondary: string }
  | { id: "stock"; title: string; primary: string; secondary: string }
  | { id: "ocupacion"; title: string; primary: string; secondary: string }
  | { id: "rotacion"; title: string; primary: string; secondary: string }
  | { id: "fefo"; title: string; primary: string; secondary: string }
  | { id: "rechazos"; title: string; primary: string; secondary: string }
  | { id: "lead_times"; title: string; primary: string; secondary: string };

function mapSummaryToKpiCards(kpis: KpiSummary): KpiCard[] {
  const cards: KpiCard[] = [];

  if (kpis.recepcion) {
    cards.push({
      id: "recepcion",
      title: "Recepción",
      primary: fmtCajas(kpis.recepcion.kg_total),
      secondary: `Apto ${fmtPct01(kpis.recepcion.apto_pct)} · Merma ${fmtPct01(kpis.recepcion.merma_pct)}`,
    });
  }
  if (kpis.stock) {
    cards.push({
      id: "stock",
      title: "Stock actual",
      primary: fmtCajas(kpis.stock.total_kg),
      secondary:
        Object.entries(kpis.stock.por_madurez || {})
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${fmtCajas(v)}`)
          .join(" · ") || "—",
    });
  }
  if (kpis.ocupacion) {
    cards.push({
      id: "ocupacion",
      title: "Ocupación",
      primary: fmtPct01(kpis.ocupacion.total_pct),
      secondary:
        kpis.ocupacion.por_camara?.slice(0, 2).map((c) => `${c.camara} ${fmtPct01(c.pct)}`).join(" · ") || "—",
    });
  }
  if (kpis.rotacion) {
    cards.push({
      id: "rotacion",
      title: "Rotación",
      primary: `${kpis.rotacion.dias_promedio_bodega?.toFixed(1) ?? "0.0"} días`,
      secondary: "Promedio ponderado por cajas",
    });
  }
  if (kpis.fefo) {
    cards.push({
      id: "fefo",
      title: "FEFO",
      primary: fmtPct01(kpis.fefo.compliance_pct),
      secondary: "Despachos cumpliendo ventana",
    });
  }
  if (kpis.rechazos_qc) {
    cards.push({
      id: "rechazos",
      title: "Rechazos QC",
      primary: fmtPct01(kpis.rechazos_qc.tasa_pct),
      secondary:
        kpis.rechazos_qc.top_causas?.slice(0, 2).map((x) => `${x.causa} ${fmtPct01(x.pct)}`).join(" · ") || "—",
    });
  }
  if (kpis.lead_times) {
    const a = kpis.lead_times.recepcion_a_ubicacion_h;
    const b = kpis.lead_times.ubicacion_a_despacho_h;
    cards.push({
      id: "lead_times",
      title: "Lead Times",
      primary: `${a ?? "N/A"}h → ${b ?? "N/A"}h`,
      secondary: "Recepción→Ubicación → Despacho",
    });
  }

  return cards;
}

// ✨ Extendemos la fila UI para Recepciones (huertero, tipo, notas)
export type QueueRowUI = {
  id: number;
  ref: string;
  fecha: string;        // formateada a zona local
  huerta?: string;      // útil en inventarios
  huertero?: string;    // requerido en recepciones (si existe)
  tipo?: string;        // ej. variedad: manila, ataulfo...
  notas?: string;       // notas libres
  kg: string;           // se muestra como "cajas"
  estado: string;
  chips: string[];      // tags (madurez, calidad, cámara, SLA...)
};

function mapQueueToUI(rows: QueueItem[]): QueueRowUI[] {
  return (rows || []).map((r) => {
    const anyR = r as any; // para campos opcionales que quizá vengan en meta u objeto plano
    const chips: string[] = [];
    if (r.meta?.madurez) chips.push(`Madurez: ${r.meta.madurez}`);
    if (r.meta?.calidad) chips.push(`Calidad: ${r.meta.calidad}`);
    if (r.meta?.camara) chips.push(`Cámara: ${r.meta.camara}`);
    if (r.meta?.sla_h != null) chips.push(`SLA: ${r.meta.sla_h}h`);

    return {
      id: r.id,
      ref: r.ref,
      fecha: fmtDateTimeISO(r.fecha),
      huerta: (anyR.huerta ?? r.meta?.huerta) ?? undefined,
      huertero: (anyR.huertero ?? r.meta?.huertero) ?? undefined,
      tipo: (anyR.tipo ?? r.meta?.tipo) ?? undefined,
      notas: (anyR.notas ?? r.meta?.notas) ?? undefined,
      kg: fmtCajas(r.kg),
      estado: r.estado,
      chips,
    };
  });
}

export type AlertCardUI = {
  code: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  href: string;
};

function mapAlertsToUI(temporadaId: number, data: DashboardAlertResponse): AlertCardUI[] {
  const sorted = (data.alerts || []).slice().sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const;
    return order[a.severity] - order[b.severity];
  });

  return sorted.map((a) => ({
    code: a.code,
    title: a.title,
    description: a.description,
    severity: a.severity,
    href: ROUTES.deepLink(a.link.path, { temporada: temporadaId, ...(a.link.query || {}) }),
  }));
}

// ───────────────────────────────────────────────────────────────────────────────
/** HOOK principal */
type UseTableroArgs = { temporadaId: number };

export function useTableroBodega({ temporadaId }: UseTableroArgs) {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectTablero);

  // Persistimos temporada en UI para deep-links consistentes
  if (state.temporadaId !== temporadaId) {
    dispatch(setTemporadaId(temporadaId));
  }

  // ── Normalización de filtros con soporte isoSemana
  const rawFilters = state.filters as typeof state.filters & { isoSemana?: string | null };
  const normalizedFilters = useMemo(() => {
    const f = { ...rawFilters };
    if (f.isoSemana) {
      const r = isoKeyToRange(f.isoSemana);
      if (r) {
        f.fecha_desde = r.from;
        f.fecha_hasta = r.to;
      }
    } else {
      const inferred = guessIsoFromRange({ from: f.fecha_desde ?? undefined, to: f.fecha_hasta ?? undefined });
      f.isoSemana = inferred ?? f.isoSemana;
    }
    return f;
  }, [rawFilters]);

  const filters = normalizedFilters;
  const queueType: QueueType = state.activeQueue;

  // Firma compacta de filtros para invalidación de cache (incluye isoSemana)
  const filtersSignature = useMemo(() => {
    const p = {
      huerta_id: filters.huerta_id,
      fecha_desde: filters.fecha_desde,
      fecha_hasta: filters.fecha_hasta,
      estado_lote: filters.estado_lote,
      calidad: filters.calidad,
      madurez: filters.madurez,
      solo_pendientes: filters.solo_pendientes,
      page: filters.page,
      page_size: filters.page_size,
      order_by: filters.order_by,
      isoSemana: (filters as any).isoSemana ?? null,
    };
    return JSON.stringify(p);
  }, [filters]);

  // ===== SUMMARY =====
  const summaryQ = useQuery<DashboardSummaryResponse>({
    queryKey: QUERY_KEYS.summary(temporadaId, filtersSignature),
    queryFn: () => getDashboardSummary(temporadaId, filters),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const kpiCards = useMemo(() => {
    const kpis = summaryQ.data?.kpis;
    if (!kpis) return [];
    return mapSummaryToKpiCards(kpis);
  }, [summaryQ.data]);

  // ===== ALERTS =====
  const alertsQ = useQuery<DashboardAlertResponse>({
    queryKey: QUERY_KEYS.alerts(temporadaId, state.refreshAlertsAt),
    queryFn: () => getDashboardAlerts(temporadaId),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const alertsUI = useMemo<AlertCardUI[]>(() => {
    if (!alertsQ.data) return [];
    return mapAlertsToUI(temporadaId, alertsQ.data);
  }, [alertsQ.data, temporadaId]);

  // ===== QUEUE ACTIVA (para otras pantallas que la usen) =====
  const queueQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(temporadaId, queueType, filtersSignature),
    queryFn: () =>
      getDashboardQueues(temporadaId, queueType, {
        ...filters,
        order_by: filters.order_by ?? DEFAULTS.ORDER_BY[queueType],
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const queueUI = useMemo(() => {
    const data = queueQ.data as DashboardQueueResponse | undefined;

    const metaSrc = (data?.meta ?? {}) as any;
    const meta = {
      page: metaSrc.page ?? filters.page,
      page_size: metaSrc.page_size ?? filters.page_size,
      total: metaSrc.total ?? metaSrc.count ?? 0,
      pages: metaSrc.pages ?? metaSrc.total_pages,
      next: metaSrc.next,
      previous: metaSrc.previous,
    };

    return {
      meta,
      rows: mapQueueToUI(data?.results ?? []),
    };
  }, [queueQ.data, filters.page, filters.page_size]);

  // ===== COLAS PARA LOS 3 RESÚMENES (simultáneas) =====
  const recepcionesQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(temporadaId, "recepciones", filtersSignature + "|summary"),
    queryFn: () =>
      getDashboardQueues(temporadaId, "recepciones", {
        ...filters,
        order_by: DEFAULTS.ORDER_BY["recepciones"],
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const inventariosQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(temporadaId, "ubicaciones", filtersSignature + "|summary"),
    queryFn: () =>
      getDashboardQueues(temporadaId, "ubicaciones", {
        ...filters,
        order_by: DEFAULTS.ORDER_BY["ubicaciones"],
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const logisticaQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(temporadaId, "despachos", filtersSignature + "|summary"),
    queryFn: () =>
      getDashboardQueues(temporadaId, "despachos", {
        ...filters,
        order_by: DEFAULTS.ORDER_BY["despachos"],
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const queueRecepciones = useMemo(() => {
    const data = recepcionesQ.data as DashboardQueueResponse | undefined;
    const metaSrc = (data?.meta ?? {}) as any;
    return {
      meta: {
        page: metaSrc.page ?? filters.page,
        page_size: metaSrc.page_size ?? filters.page_size,
        total: metaSrc.total ?? metaSrc.count ?? 0,
      },
      rows: mapQueueToUI(data?.results ?? []),
    };
  }, [recepcionesQ.data, filters.page, filters.page_size]);

  const queueInventarios = useMemo(() => {
    const data = inventariosQ.data as DashboardQueueResponse | undefined;
    const metaSrc = (data?.meta ?? {}) as any;
    return {
      meta: {
        page: metaSrc.page ?? filters.page,
        page_size: metaSrc.page_size ?? filters.page_size,
        total: metaSrc.total ?? metaSrc.count ?? 0,
      },
      rows: mapQueueToUI(data?.results ?? []),
    };
  }, [inventariosQ.data, filters.page, filters.page_size]);

  const queueLogistica = useMemo(() => {
    const data = logisticaQ.data as DashboardQueueResponse | undefined;
    const metaSrc = (data?.meta ?? {}) as any;
    return {
      meta: {
        page: metaSrc.page ?? filters.page,
        page_size: metaSrc.page_size ?? filters.page_size,
        total: metaSrc.total ?? metaSrc.count ?? 0,
      },
      rows: mapQueueToUI(data?.results ?? []),
    };
  }, [logisticaQ.data, filters.page, filters.page_size]);

  // ───────────────────────────────────────────────────────────────────────────
  // Acciones UI (unificadas)
  const onChangeQueue = useCallback(
    (type: QueueType) => {
      dispatch(setActiveQueue(type));
      dispatch(setFilters({ order_by: DEFAULTS.ORDER_BY[type], page: 1 }));
    },
    [dispatch]
  );

  const onChangePage = useCallback(
    (page: number) => {
      dispatch(setFilters({ page }));
    },
    [dispatch]
  );

  const onChangePageSize = useCallback(
    (page_size: number) => {
      dispatch(setFilters({ page_size, page: 1 }));
    },
    [dispatch]
  );

  // onApplyFilters acepta isoSemana y/o from/to.
  const onApplyFilters = useCallback(
    (partial: Partial<typeof filters> & { isoSemana?: string | null }) => {
      const next: any = { ...partial };

      if (next.isoSemana) {
        const r = isoKeyToRange(next.isoSemana);
        if (r) {
          next.fecha_desde = r.from;
          next.fecha_hasta = r.to;
        }
      } else {
        const inferred = guessIsoFromRange({ from: next.fecha_desde, to: next.fecha_hasta });
        if (inferred) next.isoSemana = inferred;
      }

      if (!next.order_by) next.order_by = DEFAULTS.ORDER_BY[queueType];
      dispatch(setFilters({ ...next, page: 1 }));
    },
    [dispatch, queueType]
  );

  // Refetch sutil (cross-módulo) y ejecución
  const markForRefetch = useCallback(
    (what: "summary" | "alerts" | QueueType) => {
      dispatch(scheduleRefetch(what));
    },
    [dispatch]
  );

  const applyMarkedRefetch = useCallback(() => {
    dispatch(applyRefetch());
    summaryQ.refetch();
    alertsQ.refetch();
    queueQ.refetch();
    recepcionesQ.refetch();
    inventariosQ.refetch();
    logisticaQ.refetch();
  }, [dispatch, summaryQ, alertsQ, queueQ, recepcionesQ, inventariosQ, logisticaQ]);

  // Helpers para componentes (deep-links y estados)
  const dashboardHref = useMemo(() => ROUTES.dashboard(temporadaId), [temporadaId]);

  return {
    // Datos listos para UI
    kpiCards,
    alerts: alertsUI,
    queue: queueUI, // cola activa (compatibilidad)
    queueRecepciones,
    queueInventarios,
    queueLogistica,

    // Estados de carga/errores por sección
    loading:
      summaryQ.isLoading || alertsQ.isLoading ||
      queueQ.isLoading || recepcionesQ.isLoading || inventariosQ.isLoading || logisticaQ.isLoading,
    isLoadingSummary: summaryQ.isLoading,
    isLoadingAlerts: alertsQ.isLoading,
    isLoadingQueue: queueQ.isLoading,
    isLoadingRecepciones: recepcionesQ.isLoading,
    isLoadingInventarios: inventariosQ.isLoading,
    isLoadingLogistica: logisticaQ.isLoading,

    errorSummary: summaryQ.error as any,
    errorAlerts: alertsQ.error as any,
    errorQueue: queueQ.error as any,
    errorRecepciones: recepcionesQ.error as any,
    errorInventarios: inventariosQ.error as any,
    errorLogistica: logisticaQ.error as any,

    // Estado global de UI (Redux)
    temporadaId,
    filters,
    activeQueue: queueType,

    // Acciones UI
    onChangeQueue,
    onApplyFilters,
    onChangePage,
    onChangePageSize,

    // Paginación por bloque (por ahora comparten la misma page del store)
    onPageChangeRecepciones: onChangePage,
    onPageChangeInventarios: onChangePage,
    onPageChangeLogistica: onChangePage,

    // Refetch sutil/directo
    markForRefetch,
    applyMarkedRefetch,
    refetchSummary: summaryQ.refetch,
    refetchAlerts: alertsQ.refetch,
    refetchQueue: queueQ.refetch,
    refetchAll: () => {
      summaryQ.refetch();
      alertsQ.refetch();
      queueQ.refetch();
      recepcionesQ.refetch();
      inventariosQ.refetch();
      logisticaQ.refetch();
    },

    // Navegación
    dashboardHref,
  };
}

export default useTableroBodega;
