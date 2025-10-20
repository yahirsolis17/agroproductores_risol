// src/modules/gestion_bodega/components/tablero/QuickActions.tsx
import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { Add as AddIcon, LocalShipping as TruckIcon, GridView as GridIcon } from "@mui/icons-material";
import { PermissionButton } from "../../../../components/common/PermissionButton";

type QuickAction = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  perm?: string;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "success" | "info" | "warning" | "error";
};

type Props = {
  bodegaId: number;         // ✅ nuevo: lo usamos para construir rutas reales
  temporadaId: number;
  onNavigate: (href: string) => void;
  actions?: QuickAction[];  // opcional: para sobreescribir desde arriba
};

const QuickActions: React.FC<Props> = ({ bodegaId, temporadaId, onNavigate, actions }) => {
  const defaults = useMemo<QuickAction[]>(
    () => [
      {
        label: "Nueva recepción",
        // Abre la pantalla de capturas con la temporada; si manejas modal, puedes añadir &modal=recepcion
        href: `/bodega/${bodegaId}/capturas?temporada=${temporadaId}`,
        icon: <AddIcon />,
        perm: "add_recepcion",
        variant: "contained",
        color: "primary",
      },
      {
        label: "Ubicaciones críticas",
        href: `/bodega/${bodegaId}/inventarios?temporada=${temporadaId}&solo_criticas=1`,
        icon: <GridIcon />,
        perm: "view_ubicaciones",
        variant: "outlined",
        color: "warning",
      },
      {
        label: "Despachos de hoy",
        href: `/bodega/${bodegaId}/logistica?temporada=${temporadaId}&hoy=1`,
        icon: <TruckIcon />,
        perm: "view_camion",
        variant: "outlined",
        color: "secondary",
      },
    ],
    [bodegaId, temporadaId]
  );

  const items = actions?.length ? actions : defaults;

  return (
    <Box display="flex" gap={1} flexWrap="wrap">
      {items.map((a, idx) => (
        <PermissionButton
          key={idx}
          perm={a.perm ?? "view_bodega"}
          variant={a.variant ?? "outlined"}
          color={a.color ?? "primary"}
          startIcon={a.icon}
          onClick={() => onNavigate(a.href)}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500 }}
        >
          {a.label}
        </PermissionButton>
      ))}
    </Box>
  );
};

export default QuickActions;
