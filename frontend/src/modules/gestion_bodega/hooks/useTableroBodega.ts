// frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts
/* Hook maestro del Tablero — lógica reactiva y contratos estabilizados
   - Fecha: si la API trae Date (YYYY-MM-DD), mostramos solo fecha (sin 00:00).
   - Huertero: se muestra explícito en recepciones.
   - Semanas manuales: helpers para fijar rango y marcar isoSemana="MANUAL".
*/

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
} from "./useIsoWeek";

// ───────────────────────────────────────────────────────────────────────────────
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
    recepciones: "fecha_recepcion:desc,id:desc",
    inventarios: "fecha:desc,id:desc",
    despachos: "fecha_programada:desc,id:desc",
  } as Record<QueueType, string>,
  RETRY: 1,
  STALE_MS: 30_000,
};

// ───────────────────────────────────────────────────────────────────────────────
// HELPERS
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

// Si el backend devuelve solo “YYYY-MM-DD”, mostramos solo fecha.
// Si incluye tiempo (ISO con “T”), mostramos fecha y hora.
function formatSmart(iso: string, timeZone = LOCAL_TZ) {
  if (!iso) return "";
  const hasTime = iso.includes("T");
  const date = new Date(iso);

  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(hasTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false as const }
      : {}),
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const base = `${get("day")}/${get("month")}/${get("year")}`;
  if (!hasTime) return base;
  return `${base} ${get("hour")}:${get("minute")}`;
}

// ───────────────────────────────────────────────────────────────────────────────
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
    const a = kpis.lead_times.recepcion_a_inventario_h;
    const b = kpis.lead_times.inventario_a_despacho_h;
    cards.push({
      id: "lead_times",
      title: "Lead Times",
      primary: `${a ?? "N/A"}h -> ${b ?? "N/A"}h`,
      secondary: "Recepción → Inventario → Despacho",
    });
  }

  return cards;
}

// ───────────────────────────────────────────────────────────────────────────────
export type QueueRowUI = {
  id: number;
  ref: string;
  fecha: string;
  huerta?: string;
  huertero?: string;
  tipo?: string;
  notas?: string;
  kg: string;
  estado: string;
  chips: string[];
};

function mapQueueToUI(rows: QueueItem[]): QueueRowUI[] {
  return (rows || []).map((r) => {
    const anyR = r as any;
    const chips: string[] = [];
    if (r.meta?.madurez) chips.push(`Madurez: ${r.meta.madurez}`);
    if (r.meta?.calidad) chips.push(`Calidad: ${r.meta.calidad}`);
    if (r.meta?.camara) chips.push(`Cámara: ${r.meta.camara}`);
    if (r.meta?.sla_h != null) chips.push(`SLA: ${r.meta.sla_h}h`);

    // 🔹 Huertero: preferimos r.huertero, luego meta.huertero, luego recepcion__huertero_nombre (si backend lo puso en toplevel/values)
    const huertero =
      (anyR.huertero ?? r.meta?.huertero ?? anyR["recepcion__huertero_nombre"] ?? anyR["huertero_nombre"]) || undefined;

    return {
      id: r.id,
      ref: r.ref,
      fecha: formatSmart(r.fecha),
      huerta: (anyR.huerta ?? r.meta?.huerta) ?? undefined,
      huertero,
      tipo: (anyR.tipo ?? r.meta?.tipo ?? anyR["tipo_mango"]) ?? undefined,
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
    href: a.link?.path
      ? ((): string => {
          const qs = new URLSearchParams({ temporada: String(temporadaId), ...(a.link.query || {}) });
          return `${a.link.path}?${qs.toString()}`;
        })()
      : "#",
  }));
}

// ───────────────────────────────────────────────────────────────────────────────
type UseTableroArgs = { temporadaId: number };

export function useTableroBodega({ temporadaId }: UseTableroArgs) {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectTablero);

  // Persistimos temporada en UI para deep-links consistentes
  if (state.temporadaId !== temporadaId) {
    dispatch(setTemporadaId(temporadaId));
  }

  // Normalización de filtros con soporte manual de semanas
  const rawFilters = state.filters as typeof state.filters & { isoSemana?: string | null };
  const normalizedFilters = useMemo(() => {
    const f: any = { ...rawFilters };
    // Si isoSemana === "MANUAL", respetamos fecha_desde/hasta tal cual (no inferimos nada).
    if (f.isoSemana && f.isoSemana !== "MANUAL") {
      const r = isoKeyToRange(f.isoSemana);
      if (r) {
        f.fecha_desde = r.from;
        f.fecha_hasta = r.to;
      }
    } else if (!f.isoSemana) {
      // Si el usuario puso rango manual (desde UI) y no hay isoSemana, NO INFERRAMOS ⇒ dejamos como está.
      // Si necesitas inferir, descomenta la siguiente línea.
      // f.isoSemana = guessIsoFromRange({ from: f.fecha_desde ?? undefined, to: f.fecha_hasta ?? undefined }) ?? null;
    }
    return f;
  }, [rawFilters]);

  const filters = normalizedFilters;
  const queueType: QueueType = state.activeQueue;

  // Firma de filtros
  const filtersSignature = useMemo(() => JSON.stringify({
    huerta_id: filters.huerta_id ?? null,
    fecha_desde: filters.fecha_desde ?? null,
    fecha_hasta: filters.fecha_hasta ?? null,
    estado_lote: filters.estado_lote ?? null,
    calidad: filters.calidad ?? null,
    madurez: filters.madurez ?? null,
    solo_pendientes: filters.solo_pendientes ?? null,
    page: filters.page ?? 1,
    page_size: filters.page_size ?? DEFAULTS.PAGE_SIZE,
    order_by: filters.order_by ?? DEFAULTS.ORDER_BY[queueType],
    isoSemana: (filters as any).isoSemana ?? null,
  }), [filters, queueType]);

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

  // ===== QUEUE ACTIVA =====
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

  // ===== COLAS PARA RESÚMENES =====
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
    queryKey: QUERY_KEYS.queue(temporadaId, "inventarios", filtersSignature + "|summary"),
    queryFn: () =>
      getDashboardQueues(temporadaId, "inventarios", {
        ...filters,
        order_by: DEFAULTS.ORDER_BY["inventarios"],
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
  // Acciones UI
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

  // Filtros (acepta isoSemana y/o rango manual). Si viene rango sin iso, marcamos "MANUAL".
  const onApplyFilters = useCallback(
    (partial: Partial<typeof filters> & { isoSemana?: string | null }) => {
      const next: any = { ...partial };

      if (next.isoSemana && next.isoSemana !== "MANUAL") {
        const r = isoKeyToRange(next.isoSemana);
        if (r) {
          next.fecha_desde = r.from;
          next.fecha_hasta = r.to;
        }
      } else if (!next.isoSemana && (next.fecha_desde || next.fecha_hasta)) {
        next.isoSemana = "MANUAL";
      }

      if (!next.order_by) next.order_by = DEFAULTS.ORDER_BY[queueType];
      dispatch(setFilters({ ...next, page: 1 }));
    },
    [dispatch, queueType]
  );

  // 🔸 Semanas manuales (helpers de UX, 100% front)
  const addDays = (isoDate: string, days: number) => {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Inicia semana manual: fija desde y calcula hasta +6 días. Marca isoSemana="MANUAL".
  const startManualWeek = useCallback((fromISO: string) => {
    const toISO = addDays(fromISO, 6);
    onApplyFilters({ fecha_desde: fromISO, fecha_hasta: toISO, isoSemana: "MANUAL", page: 1 });
  }, [onApplyFilters]);

  // Finaliza semana: ajusta fecha_hasta (manteniendo desde). Mantiene "MANUAL".
  const finishManualWeek = useCallback((toISO: string) => {
    onApplyFilters({ fecha_hasta: toISO, isoSemana: "MANUAL", page: 1 });
  }, [onApplyFilters]);

  // Guard de seguridad opcional: si la semana se pasó de 7 días, recorta al día 6.
  const closeIfExceeded7 = useCallback(() => {
    const { fecha_desde, fecha_hasta } = filters as any;
    if (!fecha_desde || !fecha_hasta) return;
    const d0 = new Date(fecha_desde);
    const d1 = new Date(fecha_hasta);
    const diff = Math.ceil((d1.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 6) {
      const toISO = addDays(fecha_desde, 6);
      onApplyFilters({ fecha_hasta: toISO, isoSemana: "MANUAL" });
    }
  }, [filters, onApplyFilters]);

  // Refetch sutil
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

  const dashboardHref = useMemo(() => `/bodega/tablero?temporada=${temporadaId}`, [temporadaId]);

  return {
    // Datos UI
    kpiCards,
    alerts: alertsUI,
    queue: queueUI,
    queueRecepciones,
    queueInventarios,
    queueLogistica,

    // Loading / Error
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

    // Estado global
    temporadaId,
    filters,
    activeQueue: queueType,

    // Acciones
    onChangeQueue,
    onApplyFilters,
    onChangePage,
    onChangePageSize,

    // Semanas manuales
    startManualWeek,
    finishManualWeek,
    closeIfExceeded7,

    // Paginación por bloque (comparten page global)
    onPageChangeRecepciones: onChangePage,
    onPageChangeInventarios: onChangePage,
    onPageChangeLogistica: onChangePage,

    // Refetch
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
