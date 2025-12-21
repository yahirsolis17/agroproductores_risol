// frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx
import React from "react";
import { Alert, AlertTitle, Box, Button, alpha, useTheme } from "@mui/material";
import KpiCards from "../KpiCards";

interface ResumenSectionProps {
  items: any[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

const ResumenSection: React.FC<ResumenSectionProps> = ({ items, loading, error, onRetry }) => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 1 }}>
      {error ? (
        <Alert
          severity="error"
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            backgroundColor: alpha(theme.palette.error.main, 0.04),
          }}
          action={
            <Button color="inherit" size="small" onClick={onRetry} sx={{ fontWeight: 700 }}>
              Reintentar
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 800 }}>Error al cargar KPIs</AlertTitle>
          {String((error as any)?.message ?? "Error desconocido")}
        </Alert>
      ) : (
        <KpiCards items={items} loading={loading} />
      )}
    </Box>
  );
};

export default ResumenSection;
