// frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  Tooltip,
  Button,
  alpha,
  useTheme,
  CircularProgress,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { useTableroBodega } from "../hooks/useTableroBodega";
import WeekSwitcher from "../components/tablero/WeekSwitcher";
import QuickActions from "../components/tablero/QuickActions";

import { setBreadcrumbs } from "../../../global/store/breadcrumbsSlice";
import { formatDateISO, parseLocalDateStrict } from "../../../global/utils/date";

import { getWeekCurrent } from "../services/tableroBodegaService";
import type { WeekCurrentResponse } from "../types/tableroBodegaTypes";

import ResumenSection from "../components/tablero/sections/ResumenSection";
import RecepcionesSection from "../components/tablero/sections/RecepcionesSection";
import EmpaqueSection from "../components/tablero/sections/EmpaqueSection";
import LogisticaSection from "../components/tablero/sections/LogisticaSection";

import TableroSectionsAccordion, {
  type TableroSectionKey,
} from "../components/tablero/sections/TableroSectionsAccordion";

// ───────────────────────────────────────────────────────────────────────────
// Utils
// ───────────────────────────────────────────────────────────────────────────
function prettyRange(fromISO: string, toISO: string) {
  const from = parseLocalDateStrict(fromISO);
  const to = parseLocalDateStrict(toISO);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

function withPreservedParams(href: string, preserveKeys: string[] = ["temporada", "bodega", "week_id"]) {
  const current = new URLSearchParams(window.location.search);
  const url = new URL(href, window.location.origin);
  preserveKeys.forEach((k) => {
    if (current.has(k) && !url.searchParams.has(k)) {
      url.searchParams.set(k, current.get(k)!);
    }
  });
  return url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
}

// Animaciones (framer-motion)
const pageTransition = {
  initial: { opacity: 0, y: 8, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

const sectionTransition = {
  initial: { opacity: 0, x: 14 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.08 } },
};

type WeekValue = { from: string; to: string; isoSemana: string | null };

// ───────────────────────────────────────────────────────────────────────────
// Componente principal
// ───────────────────────────────────────────────────────────────────────────
const TableroBodegaPage: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // Media queries para responsive
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const temporadaParam = sp.get("temporada");
  const temporadaId = Number(temporadaParam);
  const bodegaParam = sp.get("bodega");
  const bodegaId = bodegaParam ? Number(bodegaParam) : undefined;

  // Refs para navegación interna (Empaque → Recepciones)
  const recepcionesRef = useRef<HTMLDivElement | null>(null);

  // Acordeón: override puntual (Empaque -> Recepciones) con token para ser idempotente
  const [forcedOpen, setForcedOpen] = useState<{ key: TableroSectionKey; token: number } | null>(null);

  // Si cambia la semana, devolvemos el acordeón al default inteligente
  const weekIdParam = sp.get("week_id");
  const urlWeekId = weekIdParam ? Number(weekIdParam) : null;

  useEffect(() => {
    setForcedOpen(null);
  }, [urlWeekId]);

  // Guards
  useEffect(() => {
    if (!temporadaParam || Number.isNaN(temporadaId) || temporadaId <= 0) {
      navigate("/bodega", { replace: true });
    }
  }, [temporadaParam, temporadaId, navigate]);

  useEffect(() => {
    if (!bodegaParam || Number.isNaN(bodegaId as number) || (bodegaId ?? 0) <= 0) {
      navigate("/bodega", { replace: true });
    }
  }, [bodegaParam, bodegaId, navigate]);

  // Hook maestro de Tablero
  const hookAny = useTableroBodega({ bodegaId: bodegaId!, temporadaId }) as any;

  const {
    kpiCards,
    isLoadingSummary,
    errorSummary,
    refetchSummary,
    onApplyFilters,
    weekNav,
    markForRefetch,
    applyMarkedRefetch,
    apiStartWeek,
    apiFinishWeek,
  } = hookAny;

  const hasWeeks: boolean = !!weekNav?.hasWeeks;
  const [weekSelectionInitialized, setWeekSelectionInitialized] = useState(false);

  // Estado: semana activa actual (desde backend /week/current/)
  const [weekState, setWeekState] = useState<WeekCurrentResponse | null>(null);
  const [busyStart, setBusyStart] = useState(false);
  const [busyFinish, setBusyFinish] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Semana seleccionada (weeksNav + fallback /week/current/)
  useEffect(() => {
    const items = (weekNav?.items || []) as any[];
    if (!items.length) return;
    if (weekSelectionInitialized) return;

    const openWeek = items.find((w: any) => w?.activa);
    const currentId = urlWeekId && !Number.isNaN(urlWeekId) ? urlWeekId : null;
    const currentWeek = currentId ? items.find((it: any) => it?.id === currentId) : undefined;

    if (openWeek) {
      const mustSwitch = !currentWeek || !currentWeek.activa || currentWeek.id !== openWeek.id;
      if (mustSwitch) {
        const next = new URLSearchParams(sp);
        next.set("week_id", String(openWeek.id));
        setSp(next, { replace: true });
      }
      setWeekSelectionInitialized(true);
      return;
    }

    if (!currentWeek) {
      const idxFromNav = ((weekNav?.indice ?? items.length) as number) - 1;
      const safeIdx = Math.max(0, Math.min(items.length - 1, idxFromNav));
      const fallback = items[safeIdx];
      if (fallback?.id) {
        const next = new URLSearchParams(sp);
        next.set("week_id", String(fallback.id));
        setSp(next, { replace: true });
      }
    }

    setWeekSelectionInitialized(true);
  }, [weekNav?.items, weekNav?.indice, urlWeekId, sp, setSp, weekSelectionInitialized]);

  const selectedWeek = useMemo(() => {
    const items = (weekNav?.items || []) as any[];
    if (urlWeekId && items.length) {
      const found = items.find((it) => it?.id === urlWeekId);
      if (found) return found;
    }
    const idx1 = weekNav?.indice ?? null; // 1-based
    if (items.length && idx1 && idx1 > 0) {
      return items[Math.min(items.length - 1, Math.max(0, idx1 - 1))];
    }
    const wk = (weekState as any)?.week || null;
    if (wk) return wk;
    return null;
  }, [weekNav?.items, weekNav?.indice, urlWeekId, weekState]);

  // Estado local del rango que maneja WeekSwitcher
  const [weekValue, setWeekValue] = useState<WeekValue>(() => {
    const sw: any = selectedWeek;
    const from = sw?.fecha_desde || sw?.inicio;
    const to = sw?.fecha_hasta || sw?.fin;
    const today = formatDateISO(new Date());
    return {
      from: from || today,
      to: to || today,
      isoSemana: sw?.iso_semana ?? null,
    };
  });

  // Sincronizar weekValue cuando cambia la semana seleccionada
  useEffect(() => {
    const sw: any = selectedWeek;
    const from = sw?.fecha_desde || sw?.inicio;
    const to = sw?.fecha_hasta || sw?.fin;
    if (from && to) {
      setWeekValue((prev) => (prev.from === from && prev.to === to ? prev : { from, to, isoSemana: "MANUAL" }));
    }
  }, [selectedWeek]);

  // Estado de semana desde backend (/week/current/)
  const refetchWeekState = useCallback(async () => {
    if (!bodegaId || !temporadaId) return;
    try {
      const s = await getWeekCurrent(temporadaId, bodegaId);
      setWeekState(s);
    } catch {
      // silencioso
    }
  }, [bodegaId, temporadaId]);

  useEffect(() => {
    refetchWeekState();
  }, [refetchWeekState]);

  // Si backend reporta una semana activa diferente a la URL, forzamos URL a la activa
  useEffect(() => {
    const activeId = (weekState as any)?.active_week?.id;
    if (!activeId) return;
    if (urlWeekId === activeId) return;
    const next = new URLSearchParams(sp);
    next.set("week_id", String(activeId));
    setSp(next, { replace: true });
  }, [weekState, urlWeekId, sp, setSp]);

  // Pretty range
  const rangoPretty = useMemo(() => {
    const from = (selectedWeek as any)?.fecha_desde || (selectedWeek as any)?.inicio;
    const to = (selectedWeek as any)?.fecha_hasta || (selectedWeek as any)?.fin;
    if (!from || !to) return "";
    return prettyRange(from, to);
  }, [selectedWeek]);

  const semanaIndex = weekNav?.indice ?? null;

  const temporadaChipLabel = useMemo(
    () => `Temporada ${weekNav?.context?.temporada_label ?? temporadaId}`,
    [weekNav?.context?.temporada_label, temporadaId]
  );

  // Breadcrumbs
  useEffect(() => {
    const bLabel = weekNav?.context?.bodega_label || "Bodega";
    const tLabel = weekNav?.context?.temporada_label || "";

    const crumbs = [
      { label: `Bodegas – ${bLabel}`, path: "/bodega" },
      {
        label: `Temporada ${tLabel}`,
        path:
          typeof bodegaId === "number" && bodegaId > 0
            ? `/bodega/${bodegaId}/temporadas${temporadaId ? `?temporada=${temporadaId}` : ""}`
            : "/bodega",
      },
    ] as { label: string; path: string }[];

    if (hasWeeks) crumbs.push({ label: `Semana ${semanaIndex ?? ""}`, path: "" });

    dispatch(setBreadcrumbs(crumbs));
  }, [dispatch, bodegaId, temporadaId, weekNav?.context?.bodega_label, weekNav?.context?.temporada_label, hasWeeks, semanaIndex]);

  // WeekSwitcher → aplica rango al tablero
  const handleWeekChange = useCallback(
    (range: { from?: string; to?: string; isoSemana?: string | null }) => {
      setWeekValue((prev) => ({ ...prev, ...range }));
      if (!range.from || !range.to) return;
      const key = range.isoSemana ?? "MANUAL";
      onApplyFilters?.({ fecha_desde: range.from, fecha_hasta: range.to, isoSemana: key });
    },
    [onApplyFilters]
  );

  // Índices prev/next (para WeekSwitcher)
  const currentIndex = useMemo(() => {
    const items = (weekNav?.items || []) as any[];
    if (!items.length) return -1;
    if (urlWeekId) {
      const idx = items.findIndex((it) => it?.id === urlWeekId);
      if (idx >= 0) return idx;
    }
    const idxFromNav = ((weekNav?.indice ?? 1) as number) - 1;
    return Math.max(0, Math.min(items.length - 1, idxFromNav));
  }, [weekNav?.items, weekNav?.indice, urlWeekId]);

  // Virtual Mode detection
  const isVirtualMode = !urlWeekId && !selectedWeek && hasWeeks;

  const disablePrev = !hasWeeks || (currentIndex <= 0 && !isVirtualMode);

  // Allow next if:
  // 1. Not at end of list
  // 2. OR at end of list, but that last week is CLOSED (so we can go to virtual week)
  // 3. AND not already in virtual mode
  const disableNext = useMemo(() => {
    if (!hasWeeks) return true;
    if (isVirtualMode) return true; // Can't go next from virtual
    const items = (weekNav?.items || []) as any[];
    const isAtEnd = currentIndex >= items.length - 1;
    if (!isAtEnd) return false;

    // Check if last week is closed
    const lastWeek = items[items.length - 1];
    const isClosed = lastWeek.fecha_hasta || lastWeek.fin || lastWeek.is_closed;
    return !isClosed;
  }, [hasWeeks, isVirtualMode, currentIndex, weekNav?.items]);

  const goPrevWeek = useCallback(() => {
    const items = (weekNav?.items || []) as any[];
    if (!items.length) return;

    // If in virtual mode, go back to last item
    if (isVirtualMode) {
      const last = items[items.length - 1];
      if (last?.id) {
        const next = new URLSearchParams(sp);
        next.set("week_id", String(last.id));
        setSp(next, { replace: true }); // Back to reality
      }
      return;
    }

    const idx = currentIndex <= 0 ? 0 : currentIndex - 1;
    const target = items[idx];
    if (target?.id) {
      const next = new URLSearchParams(sp);
      next.set("week_id", String(target.id));
      setSp(next, { replace: false });
    }
  }, [weekNav?.items, currentIndex, sp, setSp, isVirtualMode]);

  const goNextWeek = useCallback(() => {
    const items = (weekNav?.items || []) as any[];
    if (!items.length) return;

    // logic for next
    const isAtEnd = currentIndex >= items.length - 1;

    if (isAtEnd) {
      // Try to enter virtual mode
      const lastWeek = items[items.length - 1];
      const isClosed = lastWeek.fecha_hasta || lastWeek.fin || lastWeek.is_closed;

      if (isClosed) {
        // Enter Virtual Mode
        const next = new URLSearchParams(sp);
        next.delete("week_id");
        setSp(next, { replace: true });

        // Calc virtual dates: start = last end + 1 day
        const lastEndStr = lastWeek.fecha_hasta || lastWeek.fin || lastWeek.fecha_desde; // Fallback
        const lastEnd = parseLocalDateStrict(lastEndStr);
        const virtualStart = new Date(lastEnd);
        virtualStart.setDate(virtualStart.getDate() + 1);

        const virtualEnd = new Date(virtualStart);
        virtualEnd.setDate(virtualEnd.getDate() + 6);

        setWeekValue({
          from: formatDateISO(virtualStart),
          to: formatDateISO(virtualEnd),
          isoSemana: "MANUAL" // or calculate next ISO
        });
        return;
      }
      return; // Stuck
    }

    const idx = currentIndex + 1;
    const target = items[idx];
    if (target?.id) {
      const next = new URLSearchParams(sp);
      next.set("week_id", String(target.id));
      setSp(next, { replace: false });
    }
  }, [weekNav?.items, currentIndex, sp, setSp]);

  // Estado semana activa (robusto)
  const { hasActiveWeek, isActiveSelectedWeek } = useMemo(() => {
    const wk = selectedWeek as any;
    const flagActiva = !!wk?.activa;

    const active = (weekState?.active_week as any) ?? ((weekNav?.context as any)?.active_week as any) ?? null;

    const estado = (active?.estado || "").toString().toUpperCase();
    const isActiveGlobal = !!active && (estado === "ABIERTA" || estado === "ACTUAL" || !estado);

    const selectedId = wk?.id ?? null;
    const isSelectedActive = isActiveGlobal && active?.id != null && selectedId != null && active.id === selectedId;

    const hasAnyActive = isActiveGlobal || flagActiva || ((weekNav?.items || []) as any[]).some((it) => it?.activa);

    return {
      hasActiveWeek: hasAnyActive,
      isActiveSelectedWeek: isSelectedActive || flagActiva,
    };
  }, [weekState?.active_week, weekNav?.context, weekNav?.items, selectedWeek]);

  const canFinish = isActiveSelectedWeek;

  // ───────────────────────────────────────────────────────────────────────────
  // Acciones semana
  // ───────────────────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    setActionError(null);
    if (!bodegaId || !temporadaId) return;
    try {
      setBusyStart(true);
      const from = weekValue.from;
      await apiStartWeek?.(from);

      await refetchWeekState();

      markForRefetch?.("summary");
      markForRefetch?.("recepciones");
      markForRefetch?.("despachos");
      applyMarkedRefetch?.();
    } catch (e: any) {
      setActionError(e?.message || "No se pudo iniciar la semana.");
    } finally {
      setBusyStart(false);
    }
  }, [apiStartWeek, bodegaId, temporadaId, weekValue.from, markForRefetch, applyMarkedRefetch, refetchWeekState]);

  const handleFinish = useCallback(async () => {
    setActionError(null);
    if (!bodegaId || !temporadaId) return;
    try {
      setBusyFinish(true);
      const to = weekValue.to;
      await apiFinishWeek?.(to);

      await refetchWeekState();

      markForRefetch?.("summary");
      markForRefetch?.("recepciones");
      markForRefetch?.("despachos");
      applyMarkedRefetch?.();
    } catch (e: any) {
      setActionError(e?.message || "No se pudo finalizar la semana.");
    } finally {
      setBusyFinish(false);
    }
  }, [apiFinishWeek, bodegaId, temporadaId, weekValue.to, markForRefetch, applyMarkedRefetch, refetchWeekState]);

  // ───────────────────────────────────────────────────────────────────────────
  // Lógica de botón Iniciar (UX final)
  // ───────────────────────────────────────────────────────────────────────────
  const isSameRangeAsSelectedWeek = useMemo(() => {
    const sw: any = selectedWeek;
    if (!sw || !weekValue.from || !weekValue.to) return false;
    const fromSel = sw.fecha_desde || sw.inicio;
    const toSel = sw.fecha_hasta || sw.fin;
    return fromSel === weekValue.from && toSel === weekValue.to;
  }, [selectedWeek, weekValue.from, weekValue.to]);

  const disableStartButton = !bodegaId || busyStart || hasActiveWeek || isSameRangeAsSelectedWeek;

  const startTooltip = !bodegaId
    ? "Selecciona una bodega válida."
    : hasActiveWeek
      ? "Ya existe una semana abierta para esta bodega y temporada."
      : isSameRangeAsSelectedWeek
        ? "Esta semana ya está registrada. Ajusta el rango para iniciar una nueva."
        : "Iniciar semana";

  // Empaque → manda al bloque de Recepciones (sin duplicar lógica)
  const handleGoPendientesEmpaque = useCallback(() => {
    setForcedOpen({ key: "recepciones", token: Date.now() });
    window.setTimeout(() => {
      recepcionesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <Box
      p={{ xs: 1.5, sm: 2, md: 2.5 }}
      component={motion.div}
      {...pageTransition}
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(
          theme.palette.background.default,
          0.8
        )} 100%)`,
        minHeight: "100vh",
      }}
    >
      <Paper
        elevation={1}
        sx={{
          borderRadius: { xs: 2, sm: 3, md: 4 },
          overflow: "hidden",
          backgroundColor: "background.paper",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: { xs: "0 2px 12px rgba(0,0,0,0.04)", md: "0 4px 24px rgba(0,0,0,0.06)" },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(
              theme.palette.background.paper,
              1
            )} 100%)`,
            p: { xs: 1.5, sm: 2, md: 3 },
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box
            display="grid"
            gap={{ xs: 1.5, sm: 2 }}
            sx={{
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              alignItems: "center"
            }}
          >
            <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }} flexWrap="wrap">
              <Box
                sx={{
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <TrendingUpIcon sx={{ color: "white", fontSize: { xs: 18, sm: 22 } }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
                    fontWeight: 800,
                    letterSpacing: -0.5,
                    background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(
                      theme.palette.text.primary,
                      0.8
                    )} 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 1.1,
                    mb: 0.5,
                  }}
                >
                  Tablero de Bodega
                </Typography>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Chip
                    label={isMobile ? `T. ${weekNav?.context?.temporada_label ?? temporadaId}` : temporadaChipLabel}
                    size="small"
                    color="primary"
                    variant="filled"
                    sx={{
                      height: { xs: 22, sm: 24 },
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      fontWeight: 600,
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.dark,
                      "& .MuiChip-label": { px: { xs: 1, sm: 1.5 } },
                    }}
                  />
                  {hasWeeks && (
                    <Chip
                      icon={<CalendarTodayIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                      label={`Semana ${semanaIndex ?? "--"}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: { xs: 22, sm: 24 },
                        fontSize: { xs: "0.65rem", sm: "0.75rem" },
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        color: theme.palette.primary.dark,
                        "& .MuiChip-label": { px: { xs: 1, sm: 1.5 } },
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {bodegaId && bodegaId > 0 && (
              <Box display="flex" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                <QuickActions
                  bodegaId={bodegaId}
                  temporadaId={temporadaId}
                  onNavigate={(href) => navigate(withPreservedParams(href))}
                  dense
                  pill
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Subheader sticky */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: (t) => t.zIndex.appBar - 1,
            px: { xs: 1.5, sm: 2, md: 3 },
            py: { xs: 1.5, sm: 2 },
            backgroundColor: alpha(theme.palette.background.paper, 0.96),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            backdropFilter: "saturate(180%) blur(12px)",
            WebkitBackdropFilter: "saturate(180%) blur(12px)",
          }}
        >
          {/* Primera fila: WeekSwitcher + Info + Estado */}
          <Box
            display="flex"
            alignItems="center"
            gap={{ xs: 1.5, sm: 2, md: 3 }}
            flexWrap="wrap"
            mb={{ xs: 1.5, md: 0 }}
            component={motion.div}
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            <Box component={motion.div} variants={sectionTransition} sx={{ flexGrow: { xs: 1, md: 0 } }}>
              <WeekSwitcher
                value={weekValue}
                onChange={handleWeekChange}
                onPrev={goPrevWeek}
                onNext={goNextWeek}
                disabled={!hasWeeks}
                disablePrev={disablePrev}
                disableNext={disableNext}
              />
            </Box>

            <Box
              display="flex"
              alignItems="center"
              gap={{ xs: 1, sm: 1.5 }}
              component={motion.div}
              variants={sectionTransition}
              sx={{
                flexGrow: { xs: 1, md: 0 },
                justifyContent: { xs: "space-between", md: "flex-start" }
              }}
            >
              {hasWeeks && !isMobile && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontSize: { xs: "0.75rem", sm: "0.875rem" }
                  }}
                >
                  <CalendarTodayIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />
                  {rangoPretty || "—"}
                </Typography>
              )}

              {hasWeeks &&
                (isActiveSelectedWeek ? (
                  <Chip
                    label="Activa"
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.625rem", sm: "0.6875rem" },
                      height: { xs: 20, sm: 24 },
                      borderRadius: 1.5,
                      background: alpha(theme.palette.success.main, 0.12),
                      color: theme.palette.success.dark,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                      "& .MuiChip-label": { px: { xs: 1, sm: 1.5 } },
                    }}
                  />
                ) : (
                  <Chip
                    label="Cerrada"
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.625rem", sm: "0.6875rem" },
                      height: { xs: 20, sm: 24 },
                      borderRadius: 1.5,
                      background: alpha(theme.palette.grey[500], 0.12),
                      color: theme.palette.text.secondary,
                      border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      "& .MuiChip-label": { px: { xs: 1, sm: 1.5 } },
                    }}
                  />
                ))}
            </Box>
          </Box>

          {/* Alerta de Semana Caducada */}
          <AnimatePresence>
            {hookAny.isExpiredWeek && (
              <Box
                component={motion.div as any}
                initial={{ opacity: 0, height: 0, mb: 0 }}
                animate={{ opacity: 1, height: "auto", mb: 16 }}
                exit={{ opacity: 0, height: 0, mb: 0 }}
                sx={{ width: "100%", overflow: "hidden" }}
              >
                <Alert
                  severity="error"
                  variant="filled"
                  sx={{
                    borderRadius: 2,
                    fontWeight: 500,
                    boxShadow: theme.shadows[2],
                    ".MuiAlert-message": { width: "100%" }
                  }}
                  action={
                    !isMobile && (
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleFinish}
                        disabled={busyFinish}
                        sx={{ fontWeight: 700, bgcolor: "rgba(255,255,255,0.2)" }}
                      >
                        Finalizar Ahora
                      </Button>
                    )
                  }
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    Semana Caducada
                  </Typography>
                  <Typography variant="body2">
                    Esta semana ha excedido su duración máxima de 7 días. El sistema ha bloqueado nuevas operaciones.
                    Debes <strong>finalizarla ahora</strong> para continuar operando.
                  </Typography>
                  {isMobile && (
                    <Button
                      variant="contained"
                      color="inherit"
                      onClick={handleFinish}
                      disabled={busyFinish}
                      sx={{ mt: 1, color: "error.main", bgcolor: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }}
                      size="small"
                      fullWidth
                    >
                      Finalizar Ahora
                    </Button>
                  )}
                </Alert>
              </Box>
            )}
          </AnimatePresence>

          {/* Segunda fila: Botones de acción */}
          <Box
            display="flex"
            alignItems="center"
            gap={{ xs: 0.75, sm: 1 }}
            component={motion.div}
            variants={sectionTransition}
            mt={{ xs: 1.5, md: 2 }}
            flexWrap="wrap"
          >
            <Tooltip title={startTooltip}>
              <span>
                {isMobile ? (
                  <IconButton
                    size="small"
                    color="primary"
                    disabled={disableStartButton}
                    onClick={handleStart}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: theme.palette.primary.main,
                      color: "white",
                      "&:hover": { backgroundColor: theme.palette.primary.dark },
                      "&.Mui-disabled": {
                        backgroundColor: alpha(theme.palette.primary.main, 0.14),
                        color: alpha(theme.palette.primary.contrastText, 0.6),
                      },
                    }}
                  >
                    {busyStart ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon fontSize="small" />}
                  </IconButton>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={busyStart ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                    disabled={disableStartButton}
                    onClick={handleStart}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                      px: 2,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      boxShadow: "none",
                      "&.Mui-disabled": {
                        background: alpha(theme.palette.primary.main, 0.14),
                        color: alpha(theme.palette.primary.contrastText, 0.6),
                        "& .MuiButton-startIcon": {
                          color: alpha(theme.palette.primary.contrastText, 0.6),
                        },
                      },
                    }}
                  >
                    Iniciar
                  </Button>
                )}
              </span>
            </Tooltip>

            <Tooltip title={!isActiveSelectedWeek ? "No hay semana abierta para cerrar" : "Finalizar semana"}>
              <span>
                {isMobile ? (
                  <IconButton
                    size="small"
                    disabled={!bodegaId || busyFinish || !isActiveSelectedWeek || !canFinish}
                    onClick={handleFinish}
                    sx={{
                      borderRadius: 2,
                      border: `2px solid ${theme.palette.primary.main}`,
                      color: theme.palette.primary.main,
                      "&.Mui-disabled": {
                        borderColor: alpha(theme.palette.action.disabled, 0.3),
                        color: theme.palette.action.disabled,
                      },
                    }}
                  >
                    {busyFinish ? <CircularProgress size={16} color="inherit" /> : <StopIcon fontSize="small" />}
                  </IconButton>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={busyFinish ? <CircularProgress size={16} /> : <StopIcon />}
                    disabled={!bodegaId || busyFinish || !isActiveSelectedWeek || !canFinish}
                    onClick={handleFinish}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                      px: 2,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      borderWidth: 2,
                      "&:hover": { borderWidth: 2 },
                    }}
                  >
                    Finalizar
                  </Button>
                )}
              </span>
            </Tooltip>

            {!isMobile && (
              <Tooltip title="Reporte (pendiente de implementación)">
                <span>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AssessmentIcon />}
                    disabled
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                      px: 2,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" }
                    }}
                  >
                    Reporte
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>

          {!!actionError && (
            <Box mt={1.5}>
              <Alert
                severity="error"
                onClose={() => setActionError(null)}
                sx={{
                  borderRadius: 2,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  backgroundColor: alpha(theme.palette.error.main, 0.04),
                }}
              >
                {actionError}
              </Alert>
            </Box>
          )}
        </Box>

        {/* Cuerpo semanal (Acordeón: 1 abierto por defecto) */}
        <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: 1 }}>
          <AnimatePresence initial={false} mode="wait">
            <Box component={motion.div} key={weekValue.from} {...pageTransition}>
              <TableroSectionsAccordion
                isActiveSelectedWeek={isActiveSelectedWeek}
                isExpiredWeek={hookAny.isExpiredWeek}
                forcedOpen={forcedOpen}
                resumen={
                  <ResumenSection
                    items={kpiCards}
                    loading={!!isLoadingSummary}
                    error={errorSummary}
                    onRetry={() => refetchSummary?.()}
                  />
                }
                recepciones={
                  <Box ref={recepcionesRef}>
                    <RecepcionesSection
                      bodegaId={bodegaId!}
                      temporadaId={temporadaId}
                      hasWeeks={hasWeeks}
                      semanaIndex={semanaIndex}
                      selectedWeek={selectedWeek}
                      isActiveSelectedWeek={isActiveSelectedWeek}
                      isExpiredWeek={hookAny.isExpiredWeek}
                    />
                  </Box>
                }
                empaque={<EmpaqueSection onVerPendientes={handleGoPendientesEmpaque} />}
                logistica={
                  <LogisticaSection
                    hasWeeks={hasWeeks}
                    semanaIndex={semanaIndex}
                    rows={(hookAny?.queueLogistica?.rows ?? []) as any[]}
                    meta={hookAny?.queueLogistica?.meta ?? { page: 1, page_size: 10, total: 0 }}
                    loading={!!hookAny?.isLoadingLogistica}
                    onPageChange={hookAny?.onPageChangeLogistica ?? (() => { })}
                  />
                }
              />
            </Box>
          </AnimatePresence>
        </Box>
      </Paper >
    </Box >
  );
};

export default TableroBodegaPage;