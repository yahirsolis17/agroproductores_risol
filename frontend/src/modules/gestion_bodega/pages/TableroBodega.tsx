// frontend/src/modules/gestion_bodega/pages/TableroBodega.tsx
// Página principal del Tablero de Bodega (corazón operativo).
// - Consumo de useTableroBodega (Redux UI + React Query datos).
// - Reusa los 6 componentes clave: KpiCards, AvisosPanel, QuickActions,
//   ResumenRecepciones, ResumenInventarios, ResumenLogistica.
// - Filtros globales minimalistas integrados.
// - Animaciones sutiles (framer-motion), sin flicker.
// - Navegación con preservación de ?temporada=<id>.
// - MUI + tu TableLayout/PermissionButton style.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Tabs,
  Tab,
  Chip,
  Alert,
  AlertTitle,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

import { useTableroBodega } from "../hooks/useTableroBodega";
import type { QueueType } from "../types/tableroBodegaTypes";

import KpiCards from "../components/tablero/KpiCards";
import AvisosPanel from "../components/tablero/AvisosPanel";
import QuickActions from "../components/tablero/QuickActions";
import ResumenRecepciones from "../components/tablero/ResumenRecepciones";
import ResumenInventarios from "../components/tablero/ResumenInventarios";
import ResumenLogistica from "../components/tablero/ResumenLogistica";
import WeekSwitcher from "../components/common/WeekSwitcher";
import { formatDateISO, parseLocalDateStrict } from "../../../global/utils/date";

// ───────────────────────────────────────────────────────────────────────────────
// Anim presets (suaves; sin parpadeo)
const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
};

const MotionPaper = motion(Paper);

// ───────────────────────────────────────────────────────────────────────────────
// Filtros locales (alineados con el hook/slice)
type TableroFilters = {
  huerta_id?: number | null;
  fecha_desde?: string | null; // YYYY-MM-DD
  fecha_hasta?: string | null; // YYYY-MM-DD
  estado_lote?: string | null;
  calidad?: string | null;
  madurez?: string | null;
  solo_pendientes?: boolean;
  page: number;
  page_size: number;
  order_by?: string | null;
};

// Mapa de tabs → queueType
const QUEUE_TABS: { key: QueueType; label: string }[] = [
  { key: "recepciones", label: "Recepciones" },
  { key: "ubicaciones", label: "Ubicaciones" },
  { key: "despachos", label: "Despachos" },
];

// Util para preservar ?temporada en navegación
function withTemporada(href: string, temporadaId: number) {
  const url = new URL(href, window.location.origin);
  if (!url.searchParams.has("temporada")) {
    url.searchParams.set("temporada", String(temporadaId));
  }
  return url.pathname + "?" + url.searchParams.toString();
}

// Helpers ISO (lunes–domingo) para rango por semana
const startOfISOWeek = (d: Date) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun,1=Mon,...
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  return date;
};
const endOfISOWeek = (d: Date) => {
  const s = startOfISOWeek(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
};

// Deriva {from,to} ISO en base a los filtros actuales o "hoy"
const deriveWeekFromFilters = (f: TableroFilters) => {
  const baseISO = f.fecha_desde || f.fecha_hasta || formatDateISO(new Date());
  const base = parseLocalDateStrict(baseISO);
  const from = startOfISOWeek(base);
  const to = endOfISOWeek(base);
  return { from: formatDateISO(from), to: formatDateISO(to) };
};

const TableroBodega: React.FC = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const temporadaParam = sp.get("temporada");
  const temporadaId = Number(temporadaParam);
  const bodegaParam = sp.get("bodega");
  const bodegaId = bodegaParam ? Number(bodegaParam) : NaN;

  // Guard de temporada → fallback a /bodega (coherente con tu ruta actual)
  useEffect(() => {
    if (!temporadaParam || Number.isNaN(temporadaId) || temporadaId <= 0) {
      navigate("/bodega", { replace: true });
    }
  }, [temporadaParam, temporadaId, navigate]);

  if (!temporadaParam || Number.isNaN(temporadaId) || temporadaId <= 0) {
    return (
      <Box p={2}>
        <Alert severity="warning">
          <AlertTitle>Temporada inválida</AlertTitle>
          Redirigiendo a la lista de bodegas…
        </Alert>
      </Box>
    );
  }

  // Hook maestro (datos + estado UI + actions)
  const {
    // Datos
    kpiCards,
    alerts,
    queue,

    // Loading/errores
    isLoadingSummary,
    isLoadingAlerts,
    isLoadingQueue,
    errorSummary,
    errorAlerts,
    errorQueue,

    // Estado/UI
    activeQueue,
    filters,

    // Acciones
    onChangeQueue,
    onApplyFilters,
    onChangePage, // ✅ nombre correcto del hook
    refetchAll,
    refetchSummary,
    refetchAlerts,
    refetchQueue,
  } = useTableroBodega({ temporadaId });

  // Estado local de filtros (editables antes de aplicar)
  const [localFilters, setLocalFilters] = useState<TableroFilters>(filters);
  useEffect(() => setLocalFilters(filters), [filters]);

  // Rango de semana derivado de filtros
  const weekValue = useMemo(() => deriveWeekFromFilters(localFilters), [localFilters]);

  // Handlers de filtros
  const handleFilterChange = useCallback(
    (patch: Partial<TableroFilters>) => {
      setLocalFilters((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const applyFilters = useCallback(() => {
    const { huerta_id, fecha_desde, fecha_hasta, estado_lote, calidad, madurez, solo_pendientes } = localFilters;
    onApplyFilters({
      huerta_id: huerta_id ?? undefined,
      fecha_desde: fecha_desde || undefined,
      fecha_hasta: fecha_hasta || undefined,
      estado_lote: estado_lote || undefined,
      calidad: calidad || undefined,
      madurez: madurez || undefined,
      solo_pendientes: !!solo_pendientes,
    });
  }, [localFilters, onApplyFilters]);

  const clearFilters = useCallback(() => {
    onApplyFilters({
      huerta_id: undefined,
      fecha_desde: undefined,
      fecha_hasta: undefined,
      estado_lote: undefined,
      calidad: undefined,
      madurez: undefined,
      solo_pendientes: false,
    });
  }, [onApplyFilters]);

  // Navegación unificada (preserva temporada)
  const goto = useCallback(
    (href: string) => {
      navigate(withTemporada(href, temporadaId));
    },
    [navigate, temporadaId]
  );

  // Header chip
  const temporadaChipLabel = useMemo(() => `Temporada ${temporadaId}`, [temporadaId]);

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            Bodega · Tablero
          </Typography>
          <Chip label={temporadaChipLabel} size="small" color="primary" variant="outlined" />
        </Box>

        {/* Acciones rápidas (permisos internos en el componente) */}
        {Number.isFinite(bodegaId) && bodegaId > 0 && (
          <QuickActions bodegaId={bodegaId} temporadaId={temporadaId} onNavigate={goto} />
        )}
      </Box>

      {/* KPIs */}
      <AnimatePresence initial={false}>
        <MotionPaper key="kpis" variant="outlined" elevation={0} {...fadeInUp} sx={{ p: 2, borderRadius: 2 }}>
          {errorSummary ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetchSummary()}>
                  Reintentar
                </Button>
              }
            >
              <AlertTitle>Error al cargar KPIs</AlertTitle>
              {String((errorSummary as any)?.message ?? "Error desconocido")}
            </Alert>
          ) : (
            <KpiCards items={kpiCards} loading={isLoadingSummary} />
          )}
        </MotionPaper>
      </AnimatePresence>

      {/* Avisos */}
      <AnimatePresence initial={false}>
        <MotionPaper key="avisos" variant="outlined" elevation={0} {...fadeInUp} sx={{ p: 2, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Avisos de operación
            </Typography>
            <Tooltip title="Refrescar avisos">
              <IconButton onClick={() => refetchAlerts()} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {errorAlerts ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetchAlerts()}>
                  Reintentar
                </Button>
              }
            >
              <AlertTitle>Error al cargar avisos</AlertTitle>
              {String((errorAlerts as any)?.message ?? "Error desconocido")}
            </Alert>
          ) : (
            <AvisosPanel alerts={alerts} loading={isLoadingAlerts} onNavigate={goto} />
          )}
        </MotionPaper>
      </AnimatePresence>

      {/* Filtros + Tabs + Tabla de la cola activa */}
      <MotionPaper variant="outlined" elevation={0} {...fadeInUp} sx={{ borderRadius: 2 }}>
        {/* Toolbar de filtros */}
        <Box p={2} display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <FilterAltIcon fontSize="small" color="action" />

          {/* Week switcher (sin "semana 0", ISO lunes–domingo) */}
          <WeekSwitcher
            value={weekValue}
            onChange={(r) => {
              setLocalFilters((prev) => ({ ...prev, fecha_desde: r.from, fecha_hasta: r.to }));
            }}
          />

          <TextField
            size="small"
            label="Huerta ID"
            value={localFilters.huerta_id ?? ""}
            onChange={(e) => handleFilterChange({ huerta_id: e.target.value ? Number(e.target.value) : undefined })}
            sx={{ width: 130 }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          />
          <TextField
            size="small"
            type="date"
            label="Desde"
            InputLabelProps={{ shrink: true }}
            value={localFilters.fecha_desde ?? ""}
            onChange={(e) => handleFilterChange({ fecha_desde: e.target.value || undefined })}
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            type="date"
            label="Hasta"
            InputLabelProps={{ shrink: true }}
            value={localFilters.fecha_hasta ?? ""}
            onChange={(e) => handleFilterChange({ fecha_hasta: e.target.value || undefined })}
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            label="Estado lote"
            value={localFilters.estado_lote ?? ""}
            onChange={(e) => handleFilterChange({ estado_lote: e.target.value || undefined })}
            sx={{ width: 160 }}
            select
          >
            <MenuItem value="">(cualquiera)</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="en_proceso">En proceso</MenuItem>
            <MenuItem value="completo">Completo</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Calidad"
            value={localFilters.calidad ?? ""}
            onChange={(e) => handleFilterChange({ calidad: e.target.value || undefined })}
            sx={{ width: 140 }}
            placeholder="A/B/C…"
          />
          <TextField
            size="small"
            label="Madurez"
            value={localFilters.madurez ?? ""}
            onChange={(e) => handleFilterChange({ madurez: e.target.value || undefined })}
            sx={{ width: 140 }}
            placeholder="verde/óptima/madura…"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!localFilters.solo_pendientes}
                onChange={(e) => handleFilterChange({ solo_pendientes: e.target.checked })}
                size="small"
              />
            }
            label="Solo pendientes"
          />

          <Box flexGrow={1} />

          <Button onClick={clearFilters} variant="text" size="small">
            Limpiar
          </Button>
          <Button onClick={applyFilters} variant="contained" size="small">
            Aplicar filtros
          </Button>
          <Tooltip title="Refrescar todo">
            <IconButton onClick={() => refetchAll()} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        {/* Tabs de colas */}
        <Box display="flex" alignItems="center" justifyContent="space-between" px={2} pt={1.5}>
          <Tabs
            value={QUEUE_TABS.findIndex((t) => t.key === activeQueue)}
            onChange={(_, idx) => onChangeQueue(QUEUE_TABS[idx].key)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {QUEUE_TABS.map((t) => (
              <Tab key={t.key} label={t.label} />
            ))}
          </Tabs>

          <Typography variant="body2" color="text.secondary">
            {queue?.meta?.total ?? 0} registros
          </Typography>
        </Box>

        <Divider sx={{ mb: 1 }} />

        {/* Tabla de la cola activa */}
        <Box p={2}>
          {errorQueue ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetchQueue()}>
                  Reintentar
                </Button>
              }
            >
              <AlertTitle>Error al cargar la lista</AlertTitle>
              {String((errorQueue as any)?.message ?? "Error desconocido")}
            </Alert>
          ) : (
            <>
              {activeQueue === "recepciones" && (
                <ResumenRecepciones
                  rows={queue.rows}
                  meta={queue.meta}
                  loading={isLoadingQueue}
                  onPageChange={onChangePage}
                />
              )}
              {activeQueue === "ubicaciones" && (
                <ResumenInventarios
                  rows={queue.rows}
                  meta={queue.meta}
                  loading={isLoadingQueue}
                  onPageChange={onChangePage}
                />
              )}
              {activeQueue === "despachos" && (
                <ResumenLogistica
                  rows={queue.rows}
                  meta={queue.meta}
                  loading={isLoadingQueue}
                  onPageChange={onChangePage}
                />
              )}
            </>
          )}
        </Box>
      </MotionPaper>

      {/* (Opcional) Resumen de costos recientes — habilítalo cuando lo conectes */}
      {/* 
      <MotionPaper variant="outlined" elevation={0} {...fadeInUp} sx={{ p: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Gastos recientes</Typography>
          <Tooltip title="Refrescar">
            <IconButton size="small"><RefreshIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
        <ResumenGastos items={[]} loading={false} />
      </MotionPaper>
      */}
    </Box>
  );
};

export default TableroBodega;
