// src/modules/gestion_bodega/components/tablero/ResumenGastos.tsx
import React from "react";
import { TableLayout, Column } from "../../../../components/common/TableLayout";
import { Chip } from "@mui/material";

type GastoItem = {
  tipo: "madera" | "consumible";
  ref: string;
  monto: number;
  fecha: string; // DD/MM/YYYY o ISO (sin TZ)
};

type Props = {
  items: GastoItem[];
  loading?: boolean;
  onNavigateRef?: (ref: string) => void;
};

const currency = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const columns: Column<GastoItem>[] = [
  { label: "Ref", key: "ref", render: (r) => r.ref },
  {
    label: "Tipo",
    key: "tipo",
    render: (r) => (
      <Chip
        size="small"
        label={r.tipo === "madera" ? "Madera" : "Consumible"}
        color={r.tipo === "madera" ? "primary" : "default"}
      />
    ),
  },
  { label: "Monto", key: "monto", align: "right", render: (r) => currency(r.monto) },
  { label: "Fecha", key: "fecha", render: (r) => r.fecha },
];

const ResumenGastos: React.FC<Props> = ({ items, loading }) => {
  return (
    <TableLayout<GastoItem>
      columns={columns}
      data={items}
      page={1}
      pageSize={items.length || 5}
      count={items.length}
      onPageChange={() => {}}
      loading={!!loading}
      striped
      dense
      // onRowClick? Si tu TableLayout lo soporta:
      // onRowClick={(row) => onNavigateRef?.(row.ref)}
    />
  );
};

export default ResumenGastos;
