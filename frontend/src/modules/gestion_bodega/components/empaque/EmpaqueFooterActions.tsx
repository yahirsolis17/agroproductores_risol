// frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx
import {
  Box,
  Button,
  Paper,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export interface EmpaqueFooterActionsProps {
  onClose: () => void;

  /** UI-only (Fase 3): Guardar deshabilitado siempre. */
  onSave?: () => void;

  /** Bloqueo por semana cerrada / no operable. */
  blocked?: boolean;
  blockReason?: string;

  /** Si quieres mostrar loading visual en un futuro (Fase 4/5). */
  saving?: boolean;

  /** Texto opcional (por defecto: “Guardar (Fase 4)”). */
  saveLabel?: string;
}

export default function EmpaqueFooterActions({
  onClose,
  onSave,
  blocked = false,
  blockReason,
  saving = false,
  saveLabel,
}: EmpaqueFooterActionsProps) {
  const theme = useTheme();

  const disableSave = true; // Fase 3: UI-only

  const saveTooltip = blocked
    ? blockReason || "Semana cerrada o no operable."
    : "Disponible en Fase 4 (cuando conectemos backend).";

  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 2,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.92),
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, md: 2 },
          py: 1.25,
          display: "flex",
          alignItems: { xs: "stretch", md: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 220 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <InfoOutlinedIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {blocked
                ? (blockReason || "Semana cerrada o no iniciada: solo lectura.")
                : "UI-only: Guardar se activa en Fase 4."}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexGrow: 1 }}>
          <Button
            variant="text"
            startIcon={<CloseRoundedIcon />}
            onClick={onClose}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 800,
              px: 2,
            }}
          >
            Cerrar
          </Button>

          <Tooltip title={saveTooltip}>
            <span>
              <Button
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                disabled={disableSave || saving || !onSave}
                onClick={onSave}
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 800,
                  px: 2.25,
                  boxShadow: "none",
                }}
              >
                {saveLabel ?? "Guardar (Fase 4)"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
}
