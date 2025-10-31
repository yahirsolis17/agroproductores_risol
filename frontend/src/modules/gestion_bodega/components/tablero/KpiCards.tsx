// src/modules/gestion_bodega/components/tablero/KpiCards.tsx
import React from "react";
import { Paper, Box, Typography, Skeleton } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import type { KpiCard } from "../../hooks/useTableroBodega";

type Props = {
  items: KpiCard[];
  loading?: boolean;
};

const MotionPaper = motion(Paper);

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

const KpiCards: React.FC<Props> = ({ items, loading }) => {
  const placeholders = Array.from({ length: Math.max(4, items.length || 4) });

  return (
    <Box
      role="region"
      aria-label="Indicadores de la semana"
      display="grid"
      gap={2}
      sx={{
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        },
      }}
    >
      <AnimatePresence initial={false}>
        {(loading ? placeholders : items).map((it, idx) => {
          const key = loading ? `ph-${idx}` : (it as KpiCard).id;
          return (
            <MotionPaper
              key={key}
              elevation={1}
              variant="outlined"
              {...fadeIn}
              sx={{
                borderRadius: 2,
                minHeight: 112, // altura estable para evitar saltos en carga
              }}
            >
              <Box px={2} py={2}>
                {loading ? (
                  <>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="55%" />
                  </>
                ) : (
                  <>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                      sx={{ fontWeight: 600, letterSpacing: 0.2 }}
                    >
                      {(it as KpiCard).title}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, lineHeight: 1.2 }}
                      aria-live="polite"
                    >
                      {(it as KpiCard).primary}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {(it as KpiCard).secondary}
                    </Typography>
                  </>
                )}
              </Box>
            </MotionPaper>
          );
        })}
      </AnimatePresence>
    </Box>
  );
};

export default KpiCards;
