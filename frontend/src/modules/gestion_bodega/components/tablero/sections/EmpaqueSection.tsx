// frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx
import React from "react";
import { Box, Button, Paper, Typography, alpha, useTheme } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { TableLayout } from "../../../../../components/common/TableLayout";
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

  const formatCajas = (value?: number | string | null) => {
    if (value == null) return "—";
    if (typeof value === "string") return value;
    const n = Number(value);
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
                "En este tablero, Empaque no tendrá tabla principal. Se abre como Drawer desde la columna “Empaque” en Recepciones (chip/acción)."}
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
                render: (_, i) => (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {`Empaque #${(page - 1) * pageSize + i + 1}`}
                  </Typography>
                )
              },
              {
                label: "Fecha",
                key: "fecha",
                render: (r) => {
                  if (!r.fecha) return "—";
                  // Mostrar fecha y hora local
                  try {
                    const d = new Date(r.fecha);
                    return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  } catch {
                    return r.fecha;
                  }
                }
              },
              {
                label: "Clasificación",
                key: "meta",
                render: (r) => {
                  if ((r as any).clasificacion_label) {
                    return (r as any).clasificacion_label;
                  }
                  const m = (r.meta || {}) as any;
                  // Prioridad 2: Desglose ya formateado desde backend (Legacy P4)
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
                  // Prioridad 3: Construcción manual si el backend manda campos planos en meta (fallback robusto)
                  if (m.material || m.calidad || m.tipo) {
                    return `${m.material || "?"} ${m.calidad || "?"} ${m.tipo || "?"}`;
                  }
                  return "—";
                }
              },
              { label: "Huertero", key: "huerta", render: (r) => <Typography variant="body2">{r.huerta || "—"}</Typography> },
              {
                label: "Cajas",
                key: "kg",
                align: "right",
                render: (r) => (
                  <Typography variant="body2" fontWeight={700}>
                    {formatCajas(r.kg)}
                  </Typography>
                ),
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
            count={inventoryRows.length}
            onPageChange={() => { }}
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
