// frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  AlertTitle,
  Tooltip,
  IconButton,
  Button,
  Divider,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import InventoryIcon from "@mui/icons-material/Inventory";

import { useTableroBodega } from "../hooks/useTableroBodega";
import KpiCards from "../components/tablero/KpiCards";
import WeekSwitcher from "../components/tablero/WeekSwitcher";
import QuickActions from "../components/tablero/QuickActions";
import ResumenLogistica from "../components/tablero/ResumenLogistica";

import RulesBanner from "../components/capturas/RulesBanner";
import CapturasToolbar from "../components/capturas/CapturasToolbar";
import CapturasTable from "../components/capturas/CapturasTable";
import RecepcionFormModal from "../components/capturas/RecepcionFormModal";

import { setBreadcrumbs } from "../../../global/store/breadcrumbsSlice";
import { formatDateISO, parseLocalDateStrict } from "../../../global/utils/date";

import { getWeekCurrent } from "../services/tableroBodegaService";
import type { WeekCurrentResponse } from "../types/tableroBodegaTypes";

import useCapturas from "../hooks/useCapturas";

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

function withPreservedParams(
  href: string,
  preserveKeys: string[] = ["temporada", "bodega", "week_id"]
) {
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

  const temporadaParam = sp.get("temporada");
  const temporadaId = Number(temporadaParam);
  const bodegaParam = sp.get("bodega");
  const bodegaId = bodegaParam ? Number(bodegaParam) : undefined;

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

  // week_id en URL
  const weekIdParam = sp.get("week_id");
  const urlWeekId = weekIdParam ? Number(weekIdParam) : null;

  // Estado: semana activa actual (desde backend /week/current/)
  const [weekState, setWeekState] = useState<WeekCurrentResponse | null>(null);
  const [busyStart, setBusyStart] = useState(false);
  const [busyFinish, setBusyFinish] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Semana seleccionada (combinando barra de semanas + fallback a /week/current/)
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

  // Si existe una semana ABIERTA en weeksNav y la URL apunta a una cerrada (o no hay selección), forzamos la activa
  useEffect(() => {
    const items = (weekNav?.items || []) as any[];
    if (!items.length) return;

    const openWeek = items.find((it: any) => it?.activa);
    if (!openWeek) return;

    const selId = (selectedWeek as any)?.id;
    if (selId === openWeek.id) return;

    const next = new URLSearchParams(sp);
    next.set("week_id", String(openWeek.id));
    setSp(next, { replace: true });
  }, [weekNav?.items, selectedWeek, sp, setSp]);

  // Estado local del rango que maneja WeekSwitcher (from/to/isoSemana)
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

  // Sincronizar weekValue cuando cambia la semana seleccionada desde barra de semanas
  useEffect(() => {
    const sw: any = selectedWeek;
    const from = sw?.fecha_desde || sw?.inicio;
    const to = sw?.fecha_hasta || sw?.fin;
    if (from && to) {
      setWeekValue((prev) =>
        prev.from === from && prev.to === to
          ? prev
          : { from, to, isoSemana: "MANUAL" }
      );
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

  // Si backend reporta una semana activa diferente a la que marca la URL, forzamos URL a la activa
  useEffect(() => {
    const activeId = (weekState as any)?.active_week?.id;
    if (!activeId) return;
    if (urlWeekId === activeId) return;
    const next = new URLSearchParams(sp);
    next.set("week_id", String(activeId));
    setSp(next, { replace: true });
  }, [weekState?.active_week, urlWeekId, sp, setSp]);

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
  }, [
    dispatch,
    bodegaId,
    temporadaId,
    weekNav?.context?.bodega_label,
    weekNav?.context?.temporada_label,
    hasWeeks,
    semanaIndex,
  ]);

  // WeekSwitcher → aplica rango al tablero y sincroniza estado weekValue
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

  const disablePrev = !hasWeeks || currentIndex <= 0;
  const disableNext =
    !hasWeeks ||
    currentIndex < 0 ||
    currentIndex >= ((weekNav?.items || []) as any[]).length - 1;

  const goPrevWeek = useCallback(() => {
    const items = (weekNav?.items || []) as any[];
    if (!items.length) return;
    const idx = currentIndex <= 0 ? 0 : currentIndex - 1;
    const target = items[idx];
    if (target?.id) {
      const next = new URLSearchParams(sp);
      next.set("week_id", String(target.id));
      setSp(next, { replace: false });
    }
  }, [weekNav?.items, currentIndex, sp, setSp]);

  const goNextWeek = useCallback(() => {
    const items = (weekNav?.items || []) as any[];
    if (!items.length) return;
    const idx = currentIndex >= items.length - 1 ? items.length - 1 : currentIndex + 1;
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

    const active =
      (weekState?.active_week as any) ??
      ((weekNav?.context as any)?.active_week as any) ??
      null;

    const estado = (active?.estado || "").toString().toUpperCase();
    const isActiveGlobal =
      !!active && (estado === "ABIERTA" || estado === "ACTUAL" || !estado);

    const selectedId = wk?.id ?? null;
    const isSelectedActive =
      isActiveGlobal && active?.id != null && selectedId != null && active.id === selectedId;

    const hasAnyActive =
      isActiveGlobal ||
      flagActiva ||
      ((weekNav?.items || []) as any[]).some((it) => it?.activa);

    return {
      hasActiveWeek: hasAnyActive,
      isActiveSelectedWeek: isSelectedActive || flagActiva,
    };
  }, [weekState?.active_week, weekNav?.context, weekNav?.items, selectedWeek]);

  const canFinish = isActiveSelectedWeek;

  // ───────────────────────────────────────────────────────────────────────────
  // Acciones semana
  // ───────────────────────────────────────────────────────────────────────────
  const handleStart = useCallback(
    async () => {
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
    },
    [
      apiStartWeek,
      bodegaId,
      temporadaId,
      weekValue.from,
      markForRefetch,
      applyMarkedRefetch,
      refetchWeekState,
    ]
  );

  const handleFinish = useCallback(
    async () => {
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
    },
    [
      apiFinishWeek,
      bodegaId,
      temporadaId,
      weekValue.to,
      markForRefetch,
      applyMarkedRefetch,
      refetchWeekState,
    ]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Recepciones (tabla completa gobernada por semana)
  // ───────────────────────────────────────────────────────────────────────────
  const {
    items: capRows,
    meta: capMeta,
    loading: capLoading,
    saving: capSaving,
    canOperate: capCanOperate,
    reasonDisabled: capReasonDisabled,
    setBodega: capSetBodega,
    setTemporada: capSetTemporada,
    setSemana: capSetSemana,
    setPage: capSetPage,
    refetch: capRefetch,
    create: capCreate,
    update: capUpdate,
    archivar: capArchivar,
    restaurar: capRestaurar,
    remove: capRemove,
  } = useCapturas();

  // Sincronizar filtros con contexto
  useEffect(() => {
    if (bodegaId) capSetBodega(bodegaId);
    if (temporadaId) capSetTemporada(temporadaId);
  }, [bodegaId, temporadaId, capSetBodega, capSetTemporada]);

  const selectedWeekId = (selectedWeek as any)?.id as number | undefined;
  const lastSemanaRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    capSetSemana(selectedWeekId);
    if (!capCanOperate) return;

    // Si no hay semanas publicadas en backend, cargamos sin filtro de semana.
    if (!hasWeeks) {
      capRefetch();
      return;
    }

    if (!selectedWeekId) return;
    if (lastSemanaRef.current === selectedWeekId) return;
    lastSemanaRef.current = selectedWeekId;
    capRefetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekId, capCanOperate, capSetSemana, capRefetch, hasWeeks]);

  // Botonera / banner en base a capacidad + semana activa robusta
  const recepDisabled = !capCanOperate ? true : (hasWeeks ? !isActiveSelectedWeek : false);
  const recepReason = !capCanOperate
    ? capReasonDisabled || "Selecciona bodega y temporada."
    : (hasWeeks && !isActiveSelectedWeek)
    ? "Semana cerrada o no iniciada."
    : undefined;

  const onPageCapturas = useCallback(
    (n: number) => {
      capSetPage(n);
      capRefetch();
    },
    [capSetPage, capRefetch]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Modal de Recepciones en tablero
  // ───────────────────────────────────────────────────────────────────────────
  const [openRecepcionModal, setOpenRecepcionModal] = useState(false);
  const [editingRecepcion, setEditingRecepcion] = useState<any | null>(null);

  const weekRange = useMemo(() => {
    const sw: any = selectedWeek;
    if (!sw) return undefined;
    return {
      from: sw.fecha_desde || sw.inicio,
      to: sw.fecha_hasta || sw.fin,
    };
  }, [selectedWeek]);

  // Nueva recepción → abre modal (sin navegar)
  const handleNewRecepcion = useCallback(() => {
    if (!bodegaId || !temporadaId) return;
    setEditingRecepcion(null);
    setOpenRecepcionModal(true);
  }, [bodegaId, temporadaId]);

  // Edición desde la tabla
  const handleEditRecepcion = useCallback((row: any) => {
    setEditingRecepcion(row);
    setOpenRecepcionModal(true);
  }, []);

  const handleArchiveRecepcion = useCallback(
    async (row: any) => {
      await capArchivar(row.id);
      await capRefetch();
    },
    [capArchivar, capRefetch]
  );

  const handleRestoreRecepcion = useCallback(
    async (row: any) => {
      await capRestaurar(row.id);
      await capRefetch();
    },
    [capRestaurar, capRefetch]
  );

  const handleDeleteRecepcion = useCallback(
    async (row: any) => {
      await capRemove(row.id);
      await capRefetch();
    },
    [capRemove, capRefetch]
  );

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

  const disableStartButton =
    !bodegaId || busyStart || hasActiveWeek || isSameRangeAsSelectedWeek;

  const startTooltip = !bodegaId
    ? "Selecciona una bodega válida."
    : hasActiveWeek
    ? "Ya existe una semana abierta para esta bodega y temporada."
    : isSameRangeAsSelectedWeek
    ? "Esta semana ya está registrada. Ajusta el rango para iniciar una nueva."
    : "Iniciar semana";

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <Box
      p={2.5}
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
          borderRadius: 4,
          overflow: "hidden",
          backgroundColor: "background.paper",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(
              theme.palette.background.paper,
              1
            )} 100%)`,
            p: { xs: 2, md: 3 },
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box
            display="grid"
            gap={2}
            sx={{ gridTemplateColumns: { xs: "1fr", md: "1fr auto" }, alignItems: "center" }}
          >
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <TrendingUpIcon sx={{ color: "white", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
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
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Chip
                    label={temporadaChipLabel}
                    size="small"
                    color="primary"
                    variant="filled"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.dark,
                    }}
                  />
                  {hasWeeks && (
                    <Chip
                      icon={<CalendarTodayIcon fontSize="small" />}
                      label={`Semana ${semanaIndex ?? "--"}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        color: theme.palette.primary.dark,
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
            px: { xs: 2, md: 3 },
            py: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.96),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            backdropFilter: "saturate(180%) blur(12px)",
            WebkitBackdropFilter: "saturate(180%) blur(12px)",
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            gap={3}
            flexWrap="wrap"
            component={motion.div}
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            <Box component={motion.div} variants={sectionTransition}>
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

            <Box display="flex" alignItems="center" gap={1.5} component={motion.div} variants={sectionTransition}>
              {hasWeeks && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CalendarTodayIcon fontSize="small" />
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
                      fontSize: "0.6875rem",
                      height: 24,
                      borderRadius: 1.5,
                      background: alpha(theme.palette.success.main, 0.12),
                      color: theme.palette.success.dark,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />
                ) : (
                  <Chip
                    label="Cerrada"
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.6875rem",
                      height: 24,
                      borderRadius: 1.5,
                      background: alpha(theme.palette.grey[500], 0.12),
                      color: theme.palette.text.secondary,
                      border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />
                ))}
            </Box>

            <Box flexGrow={1} />

            <Box display="flex" alignItems="center" gap={1} component={motion.div} variants={sectionTransition}>
              <Tooltip title={startTooltip}>
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={busyStart ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                    disabled={disableStartButton}
                    onClick={handleStart}
                    sx={{ borderRadius: 3, textTransform: "none", fontWeight: 600, px: 2, boxShadow: "none" }}
                  >
                    Iniciar
                  </Button>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  !isActiveSelectedWeek
                    ? "No hay semana abierta para cerrar"
                    : (() => {
                        const to = (selectedWeek as any)?.fecha_hasta || (selectedWeek as any)?.fin;
                        return to ? `Finaliza al completar 7 días (${to})` : "Finalizar semana";
                      })()
                }
              >
                <span>
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
                      borderWidth: 2,
                      "&:hover": { borderWidth: 2 },
                    }}
                  >
                    Finalizar
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title="Reporte (pendiente de implementación)">
                <span>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AssessmentIcon />}
                    disabled
                    sx={{ borderRadius: 3, textTransform: "none", fontWeight: 600, px: 2 }}
                  >
                    Reporte
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {!!actionError && (
            <Box mt={1}>
              <Alert
                severity="error"
                onClose={() => setActionError(null)}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  backgroundColor: alpha(theme.palette.error.main, 0.04),
                }}
              >
                {actionError}
              </Alert>
            </Box>
          )}
        </Box>

        {/* Cuerpo semanal */}
        <Box sx={{ px: { xs: 2, md: 3 }, py: 1 }}>
          <AnimatePresence initial={false} mode="wait">
            <Box component={motion.div} key={weekValue.from} {...pageTransition}>
              {/* KPIs */}
              <Box sx={{ py: 3 }}>
                {errorSummary ? (
                  <Alert
                    severity="error"
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                      backgroundColor: alpha(theme.palette.error.main, 0.04),
                      mb: 2,
                    }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => refetchSummary()}
                        sx={{ fontWeight: 600 }}
                      >
                        Reintentar
                      </Button>
                    }
                  >
                    <AlertTitle sx={{ fontWeight: 700 }}>Error al cargar KPIs</AlertTitle>
                    {String((errorSummary as any)?.message ?? "Error desconocido")}
                  </Alert>
                ) : (
                  <KpiCards items={kpiCards} loading={isLoadingSummary} />
                )}
              </Box>

              <Divider sx={{ my: 3, borderColor: alpha(theme.palette.divider, 0.1), borderWidth: 1 }} />

              {/* Recepciones */}
              <Box
                sx={{ py: 3 }}
                component={motion.section}
                variants={sectionTransition}
                initial="initial"
                animate="animate"
              >
                <SectionHeader
                  icon={<InventoryIcon sx={{ color: "primary.main", fontSize: 28 }} />}
                  title="Recepciones"
                  subtitle={hasWeeks ? `Semana ${semanaIndex ?? "—"}` : undefined}
                />

                <Box sx={{ mb: 2 }}>
                  <RulesBanner
                    blocked={recepDisabled}
                    reason={recepReason}
                    range={
                      hasWeeks
                        ? {
                            from: (selectedWeek as any)?.fecha_desde || (selectedWeek as any)?.inicio,
                            to: (selectedWeek as any)?.fecha_hasta || (selectedWeek as any)?.fin,
                          }
                        : undefined
                    }
                  />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  <CapturasToolbar
                    bodegaId={bodegaId}
                    temporadaId={temporadaId}
                    disabledActions={recepDisabled}
                    disabledReason={recepReason}
                    onNewRecepcion={handleNewRecepcion}
                  />
                </Box>

                {/* Modal de Recepción en Tablero */}
                <RecepcionFormModal
                  open={openRecepcionModal}
                  onClose={() => {
                    setOpenRecepcionModal(false);
                    setEditingRecepcion(null);
                  }}
                  initial={editingRecepcion}
                  bodegaId={bodegaId}
                  temporadaId={temporadaId}
                  weekRange={weekRange}
                  blocked={recepDisabled}
                  blockReason={recepReason}
                  busy={!!capSaving}
                  onCreate={async (payload: any) => {
                    try {
                      await capCreate(payload);
                      await capRefetch();
                      setOpenRecepcionModal(false);
                      setEditingRecepcion(null);
                    } catch {
                      // toast ya mostrado por servicio; mantenemos modal abierto
                    }
                  }}
                  onUpdate={async (id: number, payload: any) => {
                    try {
                      await capUpdate(id, payload);
                      await capRefetch();
                      setOpenRecepcionModal(false);
                      setEditingRecepcion(null);
                    } catch {
                      // toast ya mostrado por servicio; mantenemos modal abierto
                    }
                  }}
                />

                <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
                  <CapturasTable
                    items={capRows}
                    meta={capMeta}
                    loading={capLoading}
                    onPageChange={onPageCapturas}
                    onEdit={handleEditRecepcion}
                    onArchive={handleArchiveRecepcion}
                    onRestore={handleRestoreRecepcion}
                    onDelete={handleDeleteRecepcion}
                    blocked={recepDisabled}
                  />
                </Paper>
              </Box>

              <Divider sx={{ my: 3, borderColor: alpha(theme.palette.divider, 0.1), borderWidth: 1 }} />

              {/* Logística */}
              <Box
                sx={{ py: 3 }}
                component={motion.section}
                variants={sectionTransition}
                initial="initial"
                animate="animate"
              >
                <SectionHeader
                  icon={<LocalShippingIcon sx={{ color: "primary.main", fontSize: 28 }} />}
                  title="Despachos / Logística"
                  subtitle={hasWeeks ? `Semana ${semanaIndex ?? "—"}` : undefined}
                />
                <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
                  <ResumenLogistica
                    rows={(hookAny?.queueLogistica?.rows ?? []) as any[]}
                    meta={hookAny?.queueLogistica?.meta ?? { page: 1, page_size: 10, total: 0 }}
                    loading={!!hookAny?.isLoadingLogistica}
                    onPageChange={hookAny?.onPageChangeLogistica}
                  />
                </Paper>
              </Box>
            </Box>
          </AnimatePresence>
        </Box>
      </Paper>
    </Box>
  );
};

// Header compacto reutilizable
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({
  icon,
  title,
  subtitle,
}) => {
  const theme = useTheme();
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
      <Box display="flex" alignItems="center" gap={1.5}>
        {icon}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      <Tooltip title="Refrescar bloque (cuando se conecte al servicio)">
        <span>
          <IconButton
            size="medium"
            disabled
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              borderRadius: 2,
              "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default TableroBodegaPage;
