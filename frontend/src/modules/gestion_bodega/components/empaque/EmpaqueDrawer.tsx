// frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx
import { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  Alert,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { formatDateDisplay } from "../../../../global/utils/date";
import AppDrawer from "../../../../components/common/AppDrawer";

type RecepcionLike = {
  id: number;
  fecha?: string;
  huertero_nombre?: string;
  tipo_mango?: string;
  cantidad_cajas?: number;
  observaciones?: string | null;
  is_active?: boolean;
};

type Material = "PLASTICO" | "MADERA";

type Props = {
  open: boolean;
  onClose: () => void;
  recepcion: RecepcionLike | null;

  blocked?: boolean;
  blockReason?: string;

  /** UI-only por ahora: en Fase 4 se habilita + persiste. */
  canSave?: boolean;
};

type LineKey = `${Material}.${string}`;

function clampInt(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

export default function EmpaqueDrawer({
  open,
  onClose,
  recepcion,
  blocked = false,
  blockReason,
  canSave = false,
}: Props) {
  const theme = useTheme();

  const captured = clampInt(recepcion?.cantidad_cajas ?? 0);
  const isArchived = recepcion ? recepcion.is_active === false : false;
  const readOnly = blocked || isArchived;

  // Config de calidades (UI-only por ahora)
  const plasticQualities = useMemo(
    () => ["Primera (≥ 2da)", "Tercera", "Niño", "Roña", "Maduro", "Merma"],
    []
  );
  const woodQualities = useMemo(
    () => ["Extra", "Primera", "Segunda", "Tercera", "Cuarta", "Niño", "Maduro", "Roña", "Merma"],
    []
  );

  const buildInitialLines = () => {
    const base: Record<LineKey, number> = {};
    for (const q of plasticQualities) base[`PLASTICO.${q}`] = 0;
    for (const q of woodQualities) base[`MADERA.${q}`] = 0;
    return base;
  };

  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<Record<LineKey, number>>(() => buildInitialLines());

  // Reset UI-only al cambiar de recepción
  useEffect(() => {
    if (!recepcion) return;
    setNotes(recepcion.observaciones ?? "");
    setLines(buildInitialLines());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recepcion?.id]);

  const totals = useMemo(() => {
    const sumByMaterial = (m: Material) =>
      Object.entries(lines)
        .filter(([k]) => k.startsWith(`${m}.`))
        .reduce((acc, [, v]) => acc + clampInt(v), 0);

    const plastico = sumByMaterial("PLASTICO");
    const madera = sumByMaterial("MADERA");
    const packed = plastico + madera;
    const remaining = Math.max(0, captured - packed);

    return { plastico, madera, packed, remaining };
  }, [lines, captured]);

  const overPacked = totals.packed > captured && captured > 0;
  const progress = captured > 0 ? Math.min(100, Math.round((totals.packed / captured) * 100)) : 0;

  const setLine = (key: LineKey, value: any) => {
    setLines((prev) => ({ ...prev, [key]: clampInt(value) }));
  };

  const bumpLine = (key: LineKey, delta: number) => {
    setLines((prev) => ({ ...prev, [key]: Math.max(0, clampInt(prev[key]) + delta) }));
  };

  const headerTitle = recepcion ? `Empaque · Recepción #${recepcion.id}` : "Empaque";
  const headerSub = recepcion
    ? `${recepcion.huertero_nombre ?? "—"} · ${recepcion.tipo_mango ?? "—"}`
    : "—";

  const statusLabel = useMemo(() => {
    if (readOnly && isArchived) return "Archivada · Solo lectura";
    if (readOnly) return "Bloqueado · Solo lectura";
    if (totals.packed === 0) return "Sin empacar";
    if (captured > 0 && totals.packed >= captured) return "Empacado";
    return "Parcial";
  }, [readOnly, isArchived, totals.packed, captured]);

  const statusChipColor =
    readOnly ? "default" : totals.packed === 0 ? "default" : totals.packed >= captured ? "success" : "warning";

  const banner = blockReason ? (
    <Alert
      severity={isArchived ? "info" : "warning"}
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
        bgcolor: alpha(theme.palette.warning.main, 0.06),
      }}
      icon={<InfoOutlinedIcon />}
    >
      {blockReason}
    </Alert>
  ) : null;

  const footer = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 1.25,
      }}
    >
      <Button
        variant="text"
        onClick={onClose}
        sx={{ borderRadius: 3, textTransform: "none", fontWeight: 800, px: 2 }}
      >
        Cerrar
      </Button>

      <Tooltip
        title={canSave ? "" : "Guardar se habilita en Fase 4 (persistencia backend)."}
        disableHoverListener={canSave}
      >
        <span>
          <Button
            variant="contained"
            disabled={!canSave || readOnly || overPacked}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 900,
              px: 2.5,
              boxShadow: "none",
            }}
          >
            Guardar (Fase 4)
          </Button>
        </span>
      </Tooltip>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      banner={banner}
      footer={footer}
      width={1100}
      header={
        <Box>
          <Box display="flex" alignItems="center" gap={1.25} flexWrap="wrap">
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
              {headerTitle}
            </Typography>

            <Chip
              size="small"
              label={statusLabel}
              color={statusChipColor as any}
              variant={readOnly ? "outlined" : "filled"}
              sx={{ fontWeight: 800 }}
            />

            <Chip size="small" label="UI-only" variant="outlined" sx={{ fontWeight: 800 }} />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
            {headerSub}
          </Typography>
        </Box>
      }
    >
      {/* Top Grid */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" },
          alignItems: "start",
        }}
      >
        {/* Resumen (izq) */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: 4,
            borderColor: alpha(theme.palette.divider, 0.12),
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 1)} 0%, ${alpha(
              theme.palette.background.paper,
              0.9
            )} 100%)`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
            Resumen de recepción
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Inventory2OutlinedIcon fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Cajas capturadas
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 900 }}>
                  {captured}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LocalShippingOutlinedIcon fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Fecha
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 900 }}>
                  {recepcion?.fecha ? formatDateDisplay(recepcion.fecha) : "—"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: alpha(theme.palette.divider, 0.12) }} />

          <TextField
            label="Notas (UI-only)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={readOnly}
            placeholder="Notas operativas del empaque..."
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          />
        </Paper>

        {/* KPIs (der) */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: 4,
            borderColor: alpha(theme.palette.divider, 0.12),
            background: alpha(theme.palette.background.paper, 0.96),
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
            KPIs rápidos
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: alpha(theme.palette.divider, 0.12) }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Pendientes por empacar
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                {totals.remaining}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: alpha(theme.palette.divider, 0.12) }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Empacadas (total)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                {totals.packed}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: alpha(theme.palette.divider, 0.12) }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Plástico (cajas)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                {totals.plastico}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: alpha(theme.palette.divider, 0.12) }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Madera (cajas)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                {totals.madera}
              </Typography>
            </Paper>
          </Box>

          <Box mt={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                Progreso de empaque
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                {progress}%
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 10,
                borderRadius: 10,
                bgcolor: alpha(theme.palette.divider, 0.2),
              }}
            />

            <Box display="flex" justifyContent="space-between" mt={0.75}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Total: {captured}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Merma: {clampInt(lines["PLASTICO.Merma"]) + clampInt(lines["MADERA.Merma"])}
              </Typography>
            </Box>

            {overPacked && (
              <Box mt={1}>
                <Alert severity="error" sx={{ borderRadius: 3 }}>
                  Exceso: estás empacando {totals.packed - captured} cajas más de las capturadas ({captured}).
                </Alert>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Editor */}
      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          p: 2.25,
          borderRadius: 4,
          borderColor: alpha(theme.palette.divider, 0.12),
          background: alpha(theme.palette.background.paper, 0.96),
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Editor de Empaque (UI-only)
          </Typography>

          <Tooltip title="En Fase 4 se conectará al backend (persistencia, inventario, camiones y clientes).">
            <Chip size="small" label="Fase 4: Persistencia" variant="outlined" sx={{ fontWeight: 800 }} />
          </Tooltip>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 600 }}>
          Segmentado por material (Plástico/Madera) y calidad. Puedes escribir directo o usar +/-. Guardado aún deshabilitado.
        </Typography>

        <Divider sx={{ my: 2, borderColor: alpha(theme.palette.divider, 0.12) }} />

        {/* Material: PLÁSTICO */}
        <Box sx={{ mb: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1.25}>
            <Chip size="small" label="Plástico" sx={{ fontWeight: 900 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              “Primera (≥ 2da)” agrupa segunda/primera/extra en plástico (según entrevista).
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.25 }}>
            {plasticQualities.map((q) => {
              const key = `PLASTICO.${q}` as LineKey;
              const val = clampInt(lines[key]);

              return (
                <Paper
                  key={key}
                  variant="outlined"
                  sx={{ p: 1.25, borderRadius: 3, borderColor: alpha(theme.palette.divider, 0.12) }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mb={0.75}>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      {q}
                    </Typography>
                    <Tooltip title="UI-only">
                      <InfoOutlinedIcon fontSize="small" sx={{ opacity: 0.6 }} />
                    </Tooltip>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton size="small" disabled={readOnly} onClick={() => bumpLine(key, -1)}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>

                    <TextField
                      value={val}
                      onChange={(e) => setLine(key, e.target.value)}
                      disabled={readOnly}
                      type="number"
                      inputProps={{ min: 0 }}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
                    />

                    <IconButton size="small" disabled={readOnly} onClick={() => bumpLine(key, +1)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>

        {/* Material: MADERA */}
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={1.25}>
            <Chip size="small" label="Madera" sx={{ fontWeight: 900 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Extra/Primera/Segunda/Tercera/Cuarta + Niño/Maduro/Roña/Merma.
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.25 }}>
            {woodQualities.map((q) => {
              const key = `MADERA.${q}` as LineKey;
              const val = clampInt(lines[key]);

              return (
                <Paper
                  key={key}
                  variant="outlined"
                  sx={{ p: 1.25, borderRadius: 3, borderColor: alpha(theme.palette.divider, 0.12) }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mb={0.75}>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      {q}
                    </Typography>
                    <Tooltip title="UI-only">
                      <InfoOutlinedIcon fontSize="small" sx={{ opacity: 0.6 }} />
                    </Tooltip>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton size="small" disabled={readOnly} onClick={() => bumpLine(key, -1)}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>

                    <TextField
                      value={val}
                      onChange={(e) => setLine(key, e.target.value)}
                      disabled={readOnly}
                      type="number"
                      inputProps={{ min: 0 }}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
                    />

                    <IconButton size="small" disabled={readOnly} onClick={() => bumpLine(key, +1)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Paper>
    </AppDrawer>
  );
}
