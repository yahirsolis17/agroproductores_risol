// frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CircularProgress,
  Avatar,
  AvatarGroup,
  useMediaQuery,
} from "@mui/material";

import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory2Outlined as InventoryIcon,
  AgricultureOutlined as ShippingIcon,
  InfoOutlined as InfoIcon,
  WarningAmber as WarningIcon,
  Dashboard as DashboardIcon,
  PieChart as ChartIcon,
  Grade as QualityIcon,
  Restore as ResetIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

import { formatDateDisplay, formatDateISO } from "../../../../global/utils/date";
import AppDrawer from "../../../../components/common/AppDrawer";
import { motion } from "framer-motion";
import { capturasService } from "../../services/capturasService";

type RecepcionLike = {
  id: number;
  fecha?: string;
  huertero_nombre?: string;
  tipo_mango?: string;
  cantidad_cajas?: number;
  cajas_campo?: number;
  observaciones?: string | null;
  is_active?: boolean;
  meta?: {
    despachado?: boolean;
    semana_cerrada?: boolean;
  };
};

type Material = "PLASTICO" | "MADERA";

type LineKey = `${Material}.${string}`;

type Props = {
  open: boolean;
  onClose: () => void;
  recepcion: RecepcionLike | null;
  blocked?: boolean;
  blockReason?: string;
  canSave?: boolean;
  onSave?: (lines: Record<LineKey, number>, date?: string) => Promise<void>;
  busy?: boolean;

  /**
   * Hidrata (precarga) cantidades existentes. Puede llegar async.
   * Se mezcla con el base (todas las calidades en 0) para mantener estabilidad.
   */
  initialLines?: Partial<Record<LineKey, number>> | null;

  /**
   * Indica carga inicial (fetch de líneas existentes). Deshabilita inputs sin marcar como "solo lectura".
   */
  loadingInitial?: boolean;
};

// Interfaz para metadatos de calidad
interface QualityMeta {
  color: string;
  icon: string;
  description: string;
}

interface QualityMetadata {
  PLASTICO: Record<string, QualityMeta>;
  MADERA: Record<string, QualityMeta>;
}

// Constantes fuera del componente para evitar problemas de orden
const PLASTIC_QUALITIES = ["Primera (≥ 2da)", "Tercera", "Niño", "Roña", "Maduro", "Merma"];
const WOOD_QUALITIES = ["Extra", "Primera", "Segunda", "Tercera", "Cuarta", "Niño", "Maduro", "Roña", "Merma"];

const QUALITY_METADATA: QualityMetadata = {
  PLASTICO: {
    "Primera (≥ 2da)": { color: "#4CAF50", icon: "⭐", description: "Calidad premium" },
    Tercera: { color: "#FF9800", icon: "📦", description: "Calidad estándar" },
    Niño: { color: "#2196F3", icon: "👶", description: "Fruta pequeña" },
    Roña: { color: "#795548", icon: "🔄", description: "Defectos menores" },
    Maduro: { color: "#FF5722", icon: "⏰", description: "Maduración avanzada" },
    Merma: { color: "#9E9E9E", icon: "📉", description: "Pérdida" },
  },
  MADERA: {
    Extra: { color: "#9C27B0", icon: "🏆", description: "Calidad excepcional" },
    Primera: { color: "#4CAF50", icon: "⭐", description: "Primera calidad" },
    Segunda: { color: "#8BC34A", icon: "📦", description: "Segunda calidad" },
    Tercera: { color: "#FF9800", icon: "📦", description: "Tercera calidad" },
    Cuarta: { color: "#FF5722", icon: "📦", description: "Cuarta calidad" },
    Niño: { color: "#2196F3", icon: "👶", description: "Fruta pequeña" },
    Maduro: { color: "#FF9800", icon: "⏰", description: "Maduración avanzada" },
    Roña: { color: "#795548", icon: "🔄", description: "Defectos menores" },
    Merma: { color: "#9E9E9E", icon: "📉", description: "Pérdida" },
  },
};

function clampInt(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

// Función para construir líneas iniciales - definida fuera del componente
const buildInitialLines = (): Record<LineKey, number> => {
  const base: Record<LineKey, number> = {};
  for (const q of PLASTIC_QUALITIES) base[`PLASTICO.${q}`] = 0;
  for (const q of WOOD_QUALITIES) base[`MADERA.${q}`] = 0;
  return base;
};

function mergeWithBase(
  patch?: Partial<Record<LineKey, number>> | null
): Record<LineKey, number> {
  const base = buildInitialLines();
  if (!patch) return base;

  for (const [k, v] of Object.entries(patch)) {
    // Solo aplica keys válidas (o al menos con patrón esperado).
    base[k as LineKey] = clampInt(v);
  }
  return base;
}

export default function EmpaqueDrawer({
  open,
  onClose,
  recepcion,
  blocked = false,
  blockReason,
  canSave = false,
  onSave,
  busy = false,
  initialLines = null,
  loadingInitial = false,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));
  // Marca si ya hidratamos esta recepción (evita rehidrataciones tardías).
  const hydratedRef = useRef<number | null>(null);

  const isBulk = !recepcion;
  const [bulkDate, setBulkDate] = useState<string>(formatDateISO(new Date()));
  const [recepcionDetail, setRecepcionDetail] = useState<RecepcionLike | null>(null);
  const [recepcionLoading, setRecepcionLoading] = useState(false);

  // Reset bulk date on open
  useEffect(() => {
    if (open && isBulk) {
      setBulkDate(formatDateISO(new Date()));
    }
  }, [open, isBulk]);

  useEffect(() => {
    let isActive = true;
    if (!open || !recepcion?.id) {
      setRecepcionDetail(null);
      setRecepcionLoading(false);
      return () => {
        isActive = false;
      };
    }
    setRecepcionLoading(true);
    capturasService
      .retrieve(recepcion.id)
      .then((res) => {
        if (!isActive) return;
        setRecepcionDetail(res.captura);
      })
      .catch(() => {
        if (!isActive) return;
        setRecepcionDetail(null);
      })
      .finally(() => {
        if (!isActive) return;
        setRecepcionLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [open, recepcion?.id]);

  // P2 FINAL (R2): Merge seguro preservando meta de la lista
  const effectiveRecepcion = recepcionDetail
    ? {
      ...recepcionDetail,
      // Preservar meta de la lista si detail no lo trae
      meta: recepcionDetail.meta ?? recepcion?.meta
    }
    : recepcion;

  // Fallback: cantidad_cajas (alias) o cajas_campo (campo real)
  const captured = clampInt(effectiveRecepcion?.cantidad_cajas ?? effectiveRecepcion?.cajas_campo ?? 0);
  const isArchived = effectiveRecepcion ? effectiveRecepcion.is_active === false : false;

  // P2 FIX: Triple puerta para read-only (ahora siempre tiene meta)
  const isDespachado = Boolean(effectiveRecepcion?.meta?.despachado);
  const isSemanaCerrada = Boolean(effectiveRecepcion?.meta?.semana_cerrada);
  const readOnly = blocked || isArchived || isDespachado || isSemanaCerrada;

  // Inputs deshabilitados también durante hidratar (sin marcar como solo lectura)
  const inputsDisabled = readOnly || !!loadingInitial || recepcionLoading;

  // Estados
  const [activeTab, setActiveTab] = useState<Material>("PLASTICO");
  const [lines, setLines] = useState<Record<LineKey, number>>(() => buildInitialLines());
  const [quickActions, setQuickActions] = useState<string[]>([]);

  // Snapshot inicial para Dirty Check real (reemplaza 'dirty' manual)
  const [initialSnapshot, setInitialSnapshot] = useState<Record<LineKey, number>>(() => buildInitialLines());

  // Key estable para rehidratar sin efectos raros de referencia
  const initialKey = useMemo(() => JSON.stringify(initialLines ?? {}), [initialLines]);

  // Reset al cambiar recepción
  useEffect(() => {
    // Si es bulk, no reseteamos lines al cambiar "recepcion" (porque es null), 
    // pero sí cuando abre (manejado arriba).
    if (!open) return;

    setLines(buildInitialLines()); // base en 0
    setQuickActions([]);
    setInitialSnapshot(buildInitialLines());
    hydratedRef.current = null;
  }, [recepcion?.id, open]);

  // Hidrata líneas existentes cuando llegan
  useEffect(() => {
    if (!open) return;
    if (!recepcion) return;
    if (!initialLines) return;
    if (hydratedRef.current === recepcion.id) return;

    const base = mergeWithBase(initialLines);
    setLines((prev) => {
      const userAlreadyEdited =
        JSON.stringify(prev) !== JSON.stringify(initialSnapshot);

      if (userAlreadyEdited) return prev;

      hydratedRef.current = recepcion.id;
      setInitialSnapshot(base);
      return base;
    });
  }, [open, recepcion?.id, initialKey]);

  // Dirty Check Calculado
  const isDirty = useMemo(() => {
    return JSON.stringify(lines) !== JSON.stringify(initialSnapshot);
  }, [lines, initialSnapshot]);

  const totals = useMemo(() => {
    const sumByMaterial = (m: Material) =>
      Object.entries(lines)
        .filter(([k]) => k.startsWith(`${m}.`))
        .reduce((acc, [, v]) => acc + clampInt(v), 0);

    const plastico = sumByMaterial("PLASTICO");
    const madera = sumByMaterial("MADERA");
    const packed = plastico + madera;

    let remaining = 0;
    let progress = 0;

    if (!isBulk) {
      remaining = Math.max(0, captured - packed);
      progress = captured > 0 ? Math.min(100, (packed / captured) * 100) : 0;
    }

    return { plastico, madera, packed, remaining, progress };
  }, [lines, captured, isBulk]);

  const overPacked = !isBulk && totals.packed > captured && captured > 0;
  const completionStatus = isBulk ? "incomplete" : (totals.progress >= 100 ? "complete" : totals.progress > 0 ? "partial" : "empty");

  // Funciones de utilidad
  const setLine = (key: LineKey, value: any) => {
    const oldValue = lines[key];
    const newValue = clampInt(value);

    setLines((prev) => ({ ...prev, [key]: newValue }));

    if (newValue !== oldValue) {
      const [, quality] = key.split(".");
      setQuickActions((prev) => [`${quality}: ${oldValue} → ${newValue}`, ...prev.slice(0, 4)]);
    }
  };

  const bumpLine = (key: LineKey, delta: number) => {
    setLines((prev) => ({ ...prev, [key]: Math.max(0, clampInt(prev[key]) + delta) }));
  };

  // Componente de tarjeta de calidad — usa estado local para el input
  // para evitar re-renders del parent en cada tecla
  const QualityCard = ({ material, quality }: { material: Material; quality: string }) => {
    const key = `${material}.${quality}` as LineKey;
    const committedValue = clampInt(lines[key]);
    const meta = QUALITY_METADATA[material][quality];

    // Estado local del input — solo se sincroniza al parent en blur/Enter
    const [localValue, setLocalValue] = useState<string>(committedValue === 0 ? "" : String(committedValue));
    const inputRef = useRef<HTMLInputElement>(null);

    // Sincronizar hacia abajo cuando el parent cambia (reset, hidratación, distribución)
    useEffect(() => {
      const str = committedValue === 0 ? "" : String(committedValue);
      setLocalValue(str);
    }, [committedValue]);

    // Commit: aplica el valor local al state global
    const commit = () => {
      const newVal = clampInt(localValue);
      if (newVal !== committedValue) {
        setLine(key, newVal);
      }
    };

    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 3,
            border: `2px solid ${alpha(meta?.color || theme.palette.divider, 0.2)}`,
            bgcolor: alpha(meta?.color || theme.palette.background.paper, 0.05),
            transition: "all 0.2s",
            height: "100%",
            "&:hover": {
              borderColor: alpha(meta?.color || theme.palette.primary.main, 0.4),
              bgcolor: alpha(meta?.color || theme.palette.background.paper, 0.1),
            },
          }}
        >
          <CardContent sx={{ p: "0 !important", display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, lineHeight: 1.2, textAlign: "center" }}>
                {quality}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
                {meta?.description}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                size="small"
                disabled={inputsDisabled || committedValue === 0}
                onClick={() => bumpLine(key, -1)}
                sx={{
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.2) },
                }}
              >
                <RemoveIcon />
              </IconButton>

              <TextField
                inputRef={inputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commit();
                    // Move focus to next input for fast data entry
                    const allInputs = document.querySelectorAll<HTMLInputElement>(
                      '[data-quality-input="true"]'
                    );
                    const idx = Array.from(allInputs).indexOf(e.target as HTMLInputElement);
                    if (idx >= 0 && idx < allInputs.length - 1) {
                      allInputs[idx + 1].focus();
                      allInputs[idx + 1].select();
                    }
                  }
                }}
                placeholder="0"
                disabled={inputsDisabled}
                type="number"
                inputProps={{
                  min: 0,
                  "data-quality-input": "true",
                  style: {
                    textAlign: "center",
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                  },
                }}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                  },
                }}
              />

              <IconButton
                size="small"
                disabled={inputsDisabled}
                onClick={() => bumpLine(key, +1)}
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  "&:hover": { bgcolor: alpha(theme.palette.success.main, 0.2) },
                }}
              >
                <AddIcon />
              </IconButton>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
              <Tooltip title="Porcentaje del total">
                <Typography variant="caption" color="text.secondary">
                  {captured > 0 ? `${((committedValue / captured) * 100).toFixed(1)}%` : "0%"}
                </Typography>
              </Tooltip>
              <Tooltip title="Cajas empacadas">
                <Typography variant="caption" color="text.secondary">
                  {committedValue} cajas
                </Typography>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Componente de indicador de estado
  const StatusIndicator = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={totals.progress}
          size={24}
          thickness={4}
          sx={{
            color:
              completionStatus === "complete"
                ? theme.palette.success.main
                : completionStatus === "partial"
                  ? theme.palette.warning.main
                  : theme.palette.grey[400],
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" component="div" sx={{ fontWeight: "bold" }}>
            {Math.round(totals.progress)}%
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {totals.packed}/{captured} cajas
      </Typography>
    </Box>
  );

  // Mode label and color based on state (P2: enhanced with despachado/semana states)
  const modeLabel = loadingInitial
    ? "CARGANDO"
    : isDespachado
      ? "DESPACHADO"
      : isSemanaCerrada
        ? "SEMANA CERRADA"
        : isArchived
          ? "ARCHIVADO"
          : blocked
            ? "BLOQUEADO"
            : readOnly
              ? "SOLO LECTURA"
              : totals.packed === 0
                ? "REGISTRANDO"
                : "EDITANDO";
  const modeColor = loadingInitial ? "info" : readOnly ? "warning" : "success";

  // Header improved
  const header = (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: -0.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 0.5,
            }}
          >
            {isBulk ? "Empaque Masivo (FIFO)" : (recepcion ? "Captura de Calidades" : "Nueva Recepción")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            {isBulk ? (
              <TextField
                type="date"
                size="small"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                sx={{ width: 160 }}
                label="Fecha de Empaque"
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <>
                <Chip
                  icon={<InventoryIcon />}
                  label={recepcion?.huertero_nombre || "—"}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<span style={{ fontSize: '1.2rem', marginLeft: '4px' }}>🥭</span>}
                  label={recepcion?.tipo_mango || "—"}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<ShippingIcon />}
                  label={recepcion?.fecha ? formatDateDisplay(recepcion.fecha) : "—"}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {!isBulk && <StatusIndicator />}
          <Chip
            label={isBulk ? "MODO FIFO" : modeLabel}
            color={isBulk ? "secondary" : modeColor as any}
            variant="outlined"
            sx={{ fontWeight: 900, letterSpacing: 0.5 }}
          />
        </Box>
      </Box>

      {loadingInitial && (
        <Box sx={{ mt: 1.5 }}>
          <LinearProgress sx={{ borderRadius: 2 }} />
        </Box>
      )}
    </Box>
  );

  // Banner ...

  // Footer ...
  // Update onSave call

  // Need to update the onSave button onClick in the replaced content manually effectively by including it in the replace?
  // I need to replace the footer definition too or just the header part and props.
  // The tool replaces a block. I can try to replace the whole file content or a large chunk.
  // Viewing lines 75 to 640...
  // I will replace a large chunk from props definition down to header/footer logic usage.


  // Banner de estado
  const banner = blockReason ? (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <Alert
        severity={isArchived ? "info" : "warning"}
        sx={{
          borderRadius: 3,
          border: "none",
          bgcolor: alpha(isArchived ? theme.palette.info.main : theme.palette.warning.main, 0.1),
          backdropFilter: "blur(10px)",
          alignItems: "center",
        }}
        icon={false}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {isArchived ? <InfoIcon /> : <WarningIcon />}
          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
            {blockReason}
          </Typography>
          {!isArchived && (
            <Button size="small" variant="outlined" sx={{ borderRadius: 2 }}>
              Solicitar desbloqueo
            </Button>
          )}
        </Box>
      </Alert>
    </motion.div>
  ) : overPacked ? (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <Alert
        severity="error"
        sx={{
          borderRadius: 3,
          border: "none",
          bgcolor: alpha(theme.palette.error.main, 0.1),
          backdropFilter: "blur(10px)",
          alignItems: "center",
        }}
        icon={<WarningIcon color="error" />}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
          Excediste la capacidad de la recepción ({totals.packed} / {captured}). Ajusta las cantidades.
        </Typography>
      </Alert>
    </motion.div>
  ) : null;

  // Footer mejorado
  const footer = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        p: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.95),
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: "blur(10px)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 24, height: 24 } }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>U</Avatar>
        </AvatarGroup>
        <Typography variant="caption" color="text.secondary">
          {quickActions.length > 0 ? `Última acción: ${quickActions[0]}` : "Sin cambios"}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Button
          startIcon={<ResetIcon />}
          onClick={() => {
            setLines(initialSnapshot);
          }}
          disabled={inputsDisabled || busy}
          sx={{ borderRadius: 3, fontWeight: 700 }}
        >
          Reiniciar
        </Button>

        <Button
          variant="outlined"
          startIcon={<CloseIcon />}
          onClick={onClose}
          disabled={busy}
          sx={{ borderRadius: 3, fontWeight: 700 }}
        >
          Cerrar
        </Button>

        <Tooltip title={canSave ? "" : "Guardar se habilita en Fase 4"}>
          <span>
            <Button
              variant="contained"
              startIcon={busy ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={!canSave || inputsDisabled || overPacked || busy || !!loadingInitial || !isDirty}
              onClick={() => onSave && onSave(lines, isBulk ? bulkDate : undefined)}
              sx={{
                borderRadius: 3,
                fontWeight: 900,
                px: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                "&:hover": {
                  boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                  transform: "translateY(-1px)",
                },
                transition: "all 0.2s",
              }}
            >
              {busy ? "Guardando..." : "Guardar Empaque"}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      banner={banner}
      footer={footer}
      width={isMobile ? "100%" : isTablet ? "90%" : 1400}
      header={header}
    >
      {/* Aplicamos el fondo gradiente al contenedor principal */}
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.default, 0.98)} 0%,
            ${alpha(theme.palette.background.paper, 0.95)} 100%
          )`,
          backdropFilter: "blur(20px)",
          minHeight: "100%",
        }}
      >
        {/* Dashboard Superior */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 3,
              mb: 4,
            }}
          >
            {/* Panel izquierdo - Dashboard principal */}
            <Box sx={{ flex: { md: 2 } }}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  backdropFilter: "blur(10px)",
                  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.05)}`,
                  height: "100%",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
                    <DashboardIcon /> Dashboard de Control
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: 3,
                  }}
                >
                  {/* Card de total capturado */}
                  <Card
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderRadius: 3,
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      TOTAL CAPTURADO
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 900, mt: 1 }}>
                      {captured}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: "auto" }}>
                      <InventoryIcon fontSize="small" /> cajas
                    </Typography>
                  </Card>

                  {/* Card de empacadas */}
                  <Card
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                      borderRadius: 3,
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      EMPACADAS
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 900, mt: 1 }}>
                      {totals.packed}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={totals.progress}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {Math.round(totals.progress)}%
                      </Typography>
                    </Box>
                  </Card>

                  {/* Card de pendientes */}
                  <Card
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                      borderRadius: 3,
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      PENDIENTES
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        mt: 1,
                        color: totals.remaining > 0 ? "warning.main" : "success.main",
                      }}
                    >
                      {totals.remaining}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: "auto" }}>
                      <WarningIcon fontSize="small" /> por empacar
                    </Typography>
                  </Card>

                  {/* Card de distribución */}
                  <Card
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                      borderRadius: 3,
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      DISTRIBUCIÓN
                    </Typography>
                    <Box sx={{ mt: 1, flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Avatar sx={{ bgcolor: alpha("#2196F3", 0.1), color: "#2196F3", width: 36, height: 36 }}>
                          P
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 900 }}>
                            {totals.plastico}
                          </Typography>
                          <Typography variant="caption">Plástico</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ bgcolor: alpha("#795548", 0.1), color: "#795548", width: 36, height: 36 }}>
                          M
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 900 }}>
                            {totals.madera}
                          </Typography>
                          <Typography variant="caption">Madera</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                </Box>
              </Paper>
            </Box>

            {/* Panel derecho - Análisis rápido */}
            <Box sx={{ flex: { md: 1 }, minWidth: { md: 300 } }}>
              <Paper
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                  <ChartIcon /> Análisis Rápido
                </Typography>

                <Box sx={{ mb: 3, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 1 }}>
                    EFICIENCIA DE EMPAQUE
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={totals.progress}
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      bgcolor: alpha(theme.palette.divider, 0.2),
                      mb: 1,
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 6,
                        background: `linear-gradient(90deg, 
                          ${theme.palette.success.main} 0%,
                          ${theme.palette.warning.main} 50%,
                          ${theme.palette.error.main} 100%
                        )`,
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {totals.packed} empacadas
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {totals.remaining} restantes
                    </Typography>
                  </Box>

                  {overPacked && (
                    <Alert severity="error" sx={{ borderRadius: 3, mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ⚠️ EXCESO DETECTADO
                      </Typography>
                      <Typography variant="caption">
                        {totals.packed - captured} cajas sobre el límite ({captured} permitidas)
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
        </motion.div>

        {/* Selector de Material y Controles */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Paper
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.background.paper, 0.7),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              backdropFilter: "blur(10px)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
                  <QualityIcon /> Distribución por Calidad
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Selecciona material y distribuye las cajas por calidad
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  sx={{
                    "& .MuiTab-root": {
                      fontWeight: 700,
                      borderRadius: 3,
                      minHeight: 40,
                    },
                  }}
                >
                  <Tab
                    value="PLASTICO"
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "#2196F3",
                          }}
                        />
                        Plástico ({totals.plastico})
                      </Box>
                    }
                  />
                  <Tab
                    value="MADERA"
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "#795548",
                          }}
                        />
                        Madera ({totals.madera})
                      </Box>
                    }
                  />
                </Tabs>
              </Box>
            </Box>
          </Paper>
        </motion.div>

        {/* Grid de Calidades usando Box con CSS Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {(activeTab === "PLASTICO" ? PLASTIC_QUALITIES : WOOD_QUALITIES).map((quality) => (
              <Box key={quality}>
                <QualityCard material={activeTab} quality={quality} />
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>
    </AppDrawer>
  );
}
