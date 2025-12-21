// frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts
/* Hook maestro del Tablero — estado único de semana (week_id) y contratos estabilizados
   - Fuente de verdad: CierreSemanal del backend.
   - Navega por índice en weeksNav.items (prev/next) y sincroniza ?week_id en URL.
   - Sin ISO en cliente; sin derivaciones locales. Filtros toman fecha_desde/hasta de la semana seleccionada.
   - Todas las queries clavean y envían semanaId=selectedSemanaId.
*/

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  summary: (
    temporadaId: number,
    bodegaId: number,
    semanaId: number | null,
    signature: string
  ) =>
    [
      "bodega",
      "dashboard",
      "summary",
      temporadaId,
      bodegaId,
      `sem:${semanaId ?? "none"}`,
      signature,
    ] as const,
  alerts: (temporadaId: number, bodegaId: number, stamp: number | null) =>
    ["bodega", "dashboard", "alerts", temporadaId, bodegaId, stamp] as const,
  queue: (
    temporadaId: number,
    bodegaId: number,
    type: QueueType,
    semanaId: number | null,
    signature: string
  ) =>
    [
      "bodega",
      "dashboard",
      "queue",
      temporadaId,
      bodegaId,
      type,
      `sem:${semanaId ?? "none"}`,
      signature,
    ] as const,
  weeksNav: (temporadaId: number, bodegaId: number) =>
    ["bodega", "dashboard", "weeksNav", temporadaId, bodegaId] as const,
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
  return (
    new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(v) +
    " cajas"
  );
}

function fmtPct01(n?: number | null) {
  if (n == null) return "N/A";
  const v = clamp01(n);
  return new Intl.NumberFormat("es-MX", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(v);
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
      ? ({ hour: "2-digit", minute: "2-digit", hour12: false } as const)
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
      secondary: `Apto ${fmtPct01(
        kpis.recepcion.apto_pct
      )} · Merma ${fmtPct01(kpis.recepcion.merma_pct)}`,
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
          .map(([k, v]) => `${k}: ${fmtCajas(v as number)}`)
          .join(" · ") || "—",
    });
  }
  if (kpis.ocupacion) {
    cards.push({
      id: "ocupacion",
      title: "Ocupación",
      primary: fmtPct01(kpis.ocupacion.total_pct),
      secondary:
        kpis.ocupacion.por_camara
          ?.slice(0, 2)
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
      secondary:
        kpis.rechazos_qc.top_causas
          ?.slice(0, 2)
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
  const [sp, setSp] = useSearchParams();

  // Persistimos temporada en UI para deep-links consistentes (una sola vez por cambio)
  useEffect(() => {
    if (state.temporadaId !== temporadaId) {
      dispatch(setTemporadaId(temporadaId));
    }
  }, [dispatch, state.temporadaId, temporadaId]);

  // Firma de filtros (para cache/react-query)
  const rawFilters = state.filters;
  const filters = useMemo(() => ({ ...rawFilters } as any), [rawFilters]);
  const queueType: QueueType = state.activeQueue;

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
      }),
    [filters, queueType]
  );

  // ===== WEEKS NAV =====
  const weeksNavQ = useQuery<WeeksNavResponse>({
    queryKey: QUERY_KEYS.weeksNav(temporadaId, bodegaId),
    queryFn: () => getWeeksNav(temporadaId, bodegaId),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const weeksNavData = weeksNavQ.data as any;
  const items: any[] = weeksNavData?.items ?? [];
  const hasWeeks = items.length > 0;

  // === selectedWeek (desde URL ?week_id o fallback al índice reportado por backend) ===
  const urlWeekIdStr = sp.get("week_id");
  const urlWeekId = urlWeekIdStr ? Number(urlWeekIdStr) : null;

  const selectedWeek = useMemo(() => {
    if (!hasWeeks) return null;

    // Semana abierta reportada por backend (activa = true)
    const openWeek = items.find((it: any) => it?.activa);

    // 1) Si la URL apunta a una semana válida
    if (urlWeekId && items.some((it: any) => it.id === urlWeekId)) {
      return items.find((it: any) => it.id === urlWeekId) || null;
    }

    // 2) Si no hay URL o no coincide, priorizamos la abierta
    if (openWeek) return openWeek;

    // 3) Fallback al índice actual informado por backend (1-based)
    const idx = Math.max(
      0,
      Math.min(items.length - 1, (weeksNavData?.indice ?? 1) - 1)
    );
    return items[idx] || null;
  }, [hasWeeks, items, urlWeekId, weeksNavData?.indice]);

  const selectedSemanaId = selectedWeek?.id ?? null;

  // Reset paginaciÇün al cambiar de semana seleccionada (evita caer en pÇ­ginas vacÇðas)
  const lastSemanaRef = useRef<number | null>(null);
  useEffect(() => {
    if (lastSemanaRef.current === selectedSemanaId) return;
    lastSemanaRef.current = selectedSemanaId ?? null;
    if ((filters.page ?? 1) !== 1) {
      dispatch(setFilters({ page: 1 } as any));
    }
  }, [selectedSemanaId, filters.page, dispatch]);

  // Normaliza URL → asegura ?week_id consistente con la semana seleccionada
  useEffect(() => {
    if (!selectedWeek) {
      // No hay semanas → limpiar week_id si existe
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

  // Sin semanas → limpiar filtros colgados
  useEffect(() => {
    if (!hasWeeks && (filters.fecha_desde || filters.fecha_hasta)) {
      dispatch(
        setFilters({ fecha_desde: undefined, fecha_hasta: undefined } as any)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWeeks]);

  // Sincroniza filtros con la semana seleccionada (rango exacto de backend)
  useEffect(() => {
    if (!hasWeeks || !selectedWeek) return;

    const inicio = selectedWeek.fecha_desde;
    const fin = selectedWeek.fecha_hasta;

    const changed =
      filters.fecha_desde !== inicio || filters.fecha_hasta !== fin;
    if (changed) {
      dispatch(
        setFilters({
          fecha_desde: inicio,
          fecha_hasta: fin,
          page: 1,
        } as any)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWeeks, selectedWeek?.fecha_desde, selectedWeek?.fecha_hasta]);

  // ===== SUMMARY =====
  const summaryQ = useQuery<DashboardSummaryResponse>({
    queryKey: QUERY_KEYS.summary(
      temporadaId,
      bodegaId,
      selectedSemanaId,
      filtersSignature
    ),
    queryFn: () =>
      getDashboardSummary(temporadaId, {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId,
      }),
    retry: DEFAULTS.RETRY,
    staleTime: DEFAULTS.STALE_MS,
  });

  const summaryData = summaryQ.data as any;

  const kpiCards = useMemo(() => {
    const kpis: KpiSummary | undefined = summaryData?.kpis;
    if (!kpis) return [];
    return mapSummaryToKpiCards(kpis);
  }, [summaryData]);

  const temporadaLabel =
    summaryData?.context?.temporada_label ?? String(temporadaId);

  // ===== ALERTS (por temporada; no dependen de semana) =====
  const alertsQ = useQuery<DashboardAlertResponse>({
    queryKey: QUERY_KEYS.alerts(temporadaId, bodegaId, state.refreshAlertsAt),
    queryFn: () => getDashboardAlerts(temporadaId, { bodegaId }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const alertsData = alertsQ.data as any;

  const alertsUI = useMemo(() => {
    const data = alertsData;
    if (!data) return [];
    const sorted = (data.alerts || [])
      .slice()
      .sort((a: any, b: any) => {
        const order: Record<string, number> = {
          critical: 0,
          warning: 1,
          info: 2,
        };
        return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      });

    return sorted.map((a: any) => ({
      code: a.code,
      title: a.title,
      description: a.description,
      severity: a.severity as "info" | "warning" | "critical",
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
  }, [alertsData, temporadaId, bodegaId]);

  // ===== QUEUE ACTIVA =====
  const queueQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(
      temporadaId,
      bodegaId,
      queueType,
      selectedSemanaId,
      filtersSignature
    ),
    queryFn: () =>
      getDashboardQueues(temporadaId, queueType, {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId,
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

  // ===== COLAS PARA RESÚMENES (misma semana seleccionada) =====
  const recepcionesQ = useQuery<DashboardQueueResponse>({
    queryKey: QUERY_KEYS.queue(
      temporadaId,
      bodegaId,
      "recepciones",
      selectedSemanaId,
      filtersSignature + "|summary"
    ),
    queryFn: () =>
      getDashboardQueues(temporadaId, "recepciones", {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId,
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
      selectedSemanaId,
      filtersSignature + "|summary"
    ),
    queryFn: () =>
      getDashboardQueues(temporadaId, "inventarios", {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId,
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
      selectedSemanaId,
      filtersSignature + "|summary"
    ),
    queryFn: () =>
      getDashboardQueues(temporadaId, "despachos", {
        ...filters,
        bodegaId,
        semanaId: selectedSemanaId,
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
    const page = Number(metaSrc.page ?? filters.page ?? 1) || 1;
    let pageSize = Number(metaSrc.page_size ?? filters.page_size ?? DEFAULTS.PAGE_SIZE) || DEFAULTS.PAGE_SIZE;
    if (pageSize <= 0) pageSize = DEFAULTS.PAGE_SIZE;
    const total = Number(metaSrc.total ?? metaSrc.count ?? 0) || 0;

    return {
      meta: {
        page,
        page_size: pageSize,
        total,
      },
      rows: mapQueueToUI(data?.results ?? []),
    };
  }, [logisticaQ.data, filters.page, filters.page_size]);

  // ───────────────────────────────────────────────────────────────────────────
  // Acciones UI
  const onChangeQueue = useCallback(
    (type: QueueType) => {
      dispatch(setActiveQueue(type));
      dispatch(
        setFilters({ order_by: DEFAULTS.ORDER_BY[type], page: 1 } as any)
      );
    },
    [dispatch]
  );

  const onChangePage = useCallback(
    (page: number) => {
      const next = Number(page);
      const safe = Number.isFinite(next) && next > 0 ? next : 1;
      dispatch(setFilters({ page: safe } as any));
    },
    [dispatch]
  );

  const onChangePageSize = useCallback(
    (page_size: number) => {
      dispatch(setFilters({ page_size, page: 1 } as any));
    },
    [dispatch]
  );

  // Filtros arbitrarios
  const onApplyFilters = useCallback(
    (partial: Partial<typeof filters>) => {
      const next: any = { ...partial };
      if (!next.order_by) next.order_by = DEFAULTS.ORDER_BY[queueType];
      dispatch(setFilters({ ...next, page: 1 } as any));
    },
    [dispatch, queueType]
  );

  // Backend: iniciar semana real
  const apiStartWeek = useCallback(
    async (fromISO: string) => {
      await startWeek({ bodega: bodegaId, temporada: temporadaId, fecha_desde: fromISO });
      const { data } = await weeksNavQ.refetch();
      const navData = data as any;
      const hit = navData?.items?.find((it: any) => it.fecha_desde === fromISO);
      if (hit?.id) {
        const next = new URLSearchParams(sp);
        next.set("week_id", String(hit.id));
        setSp(next, { replace: true });
      }
      dispatch(scheduleRefetch("summary"));
      dispatch(scheduleRefetch("recepciones"));
      dispatch(scheduleRefetch("inventarios"));
      dispatch(scheduleRefetch("despachos"));
    },
    [bodegaId, temporadaId, weeksNavQ, sp, setSp, dispatch]
  );

  // Backend: finalizar semana real (usa selectedSemanaId → semana_id)
  const apiFinishWeek = useCallback(
    async (toISO: string) => {
      if (!bodegaId || !temporadaId || !selectedSemanaId) {
        throw new Error("No hay semana seleccionada para finalizar.");
      }

      await finishWeek({
        bodega: bodegaId,
        temporada: temporadaId,
        semana_id: selectedSemanaId,
        fecha_hasta: toISO,
      });

      await weeksNavQ.refetch();
      dispatch(scheduleRefetch("summary"));
      dispatch(scheduleRefetch("recepciones"));
      dispatch(scheduleRefetch("inventarios"));
      dispatch(scheduleRefetch("despachos"));
    },
    [bodegaId, temporadaId, selectedSemanaId, weeksNavQ, dispatch]
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
    weeksNavQ.refetch();
  }, [dispatch, summaryQ, alertsQ, queueQ, recepcionesQ, inventariosQ, logisticaQ, weeksNavQ]);

  const dashboardHref = useMemo(
    () =>
      `/bodega/tablero?temporada=${temporadaId}&bodega=${bodegaId}${
        selectedSemanaId ? `&week_id=${selectedSemanaId}` : ""
      }`,
    [temporadaId, bodegaId, selectedSemanaId]
  );

  // Navegación por semanas creadas (usa weeksNav.items e index actual de selectedWeek)
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
      context: (weeksNavData?.context ??
        summaryData?.context ??
        undefined) as any,
    };
  }, [hasWeeks, items, selectedIndex, selectedWeek, weeksNavData?.context, summaryData?.context]);

  const setSelectedWeekId = useCallback(
    (weekId: number) => {
      if (!items.some((it: any) => it.id === weekId)) return;
      const next = new URLSearchParams(sp);
      next.set("week_id", String(weekId));
      setSp(next, { replace: true });
    },
    [items, sp, setSp]
  );

  const goPrevWeek = useCallback(() => {
    if (!hasWeeks || selectedIndex <= 0) return;
    const prevId = items[selectedIndex - 1]?.id;
    if (prevId) setSelectedWeekId(prevId);
  }, [hasWeeks, selectedIndex, items, setSelectedWeekId]);

  const goNextWeek = useCallback(() => {
    if (!hasWeeks || selectedIndex < 0 || selectedIndex >= items.length - 1)
      return;
    const nextId = items[selectedIndex + 1]?.id;
    if (nextId) setSelectedWeekId(nextId);
  }, [hasWeeks, selectedIndex, items, setSelectedWeekId]);

  // ───────────────────────────────────────────────────────────────────────────
  // API pública del hook
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
    selectedWeek,
    selectedSemanaId,

    // Acciones listas para UI
    onChangeQueue,
    onApplyFilters,
    onChangePage,
    onChangePageSize,

    // Semanas reales (backend)
    apiStartWeek,
    apiFinishWeek,

    // Navegación de semanas creadas (backend)
    weekNav,
    goPrevWeek,
    goNextWeek,
    setSelectedWeekId,

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

    // ── Legacy stubs (no-ops) para no romper llamadas existentes en UI:
    startManualWeek: useCallback((_fromISO: string) => {}, []),
    finishManualWeek: useCallback((_toISO: string) => {}, []),
    closeIfExceeded7: useCallback(() => {}, []),
  };
}

export default useTableroBodega;
