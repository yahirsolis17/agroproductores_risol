// frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx
import React, { useMemo } from "react";
import {
  Box,
  Chip,
  Paper,
  TextField,
  Typography,
  alpha,
  useTheme,
  Divider,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

import { formatDateDisplay } from "../../../../global/utils/date";
import type { Captura } from "../../types/capturasTypes";

export type EmpaqueStatusUI = "SIN_EMPAQUE" | "PARCIAL" | "EMPACADO";

export interface EmpaqueHeaderSummaryProps {
  recepcion: Captura | null;

  /** Estado UI-only (por ahora). */
  status?: EmpaqueStatusUI;

  /** Total empacado (sumatoria de líneas) para calcular pendientes. */
  packedTotal?: number;

  /** Notas UI-only (no persiste en Fase 3). */
  notes: string;
  onNotesChange: (value: string) => void;

  /** Bloqueo (semana cerrada/no operable). */
  blocked?: boolean;
  blockReason?: string;

  /** Opcional: mostrar etiquetas auxiliares. */
  showUiOnlyChip?: boolean;
}

function statusLabel(status: EmpaqueStatusUI) {
  switch (status) {
    case "EMPACADO":
      return "Empacado";
    case "PARCIAL":
      return "Parcial";
    default:
      return "Sin empacar";
  }
}

function statusColor(status: EmpaqueStatusUI): "default" | "success" | "warning" {
  switch (status) {
    case "EMPACADO":
      return "success";
    case "PARCIAL":
      return "warning";
    default:
      return "default";
  }
}

const EmpaqueHeaderSummary: React.FC<EmpaqueHeaderSummaryProps> = ({
  recepcion,
  status = "SIN_EMPAQUE",
  packedTotal = 0,
  notes,
  onNotesChange,
  blocked = false,
  blockReason,
  showUiOnlyChip = true,
}) => {
  const theme = useTheme();

  const computed = useMemo(() => {
    const cajasCapturadas = Number(recepcion?.cantidad_cajas ?? 0) || 0;
    const empacadas = Math.max(0, Number(packedTotal) || 0);
    const pendientes = Math.max(0, cajasCapturadas - empacadas);

    return { cajasCapturadas, empacadas, pendientes };
  }, [recepcion?.cantidad_cajas, packedTotal]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 3,
        borderColor: alpha(theme.palette.divider, 0.14),
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(
          theme.palette.background.paper,
          1
        )} 100%)`,
      }}
    >
      {/* Top row: título + chips */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
            Resumen de recepción
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.25 }}>
            Datos base para empaquetado y clasificación
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            color={statusColor(status)}
            label={statusLabel(status)}
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              backgroundColor: status === "SIN_EMPAQUE" ? alpha(theme.palette.divider, 0.14) : undefined,
            }}
          />
          {showUiOnlyChip && (
            <Chip
              size="small"
              label="UI-only"
              color="primary"
              sx={{
                fontWeight: 800,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.dark,
              }}
            />
          )}
          {blocked && (
            <Chip
              size="small"
              label="Bloqueado"
              color="warning"
              sx={{
                fontWeight: 800,
                borderRadius: 2,
              }}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 1.5, borderColor: alpha(theme.palette.divider, 0.12) }} />

      {/* Data grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
          gap: 1.5,
          alignItems: "start",
        }}
      >
        {/* Left: info */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
            gap: 1.25,
          }}
        >
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.92),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarTodayIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
                Fecha
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 900, mt: 0.5 }}>
              {recepcion?.fecha ? formatDateDisplay(recepcion.fecha) : "—"}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.25,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.92),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PersonOutlineIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
                Huertero
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 900, mt: 0.5 }}>
              {recepcion?.huertero_nombre ?? "—"}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.25,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.92),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Inventory2OutlinedIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
                Cajas
              </Typography>
            </Box>

            <Box sx={{ mt: 0.5, display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="body1" sx={{ fontWeight: 900 }}>
                {computed.cajasCapturadas} capturadas
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                • {computed.pendientes} pendientes
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right: notas + bloqueo */}
        <Box sx={{ display: "grid", gap: 1 }}>
          {blocked && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 2.5,
                borderColor: alpha(theme.palette.warning.main, 0.25),
                backgroundColor: alpha(theme.palette.warning.main, 0.06),
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 900, color: theme.palette.warning.dark }}>
                Operación bloqueada
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", mt: 0.25 }}>
                {blockReason || "Semana cerrada o no operable."}
              </Typography>
            </Paper>
          )}

          <TextField
            label="Notas"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="(UI-only) Observaciones para el empaque / clasificación…"
            fullWidth
            multiline
            minRows={3}
            disabled={blocked}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.background.paper, 0.92),
              },
            }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default EmpaqueHeaderSummary;
