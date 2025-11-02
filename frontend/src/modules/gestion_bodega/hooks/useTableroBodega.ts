// frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts
/* Hook maestro del Tablero — lógica reactiva y contratos estabilizados
   - Consume contexto del backend (temporada_label y active_week).
   - Semanas MANUALES: navega con /tablero/semanas y sincroniza rango inicio/fin al filtro.
   - Siempre envía bodegaId para que el backend pueda inferir semana activa.
   - Cuando NO hay semanas creadas, no fuerza rangos ni etiquetas ISO; expone hasWeeks=false.
*/

import { useMemo, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../../global/store/store";

import {
  getDashboardSummary,
  getDashboardQueues,
  getDashboardAlerts,
  getWeeksNav,
  startWeek,
  finishWeek,
} from "../services/tableroBodegaService";

import type {
  DashboardAlertResponse,
  DashboardQueueResponse,
  DashboardSummaryResponse,
  QueueItem,
  QueueType,
  KpiSummary,
  WeeksNavResponse,
} from "../types/tableroBodegaTypes";

import {
  selectTablero,
  setTemporadaId,
  setActiveQueue,
  setFilters,
  scheduleRefetch,
  applyRefetch,
} from "../../../global/store/tableroBodegaSlice";

// ───────────────────────────────────────────────────────────────────────────────
const LOCAL_TZ = "America/Mexico_City";

const QUERY_KEYS = {
  summary: (temporadaId: number, bodegaId: number, signature: string) =>
    ["bodega", "dashboard", "summary", temporadaId, bodegaId, signature] as const,
  alerts: (temporadaId: number, bodegaId: number, stamp: number | null) =>
    ["bodega", "dashboard", "alerts", temporadaId, bodegaId, stamp] as const,
  queue: (temporadaId: number, bodegaId: number, type: QueueType, signature: string) =>
    ["bodega", "dashboard", "queue", temporadaId, bodegaId, type, signature] as const,
  weeksNav: (temporadaId: number, bodegaId: number, iso: string | null) =>
    ["bodega", "dashboard", "weeksNav", temporadaId, bodegaId, iso] as const,
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
    ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: false as const } : {}),
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

    const huertero =
      (anyR.huertero ??
        r.meta?.huertero ??
        anyR["recepcion__huertero_nombre"] ??
        anyR["huertero_nombre"]) || undefined;

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

// ───────────────────────────────────────────────────────────────────────────────
type UseTableroArgs = { temporadaId: number; bodegaId: number };

export function useTableroBodega({ temporadaId, bodegaId }: UseTableroArgs) {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectTablero);

  // Persistimos temporada en UI para deep-links consistentes
  if (state.temporadaId !== temporadaId) {
    dispatch(setTemporadaId(temporadaId));
  }

  // Estado local: ancla de navegación (iso_semana) o null → actual/última
  const [navIso, setNavIso] = useState<string | null>(null);

  // Normalización de filtros (no inferimos ISO cuando sea MANUAL)
  const rawFilters = state.filters as typeof state.filters & { isoSemana?: string | null };
  const filters = useMemo(() => ({ ...rawFilters } as any), [rawFilters]);

  const queueType: QueueType = state.activeQueue;

  // Firma de filtros (para cache/react-query)
  const filtersSignature = useMemo(
    () =>
      JSON.stringify({
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
        semana_id: null,
      }),
    [filters, queueType]
  );

  // ===== WEEKS NAV =====
  const weeksNavQ = useQuery<WeeksNavResponse>({
    queryKey: QUERY_KEYS.weeksNav(temporadaId, bodegaId, navIso),
    queryFn: () => getWeeksNav(temporadaId, bodegaId, { isoSemana: navIso }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  // ¿Hay semanas creadas?
  const hasWeeks = useMemo(() => {
    const items = weeksNavQ.data?.items ?? [];
    return items.length > 0;
  }, [weeksNavQ.data?.items]);

  // selectedSemanaId (si existe nav o actual); null si no hay semanas
  const selectedSemanaId = useMemo(() => {
    if (!hasWeeks) return null;
    const d = weeksNavQ.data!;
    const isoRef = navIso ?? d.actual ?? null;
    const found = (d.items || []).find((it: any) => it?.iso_semana === isoRef);
    return found?.id ?? null;
  }, [hasWeeks, navIso, weeksNavQ.data]);

  // Sincroniza rango cuando backend define inicio/fin (solo si hay semanas)
  useEffect(() => {
    if (!hasWeeks) return;
    const inicio = weeksNavQ.data?.inicio;
    const fin = weeksNavQ.data?.fin;
    if (!inicio || !fin) return;

    const changed =
      filters.fecha_desde !== inicio ||
      filters.fecha_hasta !== fin ||
      (filters as any).isoSemana !== "MANUAL";

    if (changed) {
      dispatch(
        setFilters({
          fecha_desde: inicio,
          fecha_hasta: fin,
          isoSemana: "MANUAL",
          page: 1,
        } as any)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWeeks, weeksNavQ.data?.inicio, weeksNavQ.data?.fin]);

  // Si NO hay semanas, limpiamos cualquier rastro de isoSemana/rango manual previo (evita mostrar rangos fantasma)
  useEffect(() => {
    if (hasWeeks) return;
    if ((filters as any).isoSemana || filters.fecha_desde || filters.fecha_hasta) {
      dispatch(setFilters({ isoSemana: undefined, fecha_desde: undefined, fecha_hasta: undefined } as any));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWeeks]);

  // ===== SUMMARY =====
  const summaryQ = useQuery<DashboardSummaryResponse>({
    queryKey: QUERY_KEYS.summary(temporadaId, bodegaId, filtersSignature + `|sem:${selectedSemanaId ?? "none"}`),
    queryFn: () =>
      getDashboardSummary(temporadaId, {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId ?? null,
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const kpiCards = useMemo(() => {
    const kpis = summaryQ.data?.kpis;
    if (!kpis) return [];
    return mapSummaryToKpiCards(kpis);
  }, [summaryQ.data]);

  const temporadaLabel = summaryQ.data?.context?.temporada_label ?? String(temporadaId);

  // ===== ALERTS =====
  const alertsQ = useQuery<DashboardAlertResponse>({
    queryKey: QUERY_KEYS.alerts(temporadaId, bodegaId, state.refreshAlertsAt),
    queryFn: () => getDashboardAlerts(temporadaId, { bodegaId }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const alertsUI = useMemo(() => {
    const data = alertsQ.data;
    if (!data) return [];
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
        ? (() => {
            const qs = new URLSearchParams({
              temporada: String(temporadaId),
              bodega: String(bodegaId),
              ...(a.link.query || {}),
            });
            return `${a.link.path}?${qs.toString()}`;
          })()
        : "#",
    }));
  }, [alertsQ.data, temporadaId, bodegaId]);

  // ===== QUEUE ACTIVA =====
  const queueQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(temporadaId, bodegaId, queueType, filtersSignature + `|sem:${selectedSemanaId ?? "none"}`),
    queryFn: () =>
      getDashboardQueues(temporadaId, queueType, {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId ?? null,
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
    queryKey: QUERY_KEYS.queue(
      temporadaId,
      bodegaId,
      "recepciones",
      filtersSignature + `|summary|sem:${selectedSemanaId ?? "none"}`
    ),
    queryFn: () =>
      getDashboardQueues(temporadaId, "recepciones", {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId ?? null,
        order_by: DEFAULTS.ORDER_BY["recepciones"],
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const inventariosQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(
      temporadaId,
      bodegaId,
      "inventarios",
      filtersSignature + `|summary|sem:${selectedSemanaId ?? "none"}`
    ),
    queryFn: () =>
      getDashboardQueues(temporadaId, "inventarios", {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId ?? null,
        order_by: DEFAULTS.ORDER_BY["inventarios"],
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const logisticaQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(
      temporadaId,
      bodegaId,
      "despachos",
      filtersSignature + `|summary|sem:${selectedSemanaId ?? "none"}`
    ),
    queryFn: () =>
      getDashboardQueues(temporadaId, "despachos", {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId ?? null,
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

  // Filtros (acepta rango manual). Si viene rango sin iso, marcamos "MANUAL".
  const onApplyFilters = useCallback(
    (partial: Partial<typeof filters> & { isoSemana?: string | null }) => {
      const next: any = { ...partial };
      if (!next.isoSemana && (next.fecha_desde || next.fecha_hasta)) {
        next.isoSemana = "MANUAL";
      }
      if (!next.order_by) next.order_by = DEFAULTS.ORDER_BY[queueType];
      dispatch(setFilters({ ...next, page: 1 }));
    },
    [dispatch, queueType]
  );

  // 🔸 Semanas manuales (helpers de UX)
  const addDays = (isoDate: string, days: number) => {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const startManualWeek = useCallback(
    (fromISO: string) => {
      const toISO = addDays(fromISO, 6);
      onApplyFilters({ fecha_desde: fromISO, fecha_hasta: toISO, isoSemana: "MANUAL", page: 1 });
      setNavIso(null);
    },
    [onApplyFilters]
  );

  const finishManualWeek = useCallback(
    (toISO: string) => {
      onApplyFilters({ fecha_hasta: toISO, isoSemana: "MANUAL", page: 1 });
      setNavIso(null);
    },
    [onApplyFilters]
  );

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

  // Backend: iniciar/cerrar semana real
  const apiStartWeek = useCallback(
    async (fromISO: string) => {
      await startWeek({ bodega: bodegaId, temporada: temporadaId, fecha_desde: fromISO });
      setNavIso(null);
      await weeksNavQ.refetch();
      dispatch(scheduleRefetch("summary"));
      dispatch(scheduleRefetch("recepciones"));
      dispatch(scheduleRefetch("inventarios"));
      dispatch(scheduleRefetch("despachos"));
    },
    [bodegaId, temporadaId, weeksNavQ, dispatch]
  );

  const apiFinishWeek = useCallback(
    async (toISO: string) => {
      await finishWeek({ bodega: bodegaId, temporada: temporadaId, fecha_hasta: toISO });
      setNavIso(null);
      await weeksNavQ.refetch();
      dispatch(scheduleRefetch("summary"));
      dispatch(scheduleRefetch("recepciones"));
      dispatch(scheduleRefetch("inventarios"));
      dispatch(scheduleRefetch("despachos"));
    },
    [bodegaId, temporadaId, weeksNavQ, dispatch]
  );

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

  const dashboardHref = useMemo(
    () => `/bodega/tablero?temporada=${temporadaId}&bodega=${bodegaId}`,
    [temporadaId, bodegaId]
  );

  // Navegación por semanas creadas (usa weeksNav)
  const weekNav = useMemo(() => {
    const d = weeksNavQ.data;
    return {
      hasPrev: !!d?.has_prev,
      hasNext: !!d?.has_next,
      indice: d?.indice ?? null, // Semana 1, 2, 3...
      inicio: d?.inicio ?? null,
      fin: d?.fin ?? null,
      actualIso: d?.actual ?? null,
      items: d?.items ?? [],
      hasWeeks, // ← bandera directa para UI
    };
  }, [weeksNavQ.data, hasWeeks]);

  const goPrevWeek = useCallback(() => {
    const prevIso = weeksNavQ.data?.prev ?? null;
    setNavIso(prevIso);
  }, [weeksNavQ.data?.prev]);

  const goNextWeek = useCallback(() => {
    const nextIso = weeksNavQ.data?.next ?? null;
    setNavIso(nextIso);
  }, [weeksNavQ.data?.next]);

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
      summaryQ.isLoading ||
      alertsQ.isLoading ||
      queueQ.isLoading ||
      recepcionesQ.isLoading ||
      inventariosQ.isLoading ||
      logisticaQ.isLoading ||
      weeksNavQ.isLoading,
    isLoadingSummary: summaryQ.isLoading,
    isLoadingAlerts: alertsQ.isLoading,
    isLoadingQueue: queueQ.isLoading,
    isLoadingRecepciones: recepcionesQ.isLoading,
    isLoadingInventarios: inventariosQ.isLoading,
    isLoadingLogistica: logisticaQ.isLoading,
    isLoadingWeeksNav: weeksNavQ.isLoading,

    errorSummary: summaryQ.error as any,
    errorAlerts: alertsQ.error as any,
    errorQueue: queueQ.error as any,
    errorRecepciones: recepcionesQ.error as any,
    errorInventarios: inventariosQ.error as any,
    errorLogistica: logisticaQ.error as any,
    errorWeeksNav: weeksNavQ.error as any,

    // Estado global
    temporadaId,
    bodegaId,
    temporadaLabel,
    filters,
    activeQueue: queueType,

    // Acciones listas para UI
    onChangeQueue,
    onApplyFilters,
    onChangePage,
    onChangePageSize,

    // Semanas manuales (front)
    startManualWeek,
    finishManualWeek,
    closeIfExceeded7,

    // Semanas reales (backend)
    apiStartWeek,
    apiFinishWeek,

    // Navegación de semanas creadas (backend)
    weekNav,
    goPrevWeek,
    goNextWeek,
    setWeekIsoRef: setNavIso,

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
      weeksNavQ.refetch();
    },

    // Navegación
    dashboardHref,
  };
}

export default useTableroBodega;
