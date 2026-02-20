// frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx
import React from "react";
import { Box, Button, Paper, Typography, alpha, useTheme } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { TableLayout } from "../../../../../components/common/TableLayout";
import { formatSmartDateTime } from "../../../../../global/utils/date";
import type { QueueItem } from "../../../types/tableroBodegaTypes";

type Metric = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
};

interface EmpaqueSectionProps {
  /** Métricas opcionales (placeholder UI en Fase 2/5). */
  pendientes?: number;
  empacadas?: number;
  cajasEmpacadas?: number;
  merma?: number;
  inventoryRows?: QueueItem[];

  page?: number;
  pageSize?: number;
  // F-03 FIX: total del servidor y callback real para paginación del lado del servidor
  totalCount?: number;
  onPageChange?: (page: number) => void;
  /** Acción opcional: aplica filtro visual en Recepciones (Fase 5). */
  onVerPendientes?: () => void;

  /** Texto opcional por si quieres personalizar guía. */
  helperText?: string;
}

const EmpaqueSection: React.FC<EmpaqueSectionProps> = ({
  pendientes = 0,
  empacadas = 0,
  cajasEmpacadas = 0,
  merma = 0,
  inventoryRows = [],
  page = 1,
  pageSize = 100,
  totalCount,
  onPageChange,
  onVerPendientes,
  helperText,
}) => {
  const theme = useTheme();

  const metrics: Metric[] = [
    { label: "Pendientes", value: pendientes, icon: <InventoryIcon fontSize="small" /> },
    { label: "Empacadas", value: empacadas, icon: <CheckCircleIcon fontSize="small" /> },
    { label: "Cajas empacadas", value: cajasEmpacadas, icon: <LocalMallIcon fontSize="small" /> },
    { label: "Merma", value: merma, icon: <ReportProblemIcon fontSize="small" /> },
  ];

  const fmtKg = (v: unknown) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(n)} cajas`;
  };

  return (
    <Box sx={{ py: 1 }}>
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              Empaque se opera desde Recepciones
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
              {helperText ??
                "En este tablero, Empaque no tendrá tabla principal. Se abre como Drawer desde la columna \u201cEmpaque\u201d en Recepciones (chip/acción)."}
            </Typography>

            <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={onVerPendientes}
                disabled={!onVerPendientes}
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 700,
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 },
                }}
              >
                Ver pendientes
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr" },
              gap: 1.25,
            }}
          >
            {metrics.map((m) => (
              <Box
                key={m.label}
                sx={{
                  p: 1.25,
                  borderRadius: 2.5,
                  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.92),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    {m.label}
                  </Typography>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.dark,
                    }}
                  >
                    {m.icon}
                  </Box>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.75, lineHeight: 1 }}>
                  {m.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Inventory Table */}
        <Box mt={3}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Stock Disponible (Inventario Real)
          </Typography>

          <TableLayout<QueueItem>
            data={inventoryRows}
            columns={[
              {
                label: "Referencia",
                key: "ref",
                render: (_, i) => {
                  const effectiveCount = (totalCount && totalCount > 0) ? totalCount : inventoryRows.length;
                  return (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {`Empaque #${(effectiveCount || 0) - (page - 1) * pageSize - (i ?? 0)}`}
                    </Typography>
                  );
                }
              },
              {
                label: "Fecha",
                key: "fecha",
                render: (r) => formatSmartDateTime(r.fecha)
              },
              {
                label: "Clasificación",
                key: "meta",
                render: (r) => {
                  if ((r as any).clasificacion_label) {
                    return (r as any).clasificacion_label;
                  }
                  const m = (r.meta || {}) as any;
                  const items = m.desglose;
                  if (Array.isArray(items) && items.length > 0) {
                    return (
                      <Box>
                        {items.map((line: string, idx: number) => (
                          <Typography key={idx} variant="caption" display="block" sx={{ lineHeight: 1.2 }}>
                            {line}
                          </Typography>
                        ))}
                      </Box>
                    );
                  }
                  if (m.material || m.calidad || m.tipo) {
                    return `${m.material || "?"} ${m.calidad || "?"} ${m.tipo || "?"}`;
                  }
                  return "—";
                }
              },
              { label: "Huertero", key: "huerta", render: (r) => <Typography variant="body2">{r.huerta || "—"}</Typography> },
              {
                label: "Cajas",
                key: "cajas",
                render: (r) => {
                  const total = (r as any).cajas ?? (r as any).kg ?? 0;
                  const totalStr = fmtKg(total);
                  // Determine which materials are present
                  const raw = ((r.meta || {}) as any).desglose_raw as Array<{ material?: string }> | undefined;
                  if (raw && raw.length > 0) {
                    const mats = new Set(raw.map(d => (d.material || "").toUpperCase()));
                    const hasMadera = mats.has("MADERA");
                    const hasPlastico = mats.has("PLASTICO");
                    const matLabel = hasMadera && hasPlastico ? "📦 · 🔲" : hasMadera ? "📦 Madera" : hasPlastico ? "🔲 Plástico" : "";
                    if (matLabel) {
                      return (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{totalStr}</Typography>
                          <Typography variant="caption" color="text.secondary">{matLabel}</Typography>
                        </Box>
                      );
                    }
                  }
                  return totalStr;
                },
              },
              {
                label: "Despachado",
                key: "despachado",
                render: (r) => {
                  const meta = (r.meta || {}) as any;
                  const isDespachado = meta?.despachado === true || (r as any).despachado === true;
                  return (
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: isDespachado ? "success.main" : "text.secondary",
                      }}
                    >
                      {isDespachado ? "SÍ" : "No"}
                    </Typography>
                  );
                }
              },
            ]}
            rowKey={(r) => r.id}
            page={page}
            pageSize={pageSize}
            // F-03 FIX: Usar totalCount del servidor en lugar de inventoryRows.length
            count={totalCount ?? inventoryRows.length}
            onPageChange={onPageChange ?? (() => { })}
            loading={false}
            dense
            striped={true}
            emptyMessage="No hay stock disponible registrado."
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default EmpaqueSection;
