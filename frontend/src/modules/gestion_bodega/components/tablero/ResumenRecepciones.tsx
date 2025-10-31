// src/modules/gestion_bodega/components/tablero/ResumenRecepciones.tsx
import React, { useMemo } from "react";
import {  Tooltip } from "@mui/material";
import { TableLayout, Column } from "../../../../components/common/TableLayout";
import type { QueueRowUI } from "../../hooks/useTableroBodega";

type Props = {
  rows: QueueRowUI[];
  meta: { page: number; page_size: number; total: number };
  loading?: boolean;
  onPageChange: (n: number) => void;
  onRowClick?: (row: QueueRowUI) => void; // opcional: abrir detalle
  striped?: boolean;
  dense?: boolean;
};


const ResumenRecepciones: React.FC<Props> = ({
  rows,
  meta,
  loading,
  onPageChange,
  onRowClick,
  striped = true,
  dense = true,
}) => {
  // NOTA: Ref y Tags se quitaron para alinear con la vista principal:
  // Fecha | Huertero | Tipo | Cajas | Notas | Estado
  const columns = useMemo<Column<QueueRowUI>[]>(() => [
    { label: "Fecha", key: "fecha", render: (r) => r.fecha },
    { label: "Huertero", key: "huertero", render: (r) => r.huertero ?? "—" },
    { label: "Tipo", key: "tipo", render: (r) => r.tipo ?? "—" },
    { label: "Cajas", key: "kg", align: "right", render: (r) => r.kg },
    {
      label: "Notas",
      key: "notas",
      render: (r) =>
        r.notas ? (
          <Tooltip title={r.notas}>
            <span style={{ display: "inline-block", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.notas}
            </span>
          </Tooltip>
        ) : "—",
    },
    { label: "Estado", key: "estado", render: (r) => r.estado },
  ], []);

  return (
    <TableLayout<QueueRowUI>
      columns={columns}
      data={rows}
      page={meta.page}
      pageSize={meta.page_size}
      count={meta.total}
      onPageChange={onPageChange}
      serverSidePagination
      loading={!!loading}
      striped={striped}
      dense={dense}
      onRowClick={onRowClick}
    />
  );
};

export default ResumenRecepciones;
