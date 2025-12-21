// frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx
import React, { useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  TextField,
  IconButton,
  alpha,
  useTheme,
  Chip,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

export type EmpaqueMaterial = "PLASTICO" | "MADERA";

export type EmpaqueLinesValue = Record<string, number>; // key: `${material}.${calidad}`

export interface EmpaqueLinesEditorProps {
  /** Total de cajas capturadas (para validación visual de excedentes). */
  maxTotal?: number;

  /** Diccionario de cantidades por material/calidad. */
  value: EmpaqueLinesValue;

  /** Setter controlado. */
  onChange: (next: EmpaqueLinesValue) => void;

  /** Bloqueo global (semana cerrada/no operable). */
  blocked?: boolean;
  blockReason?: string;

  /** Configuración opcional de calidades por material. */
  calidadesPlastico?: string[];
  calidadesMadera?: string[];

  /** Paso para +/- */
  step?: number;

  /** Mostrar resumen por material */
  showMaterialTotals?: boolean;
}

const DEFAULT_PLASTICO = ["Primera", "Tercera", "Niño", "Roña", "Maduro", "Merma"];
const DEFAULT_MADERA = ["Extra", "Primera", "Segunda", "Tercera", "Cuarta", "Niño", "Roña", "Maduro", "Merma"];

function lineKey(material: EmpaqueMaterial, calidad: string) {
  return `${material}.${calidad}`;
}

function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

const EmpaqueLinesEditor: React.FC<EmpaqueLinesEditorProps> = ({
  maxTotal,
  value,
  onChange,
  blocked = false,
  blockReason,
  calidadesPlastico = DEFAULT_PLASTICO,
  calidadesMadera = DEFAULT_MADERA,
  step = 1,
  showMaterialTotals = true,
}) => {
  const theme = useTheme();

  const totals = useMemo(() => {
    const sumByMaterial = (m: EmpaqueMaterial) =>
      Object.entries(value).reduce((acc, [k, v]) => (k.startsWith(`${m}.`) ? acc + (Number(v) || 0) : acc), 0);

    const plastico = sumByMaterial("PLASTICO");
    const madera = sumByMaterial("MADERA");
    const total = plastico + madera;

    const captured = Number(maxTotal ?? 0) || 0;
    const pending = Math.max(0, captured - total);
    const exceeded = captured > 0 && total > captured;

    return { plastico, madera, total, captured, pending, exceeded };
  }, [value, maxTotal]);

  const setQty = (material: EmpaqueMaterial, calidad: string, qty: number) => {
    const k = lineKey(material, calidad);
    const next = { ...value, [k]: clampInt(qty) };
    onChange(next);
  };

  const bump = (material: EmpaqueMaterial, calidad: string, delta: number) => {
    const k = lineKey(material, calidad);
    const cur = clampInt(Number(value[k] ?? 0));
    setQty(material, calidad, cur + delta);
  };

  const renderMaterial = (material: EmpaqueMaterial, calidades: string[], title: string, subtitle: string) => {
    const materialTotal = material === "PLASTICO" ? totals.plastico : totals.madera;

    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: 3,
          borderColor: alpha(theme.palette.divider, 0.14),
          backgroundColor: alpha(theme.palette.background.paper, 0.92),
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 1.25,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.25 }}>
              {subtitle}
            </Typography>
          </Box>

          {showMaterialTotals && (
            <Chip
              size="small"
              label={`Total ${title.toLowerCase()}: ${materialTotal}`}
              sx={{
                fontWeight: 900,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.dark,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              }}
            />
          )}
        </Box>

        <Divider sx={{ my: 1.5, borderColor: alpha(theme.palette.divider, 0.12) }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.25,
          }}
        >
          {calidades.map((calidad) => {
            const k = lineKey(material, calidad);
            const qty = clampInt(Number(value[k] ?? 0));

            return (
              <Box
                key={k}
                sx={{
                  p: 1.25,
                  borderRadius: 2.5,
                  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.96),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 900 }}>
                    {calidad}
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Tooltip title={blocked ? (blockReason || "Bloqueado") : "Restar"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => bump(material, calidad, -step)}
                          disabled={blocked || qty <= 0}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title={blocked ? (blockReason || "Bloqueado") : "Sumar"}>
                      <span>
                        <IconButton size="small" onClick={() => bump(material, calidad, +step)} disabled={blocked}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>

                <TextField
                  type="number"
                  value={Number.isFinite(qty) ? qty : 0}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = raw === "" ? 0 : Number(raw);
                    setQty(material, calidad, n);
                  }}
                  disabled={blocked}
                  inputProps={{ min: 0, step: 1 }}
                  fullWidth
                  size="small"
                  sx={{
                    mt: 1,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2.5,
                      backgroundColor: alpha(theme.palette.background.paper, 0.98),
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {/* Resumen general del editor */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.25, md: 1.5 },
          borderRadius: 3,
          borderColor: totals.exceeded ? alpha(theme.palette.error.main, 0.35) : alpha(theme.palette.divider, 0.14),
          backgroundColor: totals.exceeded
            ? alpha(theme.palette.error.main, 0.05)
            : alpha(theme.palette.background.paper, 0.92),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              Editor de Empaque (UI-only)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Capturadas: {totals.captured} • Empacadas: {totals.total} • Pendientes: {totals.pending}
            </Typography>
          </Box>

          {totals.exceeded && (
            <Chip
              size="small"
              color="error"
              label="Excede capturadas"
              sx={{ fontWeight: 900, borderRadius: 2 }}
            />
          )}

          {blocked && (
            <Chip
              size="small"
              color="warning"
              label={blockReason || "Bloqueado"}
              sx={{ fontWeight: 900, borderRadius: 2 }}
            />
          )}
        </Box>
      </Paper>

      {renderMaterial(
        "PLASTICO",
        calidadesPlastico,
        "Plástico",
        "Clasificación típica: Primera (incluye 2ª+), Tercera, Niño, Roña, Maduro, Merma."
      )}

      {renderMaterial(
        "MADERA",
        calidadesMadera,
        "Madera",
        "Clasificación típica: Extra, Primera, Segunda, Tercera, Cuarta, Niño, Roña, Maduro, Merma."
      )}
    </Box>
  );
};

export default EmpaqueLinesEditor;
