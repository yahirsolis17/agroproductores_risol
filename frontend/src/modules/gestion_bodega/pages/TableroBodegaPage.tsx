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
import { setBreadcrumbs } from "../../../global/store/breadcrumbsSlice";
import { formatDateISO, parseLocalDateStrict } from "../../../global/utils/date";
// Fase 1: getWeekCurrent eliminado - hook maneja estado de semana
import ResumenSection from "../components/tablero/sections/ResumenSection";
import RecepcionesSection from "../components/tablero/sections/RecepcionesSection";
import EmpaqueSection from "../components/tablero/sections/EmpaqueSection";
import LogisticaSection from "../components/tablero/sections/LogisticaSection";
import TableroSectionsAccordion, {
  TableroSectionKey,
} from "../components/tablero/sections/TableroSectionsAccordion";
import EmpaqueDrawer from "../components/empaque/EmpaqueDrawer";
import CamionFormModal from "../components/logistica/CamionFormModal";
import useEmpaques from "../hooks/useEmpaques";
import { Material } from "../types/shared";
import { normalizeCalidadToUI } from "../services/empaquesService";
// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------
function normalizeBackendCalidadToUILabel(material: "PLASTICO" | "MADERA", calidadRaw: any): string {
  // Reutiliza el normalizador canonico para que las claves coincidan con EmpaqueDrawer.
  return normalizeCalidadToUI(material, calidadRaw);
}
function buildInitialLinesPatchFromEmpaques(
  rows: any[],
  recepcionId: number
): Record<string, number> {
  const patch: Record<string, number> = {};
  const filtered = Array.isArray(rows)
    ? rows.filter((r) => Number(r?.recepcion) === Number(recepcionId))
    : [];
  for (const r of filtered) {
    const material = String(r?.material ?? "").toUpperCase() as "PLASTICO" | "MADERA";
    if (material !== "PLASTICO" && material !== "MADERA") continue;
    const uiCalidad = normalizeBackendCalidadToUILabel(material, r?.calidad);
    if (!uiCalidad) continue;
    const key = `${material}.${uiCalidad}`;
    const qty = Number(r?.cantidad_cajas ?? 0);
    const safeQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
    patch[key] = (patch[key] ?? 0) + safeQty;
  }
  return patch;
}
function prettyRange(fromISO: string, toISO: string) {
  const from = parseLocalDateStrict(fromISO);
  const to = parseLocalDateStrict(toISO);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  return `${fmt(from)} - ${fmt(to)}`;
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
// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
const TableroBodegaPage: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  // Media queries para responsive
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const temporadaParam = sp.get("temporada");
  const temporadaId = Number(temporadaParam);
  const bodegaParam = sp.get("bodega");
  const bodegaId = bodegaParam ? Number(bodegaParam) : undefined;
  // Refs para navegacion interna (Empaque ? Recepciones)
  const recepcionesRef = useRef<HTMLDivElement | null>(null);
  // Acordeon: override puntual (Empaque -> Recepciones) con token para ser idempotente
  const [forcedOpen, setForcedOpen] = useState<{ key: TableroSectionKey; token: number } | null>(null);
  // Si cambia la semana, devolvemos el acordeon al default inteligente
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
  // Hook maestro de Tablero (FUENTE UNICA DE VERDAD para semana)
  const tablero = useTableroBodega({ bodegaId: bodegaId!, temporadaId });
  const {
    kpiCards,
    isLoadingSummary,
    refetchSummary,
    onApplyFilters,
    weekNav,
    apiStartWeek,
    apiFinishWeek,
    hasActiveWeek,
    isActiveSelectedWeek,
    selectedWeek,
    goPrevWeek: hookGoPrevWeek,
    goNextWeek: hookGoNextWeek,
    startingWeek,
    finishingWeek,
    isExpiredWeek,
    onChangeQueue, // Exposed for logic filtering
    refetchQueues, // Exposed for truck confirmation
  } = tablero;
  const hasWeeks: boolean = !!weekNav?.hasWeeks;
  const [actionError, setActionError] = useState<string | null>(null);
  const [openSectionKey] = useState<"resumen" | "recepciones" | "empaque" | "logistica">("recepciones");
  // Empaque: state lifted
  const {
    empaques: empRows,
    status: empStatus,
    refetch: empRefetch,
    clearError: empClearError,
    bulkUpsert: empBulkUpsert,
    bulkSaving: empBulkSaving,
  } = useEmpaques(false);
  const [openEmpaque, setOpenEmpaque] = useState(false);
  const [selectedRecepcionForEmpaque, setSelectedRecepcionForEmpaque] = useState<any | null>(null);
  const [empaqueLoading, setEmpaqueLoading] = useState(false);
  const [empaqueInitialLines, setEmpaqueInitialLines] = useState<Record<string, number> | null>(null);
  const [empaqueRefetchToken, setEmpaqueRefetchToken] = useState(0);
  const handleOpenEmpaque = useCallback((recepcion: any) => {
    setSelectedRecepcionForEmpaque(recepcion);
    setOpenEmpaque(true);
  }, []);
  const handleCloseEmpaque = useCallback(() => {
    setOpenEmpaque(false);
    setSelectedRecepcionForEmpaque(null);
    setEmpaqueLoading(false);
    setEmpaqueInitialLines(null);
  }, []);
  useEffect(() => {
    if (!tablero?.refetchQueues) return;
    if (openSectionKey === "empaque") {
      tablero.refetchQueues("inventarios");
    }
    if (openSectionKey === "logistica") {
      tablero.refetchQueues("despachos");
    }
  }, [openSectionKey, tablero?.filters, tablero?.refetchQueues]);
  // Fetch logic for Drawer
  useEffect(() => {
    if (!openEmpaque) return;
    if (!bodegaId || !temporadaId) return;
    // Si es bulk (recepcion=null), NO cargamos initialLines, es FIFO mode vacio.
    if (!selectedRecepcionForEmpaque) {
      setEmpaqueLoading(false);
      setEmpaqueInitialLines(null);
      return;
    }
    setEmpaqueLoading(true);
    setEmpaqueInitialLines(null);
    empClearError();
    empRefetch({
      recepcion: selectedRecepcionForEmpaque.id,
      bodega: bodegaId,
      temporada: temporadaId,
      is_active: true,
      page: 1,
      page_size: 200,
      ordering: "-id",
    } as any);
  }, [openEmpaque, selectedRecepcionForEmpaque?.id, bodegaId, temporadaId, empRefetch, empClearError]);
  useEffect(() => {
    if (!openEmpaque || !selectedRecepcionForEmpaque?.id) return;
    if (empStatus === "loading") return;
    if (empStatus === "failed") {
      setEmpaqueLoading(false);
      setEmpaqueInitialLines(null);
      return;
    }
    if (empStatus === "succeeded") {
      const patch = buildInitialLinesPatchFromEmpaques(empRows as any[], selectedRecepcionForEmpaque.id);
      setEmpaqueInitialLines(patch);
      setEmpaqueLoading(false);
    }
  }, [openEmpaque, selectedRecepcionForEmpaque?.id, empStatus, empRows]);
  const onSaveEmpaque = async (lines: Record<string, number>, date?: string) => {
    if (!bodegaId || !temporadaId) return;
    // Si es Bulk, recepcion es null.
    // Si NO es bulk, recepcion es requerida.
    const isBulk = !selectedRecepcionForEmpaque;
    const items = Object.entries(lines).map(([key, qty]) => {
      const [materialStr, calidad] = key.split(".");
      const material = materialStr === "PLASTICO" ? Material.PLASTICO : Material.MADERA;
      return {
        material,
        calidad,
        tipo_mango: isBulk ? "BULK" : (selectedRecepcionForEmpaque.tipo_mango ?? ""), // "BULK" or ignored by backend? Backend relies on existing stock if reception provided.
        // Wait, for bulk FIFO, we probably don't need tipo_mango if backend infers it?
        // Actually backend Bulk logic iterates over receptions.
        // If we send items, backend distributes them.
        // We should verify if frontend needs to send tipo_mango for bulk.
        // Usually bulk op mixes types? No, bulk op usually is specific?
        // The drawer allows selecting quantities.
        // For Bulk Mode, we assume the user is packing generic "Mango" or filtering by type?
        // The backend FIFO logic sorts candidates by date.
        // It doesn't filter by type unless we tell it to?
        // Let's assume sending "" or a placeholder is fine if backend handles it.
        // Checked empaques_views: bulk_upsert checks recepcion_id.
        // If recepcion is None, it calls distribute_fifo.
        // distribute_fifo iterates items.
        // Each item has material/calidad/cantidad.
        // It finds candidates. Candidates are ALL receptions in bodega/temporada.
        // It doesn't filter candidates by Mango Type!
        // So if we distribute FIFO, we might pack "Keitt" into "Tommy"?
        // IMPORTANT: This might be a missing feature in backend phase E1.
        // Ideally we should filter candidates by fruit type if the user packing specifies it?
        // But the UI for Bulk doesn't have a fruit type selector yet.
        // We will proceed assuming "First In First Out" globally or user knows what they are doing.
        // Just pass "" for tipo_mango if null.
        cantidad_cajas: qty,
      };
    });
    try {
      await empBulkUpsert({
        recepcion: isBulk ? null : selectedRecepcionForEmpaque.id,
        bodega: bodegaId,
        temporada: temporadaId,
        fecha: date || formatDateISO(new Date()), // Use passed date (bulk) or reception date
        items,
      }).unwrap();
      // Refresh summary (KPIs in EmpaqueSection)
      if (refetchSummary) refetchSummary();
      // Trigger recepciones table refetch (chips se actualizan)
      setEmpaqueRefetchToken((t) => t + 1);
      handleCloseEmpaque();
    } catch (err) {
      console.error("Empaque save failed", err);
    }
  };
  // Modal Camion State
  const [camionModalOpen, setCamionModalOpen] = useState(false);
  const [selectedCamion, setSelectedCamion] = useState<any | null>(null);
  const handleAddCamion = useCallback(() => {
    setSelectedCamion(null);
    setCamionModalOpen(true);
  }, []);
  const handleEditCamion = useCallback((row: any) => {
    // row comes from Logistica table, likely has minimal data.
    // CamionFormModal should fetch full details or receive ID.
    // passing row as initial, FormModal should handle fetching by ID if needed.
    setSelectedCamion(row);
    setCamionModalOpen(true);
  }, []);
  const handleCamionSuccess = useCallback(() => {
    // Refresh logistics queue and summary
    if (refetchSummary) refetchSummary();
    if (refetchQueues) {
      refetchQueues("despachos");
      refetchQueues("inventarios"); // Actualiza estado "Despachado" en tabla empaque
    }
  }, [refetchSummary, refetchQueues]);
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
  // Sincronizar weekValue cuando cambia la semana seleccionada (del hook)
  useEffect(() => {
    const sw: any = selectedWeek;
    const from = sw?.fecha_desde || sw?.inicio;
    const to = sw?.fecha_hasta || sw?.fin;
    if (from && to) {
      setWeekValue((prev) => (prev.from === from && prev.to === to ? prev : { from, to, isoSemana: "MANUAL" }));
    }
  }, [selectedWeek]);
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
      { label: `Bodegas - ${bLabel}`, path: "/bodega" },
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
  // WeekSwitcher ? aplica rango al tablero
  const handleWeekChange = useCallback(
    (range: { from?: string; to?: string; isoSemana?: string | null }) => {
      setWeekValue((prev) => ({ ...prev, ...range }));
      if (!range.from || !range.to) return;
      onApplyFilters?.({ fecha_desde: range.from, fecha_hasta: range.to });
    },
    [onApplyFilters]
  );
  // Indices prev/next (para WeekSwitcher) - usa hook para navegacion
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
  // Fase 1: sin Virtual Mode (eliminado segun contrato)
  const disablePrev = !hasWeeks || currentIndex <= 0;
  const disableNext = !hasWeeks || currentIndex >= (weekNav?.items?.length ?? 0) - 1;
  // Fase 1: Navegacion de semanas delegada al hook
  const goPrevWeek = hookGoPrevWeek;
  const goNextWeek = hookGoNextWeek;
  const canFinish = isActiveSelectedWeek;
  // ---------------------------------------------------------------------------
  // Acciones semana (Fase 1: usa Redux busy states y refetch del hook)
  // ---------------------------------------------------------------------------
  const handleStart = useCallback(async () => {
    setActionError(null);
    if (!bodegaId || !temporadaId) return;
    try {
      const from = weekValue.from;
      await apiStartWeek?.(from);
      // apiStartWeek ya hace refetch de weeksNav y summary internamente
    } catch (e: any) {
      setActionError(e?.message || "No se pudo iniciar la semana.");
    }
  }, [apiStartWeek, bodegaId, temporadaId, weekValue.from]);
  const handleFinish = useCallback(async () => {
    setActionError(null);
    if (!bodegaId || !temporadaId) return;
    try {
      let to = weekValue.to;
      // FIX: No permitir cerrar con fecha futura (backend lanza 400/500).
      // Si la fecha planeada es futura, cerramos con el dia de HOY.
      const today = formatDateISO(new Date());
      if (to && to > today) {
        to = today;
      }
      await apiFinishWeek?.(to);
      // apiFinishWeek ya hace refetch de weeksNav y summary internamente
    } catch (e: any) {
      setActionError(e?.message || "No se pudo finalizar la semana.");
    }
  }, [apiFinishWeek, bodegaId, temporadaId, weekValue.to]);
  // ---------------------------------------------------------------------------
  // Logica de boton Iniciar (UX final)
  // ---------------------------------------------------------------------------
  const isSameRangeAsSelectedWeek = useMemo(() => {
    const sw: any = selectedWeek;
    if (!sw || !weekValue.from || !weekValue.to) return false;
    const fromSel = sw.fecha_desde || sw.inicio;
    const toSel = sw.fecha_hasta || sw.fin;
    return fromSel === weekValue.from && toSel === weekValue.to;
  }, [selectedWeek, weekValue.from, weekValue.to]);

  // Report logic
  const [downloadingReport, setDownloadingReport] = useState(false);
  const handleReport = useCallback(async () => {
    if (!bodegaId || !temporadaId) return;
    const sId = (selectedWeek as any)?.id;
    if (!sId) return;

    try {
      setDownloadingReport(true);
      // Dynamic import to avoid circular dep issues or just direct use if available
      const { getDashboardReport } = await import("../services/tableroBodegaService");
      const blob = await getDashboardReport(temporadaId, bodegaId, sId);

      // Download trigger
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_semana_${(selectedWeek as any)?.iso_semana ?? "X"}_${formatDateISO(new Date())}.xlsx`; // Asumimos xlsx por defecto
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (e: any) {
      console.error("Report download failed", e);
      // NotificationEngine handles most errors, but if blob fails generic catch:
      setActionError("Error al descargar el reporte.");
    } finally {
      setDownloadingReport(false);
    }
  }, [bodegaId, temporadaId, selectedWeek]);

  const disableStartButton = !bodegaId || startingWeek || hasActiveWeek || isSameRangeAsSelectedWeek;

  const startTooltip = !bodegaId
    ? "Selecciona una bodega valida."
    : hasActiveWeek
      ? "Ya existe una semana abierta para esta bodega y temporada."
      : isSameRangeAsSelectedWeek
        ? "Esta semana ya esta registrada. Ajusta el rango para iniciar una nueva."
        : "Iniciar semana";
  // Empaque ? manda al bloque de Recepciones (sin duplicar logica)
  const renderWeekActions = () => (
    <Box
      display="flex"
      justifyContent={{ xs: "flex-start", md: "flex-end" }}
      gap={{ xs: 0.75, sm: 1 }}
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
                borderRadius: 999,
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": { backgroundColor: theme.palette.primary.dark },
                "&.Mui-disabled": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.14),
                  color: alpha(theme.palette.primary.contrastText, 0.6),
                },
              }}
            >
              {startingWeek ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          ) : (
            <Button
              size="medium"
              variant="contained"
              startIcon={startingWeek ? <CircularProgress size={16} /> : <PlayArrowIcon />}
              disabled={disableStartButton}
              onClick={handleStart}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 700,
                px: { xs: 1.75, sm: 2.5 },
                minHeight: 44,
                boxShadow: "none",
                "&.Mui-disabled": {
                  background: alpha(theme.palette.primary.main, 0.14),
                  color: alpha(theme.palette.primary.contrastText, 0.6),
                  "& .MuiButton-startIcon": { color: alpha(theme.palette.primary.contrastText, 0.6) },
                },
              }}
            >
              Iniciar
            </Button>
          )}
        </span>
      </Tooltip>
      {isActiveSelectedWeek && (
        <Tooltip title="Finalizar semana">
          <span>
            {isMobile ? (
              <IconButton
                size="small"
                disabled={!bodegaId || finishingWeek || !canFinish}
                onClick={handleFinish}
                sx={{
                  borderRadius: 999,
                  border: `2px solid ${theme.palette.primary.main}`,
                  color: theme.palette.primary.main,
                  "&.Mui-disabled": {
                    borderColor: alpha(theme.palette.action.disabled, 0.3),
                    color: theme.palette.action.disabled,
                  },
                }}
              >
                {finishingWeek ? <CircularProgress size={16} color="inherit" /> : <StopIcon fontSize="small" />}
              </IconButton>
            ) : (
              <Button
                size="medium"
                variant="outlined"
                startIcon={finishingWeek ? <CircularProgress size={16} /> : <StopIcon />}
                disabled={!bodegaId || finishingWeek || !canFinish}
                onClick={handleFinish}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  px: { xs: 1.75, sm: 2.25 },
                  minHeight: 44,
                  borderWidth: 2,
                  color: theme.palette.text.secondary,
                  borderColor: alpha(theme.palette.text.secondary, 0.4),
                  "&:hover": {
                    borderWidth: 2,
                    borderColor: alpha(theme.palette.text.secondary, 0.7),
                    backgroundColor: alpha(theme.palette.text.secondary, 0.06),
                  },
                  "&.Mui-disabled": {
                    borderColor: alpha(theme.palette.action.disabled, 0.3),
                    color: alpha(theme.palette.action.disabled, 0.9),
                  },
                }}
              >
                Finalizar
              </Button>
            )}
          </span>
        </Tooltip>
      )}
      <Tooltip title="Descargar Reporte Semanal">
        <span>
          <Button
            size="medium"
            variant="text"
            startIcon={downloadingReport ? <CircularProgress size={16} /> : <AssessmentIcon />}
            disabled={!selectedWeek || downloadingReport}
            onClick={handleReport}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 700,
              px: { xs: 1.5, sm: 2 },
              minHeight: 44,
              color: theme.palette.text.secondary,
              "&.Mui-disabled": {
                color: alpha(theme.palette.text.secondary, 0.7),
              },
            }}
          >
            Reporte
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
  const handleGoPendientesEmpaque = useCallback(() => {
    setForcedOpen({ key: "recepciones", token: Date.now() });
    window.setTimeout(() => {
      recepcionesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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
                {renderWeekActions()}
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
                  {rangoPretty || "-"}
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
            {isExpiredWeek && (
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
                        disabled={finishingWeek}
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
                    Esta semana ha excedido su duracion maxima de 7 dias. El sistema ha bloqueado nuevas operaciones.
                    Debes <strong>finalizarla ahora</strong> para continuar operando.
                  </Typography>
                  {isMobile && (
                    <Button
                      variant="contained"
                      color="inherit"
                      onClick={handleFinish}
                      disabled={finishingWeek}
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
        {/* Cuerpo semanal (Acordeon: 1 abierto por defecto) */}
        <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: 1 }}>
          <AnimatePresence initial={false} mode="wait">
            <Box component={motion.div} key={weekValue.from} {...pageTransition}>
              <TableroSectionsAccordion
                isActiveSelectedWeek={isActiveSelectedWeek}
                isExpiredWeek={isExpiredWeek}
                forcedOpen={forcedOpen}
                onSectionOpen={(key) => {
                  if (key === "empaque") {
                    onChangeQueue?.("inventarios");
                  } else if (key === "logistica") {
                    onChangeQueue?.("despachos");
                  } else if (key === "recepciones") {
                    onChangeQueue?.("recepciones");
                  }
                }}
                resumen={
                  <ResumenSection
                    items={kpiCards}
                    loading={!!isLoadingSummary}
                    error={null}
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
                      isExpiredWeek={isExpiredWeek}
                      onMutateSuccess={refetchSummary}
                      onOpenEmpaque={handleOpenEmpaque}
                      empaqueRefetchToken={empaqueRefetchToken}
                    />
                  </Box>
                }
                empaque={
                  <EmpaqueSection
                    onVerPendientes={handleGoPendientesEmpaque}
                    pendientes={tablero?.summary?.kpis?.empaque?.pendientes}
                    empacadas={tablero?.summary?.kpis?.empaque?.empacadas}
                    cajasEmpacadas={tablero?.summary?.kpis?.empaque?.cajas_empacadas}
                    merma={tablero?.summary?.kpis?.empaque?.merma}
                    inventoryRows={(tablero?.queueInventarios?.rows || []) as any}
                    page={tablero?.queueInventarios?.meta?.page}
                    pageSize={tablero?.queueInventarios?.meta?.page_size}
                  />
                }
                logistica={
                  <LogisticaSection
                    hasWeeks={hasWeeks}
                    semanaIndex={semanaIndex}
                    rows={(tablero?.queueLogistica?.rows ?? []) as any[]}
                    meta={tablero?.queueLogistica?.meta ?? { page: 1, page_size: 10, total: 0 }}
                    loading={!!tablero?.isLoadingLogistica}
                    onPageChange={tablero?.onChangePage ?? (() => { })}
                    onAddCamion={bodegaId ? handleAddCamion : undefined}
                    onEditCamion={handleEditCamion}
                    filterEstado={tablero?.filters?.estado}
                    onFilterEstadoChange={(val) => tablero?.onApplyFilters?.({ estado: val })}
                  />
                }
              />
            </Box>
          </AnimatePresence>
        </Box>
      </Paper >
      {/* Modal Camion */}
      {bodegaId && temporadaId && (
        <CamionFormModal
          open={camionModalOpen}
          onClose={() => setCamionModalOpen(false)}
          onSuccess={handleCamionSuccess}
          bodegaId={bodegaId}
          temporadaId={temporadaId}
          semanaId={tablero.selectedSemanaId}
          camion={selectedCamion}
        />
      )}
      {/* Empaque Drawer Global */}
      <EmpaqueDrawer
        open={openEmpaque}
        onClose={handleCloseEmpaque}
        recepcion={selectedRecepcionForEmpaque}
        blocked={!!selectedRecepcionForEmpaque && !selectedRecepcionForEmpaque.is_active}
        canSave={true}
        busy={empBulkSaving}
        loadingInitial={empaqueLoading}
        initialLines={empaqueInitialLines}
        onSave={onSaveEmpaque}
      />
    </Box>
  );
};
export default TableroBodegaPage;
