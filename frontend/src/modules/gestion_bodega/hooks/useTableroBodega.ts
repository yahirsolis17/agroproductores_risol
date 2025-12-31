// frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts
// Hook para Tablero de Bodega - Redux Puro (sin React Query)
/* eslint-disable react-hooks/exhaustive-deps */

import { useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../global/store/store";
import { takeTopN, sortForDisplay } from "../../../global/utils/uiTransforms";

import {
  setTemporadaId,
  setBodegaId,
  setActiveQueue,
  setFilters,
  setSelectedWeekId,

  fetchTableroSummary,
  fetchTableroAlerts,
  fetchTableroQueues,
  fetchTableroWeeksNav,
  tableroStartWeek,
  tableroFinishWeek,
} from "../../../global/store/tableroBodegaSlice";

import type {
  QueueType,
  QueueItem,
  KpiSummary,
} from "../types/tableroBodegaTypes";
import { parseLocalDateStrict, formatDateISO } from "../../../global/utils/date";

// --------------------------
// Helpers
// --------------------------
const LOCAL_TZ = "America/Mexico_City";

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

function formatSmart(iso: string, timeZone = LOCAL_TZ) {
  if (!iso) return "";
  const hasTime = iso.includes("T");
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const base = `${get("day")}/${get("month")}/${get("year")}`;
  if (!hasTime) return base;
  return `${base} ${get("hour")}:${get("minute")}`;
}

// --------------------------
// KPI Cards
// --------------------------
export type KpiCard = {
  id: string;
  title: string;
  primary: string;
  secondary: string;
};

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
      secondary: takeTopN(Object.entries(kpis.stock.por_madurez || {}), 3)
        .map(([k, v]) => `${k}: ${fmtCajas(v as number)}`)
        .join(" · ") || "—",
    });
  }
  if (kpis.ocupacion) {
    cards.push({
      id: "ocupacion",
      title: "Ocupación",
      primary: fmtPct01(kpis.ocupacion.total_pct),
      secondary: takeTopN(kpis.ocupacion.por_camara || [], 2)
        .map((c) => `${c.camara} ${fmtPct01(c.pct)}`)
        .join(" · ") || "—",
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
      secondary: takeTopN(kpis.rechazos_qc.top_causas || [], 2)
        .map((x) => `${x.causa} ${fmtPct01(x.pct)}`)
        .join(" · ") || "—",
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

// --------------------------
// Queue Row UI
// --------------------------
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

    const huertero = anyR.huertero ?? r.meta?.huertero ?? anyR["recepcion__huertero_nombre"] ?? anyR["huertero_nombre"];

    return {
      id: r.id,
      ref: r.ref,
      fecha: formatSmart(r.fecha),
      huerta: anyR.huerta ?? r.meta?.huerta,
      huertero,
      tipo: anyR.tipo ?? r.meta?.tipo ?? anyR["tipo_mango"],
      notas: anyR.notas ?? r.meta?.notas,
      kg: fmtCajas(r.kg),
      estado: r.estado,
      chips,
    };
  });
}

// --------------------------
// Alert Card UI
// --------------------------
export type AlertCardUI = {
  code: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  href: string;
};

// --------------------------
// Hook
// --------------------------
type UseTableroArgs = { temporadaId: number; bodegaId: number };

export function useTableroBodega({ temporadaId, bodegaId }: UseTableroArgs) {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.tableroBodega);
  const [sp, setSp] = useSearchParams();

  const {
    filters,
    activeQueue,
    summary,
    alerts,
    queues,
    weeksNav,

    loadingSummary,
    loadingAlerts,
    loadingQueues,
    loadingWeeksNav,
    startingWeek,
    finishingWeek,
  } = state;

  // Sync context
  useEffect(() => {
    if (state.temporadaId !== temporadaId) {
      dispatch(setTemporadaId(temporadaId));
    }
  }, [dispatch, state.temporadaId, temporadaId]);

  useEffect(() => {
    if (state.bodegaId !== bodegaId) {
      dispatch(setBodegaId(bodegaId));
    }
  }, [dispatch, state.bodegaId, bodegaId]);

  // URL sync for week_id
  const urlWeekIdStr = sp.get("week_id");
  const urlWeekId = urlWeekIdStr ? Number(urlWeekIdStr) : null;

  // Auto-fetch weeksNav
  useEffect(() => {
    if (temporadaId && bodegaId) {
      dispatch(fetchTableroWeeksNav({ temporadaId, bodegaId }));
    }
  }, [dispatch, temporadaId, bodegaId]);

  // Derive selected week from URL or weeksNav
  const weeksNavData = weeksNav as any;
  const items: any[] = weeksNavData?.items ?? [];
  const hasWeeks = items.length > 0;

  const selectedWeek = useMemo(() => {
    if (!hasWeeks) return null;
    const openWeek = items.find((it: any) => it?.activa);

    if (urlWeekId && items.some((it: any) => it.id === urlWeekId)) {
      return items.find((it: any) => it.id === urlWeekId) || null;
    }
    if (openWeek) return openWeek;

    const idx = Math.max(0, Math.min(items.length - 1, (weeksNavData?.indice ?? 1) - 1));
    return items[idx] || null;
  }, [hasWeeks, items, urlWeekId, weeksNavData?.indice]);

  const selectedSemanaId = selectedWeek?.id ?? null;

  // Sync selectedWeekId to slice
  useEffect(() => {
    if (selectedSemanaId !== state.selectedWeekId) {
      dispatch(setSelectedWeekId(selectedSemanaId));
    }
  }, [dispatch, selectedSemanaId, state.selectedWeekId]);

  // Sync URL
  useEffect(() => {
    if (!selectedWeek) {
      if (sp.get("week_id")) {
        const next = new URLSearchParams(sp);
        next.delete("week_id");
        setSp(next, { replace: true });
      }
      return;
    }
    if (String(selectedWeek.id) !== sp.get("week_id")) {
      const next = new URLSearchParams(sp);
      next.set("week_id", String(selectedWeek.id));
      setSp(next, { replace: true });
    }
  }, [selectedWeek, sp, setSp]);

  // Sync filters with selected week dates
  useEffect(() => {
    if (!hasWeeks || !selectedWeek) return;
    const inicio = selectedWeek.fecha_desde;
    const fin = selectedWeek.fecha_hasta;
    const changed = filters.fecha_desde !== inicio || filters.fecha_hasta !== fin;
    if (changed) {
      dispatch(setFilters({ fecha_desde: inicio, fecha_hasta: fin, page: 1 }));
    }
  }, [dispatch, hasWeeks, selectedWeek?.fecha_desde, selectedWeek?.fecha_hasta]);

  // Auto-fetch summary
  useEffect(() => {
    if (temporadaId && bodegaId) {
      dispatch(fetchTableroSummary({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters }));
    }
  }, [dispatch, temporadaId, bodegaId, selectedSemanaId, filters]);

  // Auto-fetch alerts
  useEffect(() => {
    if (temporadaId && bodegaId) {
      dispatch(fetchTableroAlerts({ temporadaId, bodegaId }));
    }
  }, [dispatch, temporadaId, bodegaId]);

  // Auto-fetch active queue
  useEffect(() => {
    if (temporadaId && bodegaId) {
      dispatch(fetchTableroQueues({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters, queueType: activeQueue }));
    }
  }, [dispatch, temporadaId, bodegaId, selectedSemanaId, filters, activeQueue]);

  // --------------------------
  // Computed UI values
  // --------------------------
  const kpiCards = useMemo(() => {
    const kpis = (summary as any)?.kpis;
    if (!kpis) return [];
    return mapSummaryToKpiCards(kpis);
  }, [summary]);

  const temporadaLabel = (summary as any)?.context?.temporada_label ?? String(temporadaId);

  const alertsUI = useMemo(() => {
    const data = alerts as any;
    if (!data) return [];
    const sorted = sortForDisplay([...(data.alerts || [])], (a: any, b: any) => {
      const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
    });

    return sorted.map((a: any) => ({
      code: a.code,
      title: a.title,
      description: a.description,
      severity: a.severity as "info" | "warning" | "critical",
      href: a.link?.path ? (() => {
        const qs = new URLSearchParams({
          temporada: String(temporadaId),
          bodega: String(bodegaId),
          ...(a.link.query || {}),
        });
        return `${a.link.path}?${qs.toString()}`;
      })() : "#",
    })) as AlertCardUI[];
  }, [alerts, temporadaId, bodegaId]);

  const queueData = queues[activeQueue];
  const queueUI = useMemo(() => {
    const data = queueData;
    const metaSrc = ((data as any)?.meta ?? {}) as any;
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
      rows: mapQueueToUI((data as any)?.results ?? []),
    };
  }, [queueData, filters.page, filters.page_size]);

  // --------------------------
  // Week Navigation
  // --------------------------
  const selectedIndex = useMemo(() => {
    if (!selectedWeek) return -1;
    return items.findIndex((it: any) => it.id === selectedWeek.id);
  }, [items, selectedWeek]);

  const weekNav = useMemo(() => {
    const idx = selectedIndex;
    const cur = selectedWeek;
    return {
      hasPrev: hasWeeks && idx > 0,
      hasNext: hasWeeks && idx >= 0 && idx < items.length - 1,
      indice: hasWeeks && idx >= 0 ? idx + 1 : null,
      inicio: cur?.fecha_desde ?? null,
      fin: cur?.fecha_hasta ?? null,
      actualIso: null,
      items,
      hasWeeks,
      selected: cur ?? null,
      context: (weeksNavData?.context ?? (summary as any)?.context ?? undefined) as any,
    };
  }, [hasWeeks, items, selectedIndex, selectedWeek, weeksNavData?.context, summary]);

  const selectedWeekObj = selectedWeek as any;
  const isExpiredWeek = useMemo(() => {
    // P1 Robustez: Si el backend ya nos dice si expiró (con hora MX), confiamos en él.
    if (typeof selectedWeekObj?.is_expired === "boolean") {
      return selectedWeekObj.is_expired;
    }

    if (!selectedWeekObj?.fecha_desde && !selectedWeekObj?.inicio) return false;
    // Si ya está cerrada, no expira (está finalizada)
    if (selectedWeekObj.fecha_hasta || selectedWeekObj.fin || selectedWeekObj.is_closed) return false;

    const startStr = selectedWeekObj.fecha_desde || selectedWeekObj.inicio;
    const start = parseLocalDateStrict(startStr);
    const limit = new Date(start);
    limit.setDate(limit.getDate() + 6); // día 7

    // Si hoy > limit, expirada
    const today = new Date();
    // Comparar solo fechas ignorando horas
    const todayYMD = formatDateISO(today);
    const limitYMD = formatDateISO(limit);
    return todayYMD > limitYMD;
  }, [selectedWeekObj]);

  // --------------------------
  // Active Week Status (CONSOLIDADO - única fuente de verdad)
  // --------------------------
  const { hasActiveWeek, isActiveSelectedWeek } = useMemo(() => {
    // La semana está activa si tiene fecha_hasta = null (abierta)
    const isSelectedOpen = !selectedWeekObj?.fecha_hasta && !selectedWeekObj?.fin && !selectedWeekObj?.is_closed;
    const selectedHasActivaFlag = !!selectedWeekObj?.activa;

    // Hay alguna semana activa globalmente en la lista?
    const anyActiveInList = items.some((it: any) => it?.activa || (!it?.fecha_hasta && !it?.fin));

    return {
      hasActiveWeek: anyActiveInList,
      isActiveSelectedWeek: isSelectedOpen || selectedHasActivaFlag,
    };
  }, [selectedWeekObj, items]);

  // --------------------------
  // Actions
  // --------------------------
  const onChangeQueue = useCallback((type: QueueType) => {
    dispatch(setActiveQueue(type));
  }, [dispatch]);

  const onChangePage = useCallback((page: number) => {
    dispatch(setFilters({ page }));
  }, [dispatch]);

  const onChangePageSize = useCallback((page_size: number) => {
    dispatch(setFilters({ page_size, page: 1 }));
  }, [dispatch]);

  const onApplyFilters = useCallback((partial: Partial<typeof filters>) => {
    dispatch(setFilters({ ...partial, page: 1 }));
  }, [dispatch]);

  const changeSelectedWeekId = useCallback((weekId: number) => {
    if (!items.some((it: any) => it.id === weekId)) return;
    const next = new URLSearchParams(sp);
    next.set("week_id", String(weekId));
    setSp(next, { replace: true });
  }, [items, sp, setSp]);

  const goPrevWeek = useCallback(() => {
    if (!hasWeeks || selectedIndex <= 0) return;
    const prevId = items[selectedIndex - 1]?.id;
    if (prevId) changeSelectedWeekId(prevId);
  }, [hasWeeks, selectedIndex, items, changeSelectedWeekId]);

  const goNextWeek = useCallback(() => {
    if (!hasWeeks || selectedIndex < 0 || selectedIndex >= items.length - 1) return;
    const nextId = items[selectedIndex + 1]?.id;
    if (nextId) changeSelectedWeekId(nextId);
  }, [hasWeeks, selectedIndex, items, changeSelectedWeekId]);

  const apiStartWeekAction = useCallback(async (fromISO: string) => {
    await dispatch(tableroStartWeek({ bodega: bodegaId, temporada: temporadaId, fecha_desde: fromISO })).unwrap();
    dispatch(fetchTableroWeeksNav({ temporadaId, bodegaId }));
    dispatch(fetchTableroSummary({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters }));
  }, [dispatch, bodegaId, temporadaId, selectedSemanaId, filters]);

  const apiFinishWeekAction = useCallback(async (toISO: string) => {
    if (!selectedSemanaId) throw new Error("No hay semana seleccionada para finalizar.");
    await dispatch(tableroFinishWeek({ bodega: bodegaId, temporada: temporadaId, semana_id: selectedSemanaId, fecha_hasta: toISO })).unwrap();
    dispatch(fetchTableroWeeksNav({ temporadaId, bodegaId }));
    dispatch(fetchTableroSummary({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters }));
  }, [dispatch, bodegaId, temporadaId, selectedSemanaId, filters]);

  // --------------------------
  // Explicit Refetch Functions (Fase 2: eliminan refetchAll abusivo)
  // --------------------------
  const refetchSummaryFn = useCallback(() => {
    if (!temporadaId || !bodegaId) return;
    dispatch(fetchTableroSummary({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters }));
  }, [dispatch, temporadaId, bodegaId, selectedSemanaId, filters]);

  const refetchQueuesFn = useCallback((type?: QueueType) => {
    if (!temporadaId || !bodegaId) return;
    const t = type ?? activeQueue;
    dispatch(fetchTableroQueues({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters, queueType: t }));
  }, [dispatch, temporadaId, bodegaId, selectedSemanaId, filters, activeQueue]);

  const refetchWeeksNavFn = useCallback(() => {
    if (!temporadaId || !bodegaId) return;
    dispatch(fetchTableroWeeksNav({ temporadaId, bodegaId }));
  }, [dispatch, temporadaId, bodegaId]);

  const refetchAlertsFn = useCallback(() => {
    if (!temporadaId || !bodegaId) return;
    dispatch(fetchTableroAlerts({ temporadaId, bodegaId }));
  }, [dispatch, temporadaId, bodegaId]);

  const refetchAll = useCallback(() => {
    if (!temporadaId || !bodegaId) return;
    dispatch(fetchTableroWeeksNav({ temporadaId, bodegaId }));
    dispatch(fetchTableroSummary({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters }));
    dispatch(fetchTableroAlerts({ temporadaId, bodegaId }));
    dispatch(fetchTableroQueues({ temporadaId, bodegaId, semanaId: selectedSemanaId, filters, queueType: activeQueue }));
  }, [dispatch, temporadaId, bodegaId, selectedSemanaId, filters, activeQueue]);

  const dashboardHref = useMemo(() =>
    `/bodega/tablero?temporada=${temporadaId}&bodega=${bodegaId}${selectedSemanaId ? `&week_id=${selectedSemanaId}` : ""}`,
    [temporadaId, bodegaId, selectedSemanaId]);

  const fallbackMeta = useMemo(
    () => ({
      page: filters.page ?? 1,
      page_size: filters.page_size ?? 10,
      count: 0,
      next: null,
      previous: null,
      total_pages: 1,
    }),
    [filters.page, filters.page_size]
  );

  // --------------------------
  // Return
  // --------------------------
  return {
    // UI Data
    kpiCards,
    summary: summary as any,
    alerts: alertsUI,
    queue: queueUI,
    queueRecepciones: {
      meta: queues.recepciones?.meta ?? fallbackMeta,
      rows: mapQueueToUI((queues.recepciones as any)?.results ?? []),
    },
    queueInventarios: {
      meta: queues.inventarios?.meta ?? fallbackMeta,
      rows: mapQueueToUI((queues.inventarios as any)?.results ?? []),
    },
    queueLogistica: {
      meta: queues.despachos?.meta ?? fallbackMeta,
      rows: mapQueueToUI((queues.despachos as any)?.results ?? []),
    },

    // Loading/Error
    loading: loadingSummary || loadingAlerts || loadingQueues[activeQueue] || loadingWeeksNav,
    loadingSummary, isLoadingSummary: loadingSummary,
    isLoadingLogistica: loadingQueues.despachos,
    loadingAlerts,
    loadingQueues, // Ahora es Record
    loadingWeeksNav,
    startingWeek,
    finishingWeek,
    isExpiredWeek,

    // Week State (CONSOLIDADO - única fuente de verdad)
    hasActiveWeek,
    isActiveSelectedWeek,
    selectedWeek: selectedWeekObj,

    // State
    temporadaLabel,
    temporadaId,
    bodegaId,
    activeQueue,
    filters,
    selectedSemanaId,
    weekNav,

    // Actions
    onChangeQueue,
    onChangePage,
    onChangePageSize,
    onApplyFilters,
    setSelectedWeekId: changeSelectedWeekId,
    goPrevWeek,
    goNextWeek,
    apiStartWeek: apiStartWeekAction,
    apiFinishWeek: apiFinishWeekAction,

    // Refetch (Fase 2: funciones explícitas en lugar de refetchAll abusivo)
    refetchSummary: refetchSummaryFn,
    refetchQueues: refetchQueuesFn,
    refetchWeeksNav: refetchWeeksNavFn,
    refetchAlerts: refetchAlertsFn,
    refetchAll,
    // Mantener aliases para compatibilidad temporal (deprecar después)
    markForRefetch: refetchAll,
    applyMarkedRefetch: refetchAll,

    dashboardHref,
  };
}

export default useTableroBodega;
