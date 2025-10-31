// src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx
import React from "react";
import { Box, Stack, Alert, AlertTitle, Link, Typography } from "@mui/material";
import type { AlertColor } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import type { AlertCardUI } from "../../hooks/useTableroBodega";
import { useSearchParams } from "react-router-dom";

type Props = {
  alerts: AlertCardUI[];
  loading?: boolean;
  onNavigate?: (href: string) => void;
};

const MotionBox = motion(Box);

const itemAnim = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

const toMuiSeverity = (s: "info" | "warning" | "critical"): AlertColor =>
  s === "critical" ? "error" : s;

/** Si el href no trae isoSemana, injerta el actual desde la URL. */
function ensureIsoSemana(href: string, isoSemana: string | null) {
  if (!isoSemana) return href;
  const url = new URL(href, window.location.origin);
  if (!url.searchParams.has("isoSemana")) {
    url.searchParams.set("isoSemana", isoSemana);
  }
  return url.pathname + (url.search ? url.search : "");
}

const AvisosPanel: React.FC<Props> = ({ alerts, loading, onNavigate }) => {
  const [sp] = useSearchParams();
  const currentIso = sp.get("isoSemana");

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="body2" color="text.secondary">Cargando avisos…</Typography>
      </Box>
    );
  }

  if (!alerts?.length) {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="body2" color="text.secondary">Sin avisos por ahora.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.25}>
      <AnimatePresence initial={false}>
        {alerts.map((a) => {
          const href = ensureIsoSemana(a.href, currentIso);
          return (
            <MotionBox key={a.code} {...itemAnim}>
              <Alert severity={toMuiSeverity(a.severity)} variant="outlined" sx={{ borderRadius: 2 }}>
                <AlertTitle sx={{ fontWeight: 700, mb: 0.25 }}>{a.title}</AlertTitle>
                <Typography variant="body2" sx={{ mb: 0.5 }}>{a.description}</Typography>
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => (onNavigate ? onNavigate(href) : window.location.assign(href))}
                  sx={{ fontWeight: 600 }}
                >
                  Ver detalles →
                </Link>
              </Alert>
            </MotionBox>
          );
        })}
      </AnimatePresence>
    </Stack>
  );
};

export default AvisosPanel;
