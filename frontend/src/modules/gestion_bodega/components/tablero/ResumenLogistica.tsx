// src/modules/gestion_bodega/components/tablero/ResumenLogistica.tsx
import React, { useMemo } from "react";
import { Chip } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { TableLayout, Column } from "../../../../components/common/TableLayout";
import type { QueueRowUI } from "../../hooks/useTableroBodega";

type Props = {
  rows: QueueRowUI[];
  meta: { page: number; page_size: number; total: number };
  loading?: boolean;
  onPageChange: (n: number) => void;
  onRowClick?: (row: QueueRowUI) => void;
  striped?: boolean;
  dense?: boolean;
};

const MotionDiv = motion.div;

const ResumenLogistica: React.FC<Props> = ({
  rows,
  meta,
  loading,
  onPageChange,
  onRowClick,
  striped = true,
  dense = true,
}) => {
  const columns = useMemo<Column<QueueRowUI>[]>(() => [
    { label: "Fecha programada", key: "fecha", render: (r) => r.fecha },
    { label: "Cajas", key: "kg", align: "right", render: (r) => r.kg },
    { label: "Estado", key: "estado", render: (r) => r.estado },
    {
      label: "Tags",
      key: "chips",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <AnimatePresence initial={false}>
            {r.chips.map((c, i) => (
              <MotionDiv
                key={`${r.id}-chip-${i}-${c}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Chip size="small" label={c} variant="outlined" />
              </MotionDiv>
            ))}
          </AnimatePresence>
        </div>
      ),
    },
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

export default ResumenLogistica;
