// frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx
import React, { useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  alpha,
  useTheme,
} from "@mui/material";

import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalMallOutlinedIcon from "@mui/icons-material/LocalMallOutlined";
import AllInboxOutlinedIcon from "@mui/icons-material/AllInboxOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

type KPIItem = {
  label: string;
  value: number;
  icon: React.ReactNode;
};

export interface EmpaqueMiniKpisProps {
  /** Total de cajas capturadas en la recepción (disponibles base). */
  totalCapturadas: number;

  /** Total de cajas empacadas (suma de plástico + madera, sin merma). */
  totalEmpacadas: number;

  /** Total empacadas en plástico. */
  plastico: number;

  /** Total empacadas en madera. */
  madera: number;

  /** Merma (si aplica en tu UI-only). */
  merma: number;

  /** Opcional: estado bloqueado (semana cerrada / no operable). */
  blocked?: boolean;

  /** Opcional: etiqueta extra (UI-only). */
  helperLabel?: string;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function n0(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function EmpaqueMiniKpis(props: EmpaqueMiniKpisProps) {
  const theme = useTheme();

  const totalCapturadas = n0(props.totalCapturadas);
  const totalEmpacadas = n0(props.totalEmpacadas);
  const plastico = n0(props.plastico);
  const madera = n0(props.madera);
  const merma = n0(props.merma);

  const pendientes = Math.max(0, totalCapturadas - totalEmpacadas - merma);

  const pct = useMemo(() => {
    if (totalCapturadas <= 0) return 0;
    const raw = (totalEmpacadas / totalCapturadas) * 100;
    return clamp(Math.round(raw));
  }, [totalCapturadas, totalEmpacadas]);

  const kpis: KPIItem[] = useMemo(
    () => [
      {
        label: "Pendientes",
        value: pendientes,
        icon: <Inventory2OutlinedIcon fontSize="small" />,
      },
      {
        label: "Empacadas",
        value: totalEmpacadas,
        icon: <LocalMallOutlinedIcon fontSize="small" />,
      },
      {
        label: "Plástico",
        value: plastico,
        icon: <AllInboxOutlinedIcon fontSize="small" />,
      },
      {
        label: "Madera",
        value: madera,
        icon: <AllInboxOutlinedIcon fontSize="small" />,
      },
    ],
    [pendientes, totalEmpacadas, plastico, madera]
  );

  const cardSx = {
    p: 1.25,
    borderRadius: 3,
    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
    background: alpha(theme.palette.background.paper, 0.92),
  } as const;

  const iconBoxSx = {
    width: 30,
    height: 30,
    borderRadius: 2.25,
    display: "grid",
    placeItems: "center",
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.dark,
    flexShrink: 0,
  } as const;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        borderColor: alpha(theme.palette.divider, 0.14),
        background: `linear-gradient(135deg, ${alpha(
          theme.palette.primary.main,
          0.02
        )} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
      }}
    >
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 2,
            mb: 1.25,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Progreso de empaque
          </Typography>

          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              color: props.blocked ? theme.palette.warning.dark : "text.secondary",
            }}
          >
            {props.helperLabel ?? (props.blocked ? "Modo lectura (semana cerrada)" : "UI-only")}
          </Typography>
        </Box>

        {/* KPIs */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 1.25,
            mb: 1.5,
          }}
        >
          {kpis.map((k) => (
            <Box key={k.label} sx={cardSx}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  mb: 0.75,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
                  {k.label}
                </Typography>
                <Box sx={iconBoxSx}>{k.icon}</Box>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.05 }}>
                {k.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Barra + Totales */}
        <Box
          sx={{
            p: 1.25,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: 0.75,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              Progreso de empaque
            </Typography>

            <Typography variant="body2" sx={{ fontWeight: 950 }}>
              {pct}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 10,
              borderRadius: 999,
              backgroundColor: alpha(theme.palette.divider, 0.18),
              "& .MuiLinearProgress-bar": {
                borderRadius: 999,
              },
            }}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              mt: 1,
              flexWrap: "wrap",
              color: "text.secondary",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              Total: {totalCapturadas}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ReportProblemOutlinedIcon
                fontSize="small"
                sx={{ color: alpha(theme.palette.warning.main, 0.9) }}
              />
              <Typography variant="caption" sx={{ fontWeight: 900 }}>
                Merma: {merma}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
