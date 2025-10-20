// src/modules/gestion_bodega/components/tablero/ResumenRecepciones.tsx
import React from "react";
import { Chip } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { TableLayout, Column } from "../../../../components/common/TableLayout";
import type { QueueRowUI } from "../../hooks/useTableroBodega";

type Props = {
  rows: QueueRowUI[];
  meta: { page: number; page_size: number; total: number };
  loading?: boolean;
  onPageChange: (n: number) => void;
};

const MotionDiv = motion.div;

const columns: Column<QueueRowUI>[] = [
  { label: "Ref", key: "ref", render: (r) => r.ref },
  { label: "Fecha", key: "fecha", render: (r) => r.fecha },
  { label: "Huerta", key: "huerta", render: (r) => r.huerta },
  { label: "Kg", key: "kg", align: "right", render: (r) => r.kg },
  { label: "Estado", key: "estado", render: (r) => r.estado },
  {
    label: "Tags",
    key: "chips",
    render: (r) => (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <AnimatePresence initial={false}>
          {r.chips.map((c, i) => (
            <MotionDiv key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Chip size="small" label={c} variant="outlined" />
            </MotionDiv>
          ))}
        </AnimatePresence>
      </div>
    ),
  },
];

const ResumenRecepciones: React.FC<Props> = ({ rows, meta, loading, onPageChange }) => {
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
      striped
      dense
    />
  );
};

export default ResumenRecepciones;
