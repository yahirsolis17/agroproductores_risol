// src/modules/gestion_bodega/components/tablero/QuickActions.tsx
import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { Add as AddIcon, LocalShipping as TruckIcon, GridView as GridIcon } from "@mui/icons-material";
import { PermissionButton } from "../../../../components/common/PermissionButton";
import { useSearchParams } from "react-router-dom";

type QuickAction = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  perm?: string;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "success" | "info" | "warning" | "error";
};

type Props = {
  bodegaId: number;
  temporadaId: number;
  onNavigate: (href: string) => void;
  actions?: QuickAction[];
  dense?: boolean;  // ← nuevo
  pill?: boolean;   // ← nuevo
};

/**
 * Mezcla el path base con el contexto actual (temporada + isoSemana) y query extra.
 * - Prioridad: extra > contexto actual (permite overrides específicos).
 */
function composeHref(
  basePath: string,
  ctx: { temporadaId?: number; isoSemana?: string | null },
  extra?: Record<string, string | number | boolean | undefined>
) {
  const qs = new URLSearchParams();
  if (ctx?.temporadaId) qs.set("temporada", String(ctx.temporadaId));
  if (ctx?.isoSemana) qs.set("isoSemana", String(ctx.isoSemana));

  if (extra) {
    Object.entries(extra).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      // override si ya existe
      qs.set(k, String(v));
    });
  }

  const tail = qs.toString();
  return tail ? `${basePath}?${tail}` : basePath;
}

const QuickActions: React.FC<Props> = ({ bodegaId, temporadaId, onNavigate, actions, dense = false, pill = false }) => {
  const [sp] = useSearchParams();
  const isoSemana = sp.get("isoSemana"); // preserva semana visible en navegación

  const ctx = useMemo(() => ({ temporadaId, isoSemana }), [temporadaId, isoSemana]);

  const defaults = useMemo<QuickAction[]>(
    () => [
      {
        label: "Nueva recepcion",
        href: composeHref(`/bodega/${bodegaId}/capturas`, ctx, { modal: "recepcion" }),
        icon: <AddIcon />,
        perm: "add_recepcion",
        variant: "contained",
        color: "primary",
      },
      {
        label: "Inventario critico",
        href: composeHref(`/bodega/${bodegaId}/inventarios`, ctx, { solo_criticas: 1 }),
        icon: <GridIcon />,
        perm: "view_inventario_plastico",
        variant: "outlined",
        color: "warning",
      },
      {
        label: "Despachos de hoy",
        href: composeHref(`/bodega/${bodegaId}/logistica`, ctx, { hoy: 1 }),
        icon: <TruckIcon />,
        perm: "view_camion",
        variant: "outlined",
        color: "secondary",
      },
    ],
    [bodegaId, ctx]
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
          size={dense ? "small" : "medium"}
          sx={{
            borderRadius: pill ? 999 : 2,
            textTransform: "none",
            fontWeight: 600,
            px: dense ? 1.5 : 2,
            height: dense ? 36 : 40,
            "& .MuiButton-startIcon": { mr: 0.75 },
          }}
        >
          {a.label}
        </PermissionButton>
      ))}
    </Box>
  );
};

export default QuickActions;
