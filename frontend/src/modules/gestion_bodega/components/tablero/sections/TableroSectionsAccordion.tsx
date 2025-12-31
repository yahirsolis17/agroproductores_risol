// frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export type TableroSectionKey = "resumen" | "recepciones" | "empaque" | "logistica";

type SectionBadges = Partial<
  Record<TableroSectionKey, Array<{ label: string; color?: "default" | "primary" | "success" | "warning" | "error" }>>
>;

interface TableroSectionsAccordionProps {
  /** Si true: default "recepciones". Si false: default "resumen". */
  isActiveSelectedWeek: boolean;
  isExpiredWeek?: boolean;

  resumen: React.ReactNode;
  recepciones: React.ReactNode;
  empaque?: React.ReactNode;
  logistica?: React.ReactNode;

  badges?: SectionBadges;

  /** Forzar apertura puntual (one-shot) */
  forcedOpen?: { key: TableroSectionKey; token: number } | null;

  onSectionOpen?: (key: TableroSectionKey) => void;
}

const titleByKey: Record<TableroSectionKey, string> = {
  resumen: "Resumen",
  recepciones: "Recepciones",
  empaque: "Empaque",
  logistica: "Despachos / Logística",
};

const subtitleByKey: Record<TableroSectionKey, string> = {
  resumen: "KPIs, alertas y estado general",
  recepciones: "Operación principal de la semana",
  empaque: "Se opera desde Recepciones (Drawer)",
  logistica: "Cola y seguimiento de despachos",
};

const TableroSectionsAccordion: React.FC<TableroSectionsAccordionProps> = ({
  isActiveSelectedWeek,
  isExpiredWeek,
  resumen,
  recepciones,
  empaque,
  logistica,
  badges,
  forcedOpen,
  onSectionOpen,
}) => {
  const theme = useTheme();

  const defaultKey = useMemo<TableroSectionKey>(
    () => (isActiveSelectedWeek ? "recepciones" : "resumen"),
    [isActiveSelectedWeek]
  );

  const [openKey, setOpenKey] = useState<TableroSectionKey>(defaultKey);

  // Regla del plan: si cambia semana activa/cerrada, el default manda
  useEffect(() => {
    setOpenKey(defaultKey);
  }, [defaultKey]);

  // Forzado puntual: cada token nuevo abre la sección indicada
  useEffect(() => {
    if (!forcedOpen) return;
    setOpenKey(forcedOpen.key);
  }, [forcedOpen?.token]);

  const handleToggle = (key: TableroSectionKey) => {
    setOpenKey(key);
    onSectionOpen?.(key);
  };

  const renderHeader = (key: TableroSectionKey) => {
    let chips = badges?.[key] ?? [];
    if (key === "recepciones" && isExpiredWeek) {
      chips = [...chips, { label: "Caducada", color: "error" }];
    }
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          width: "100%",
          pr: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {titleByKey[key]}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.25 }}>
            {subtitleByKey[key]}
          </Typography>
        </Box>

        {!!chips.length && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {chips.map((c, idx) => (
              <Chip
                key={`${key}-chip-${idx}`}
                label={c.label}
                size="small"
                color={c.color ?? "default"}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  backgroundColor: c.color ? undefined : alpha(theme.palette.divider, 0.14),
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const accSx = {
    borderRadius: 3,
    overflow: "hidden",
    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
    boxShadow: "none",
    "&:before": { display: "none" },
    "&.MuiAccordion-root.Mui-expanded": {
      borderColor: alpha(theme.palette.primary.main, 0.22),
      boxShadow: `0 10px 28px ${alpha(theme.palette.common.black, 0.06)}`,
    },
  } as const;

  const sumSx = {
    px: { xs: 1.5, md: 2 },
    py: 1.25,
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(
      theme.palette.background.paper,
      1
    )} 100%)`,
    "& .MuiAccordionSummary-content": { my: 0.5 },
  } as const;

  const detailsSx = { px: { xs: 1.5, md: 2 }, pb: 2 } as const;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Accordion expanded={openKey === "resumen"} onChange={() => handleToggle("resumen")} sx={accSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sumSx}>
          {renderHeader("resumen")}
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>{resumen}</AccordionDetails>
      </Accordion>

      <Accordion expanded={openKey === "recepciones"} onChange={() => handleToggle("recepciones")} sx={accSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sumSx}>
          {renderHeader("recepciones")}
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>{recepciones}</AccordionDetails>
      </Accordion>

      <Accordion expanded={openKey === "empaque"} onChange={() => handleToggle("empaque")} sx={accSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sumSx}>
          {renderHeader("empaque")}
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>
          {empaque ?? (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Sección pendiente. En el plan, Empaque vive como Drawer y se abre desde Recepciones.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={openKey === "logistica"} onChange={() => handleToggle("logistica")} sx={accSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sumSx}>
          {renderHeader("logistica")}
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>
          {logistica ?? (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Sección pendiente de integración en este paso.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default TableroSectionsAccordion;
