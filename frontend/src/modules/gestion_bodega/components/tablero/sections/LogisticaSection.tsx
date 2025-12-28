import React, { useMemo } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { TableLayout, type Column } from "../../../../../components/common/TableLayout";

type ChipLike =
  | string
  | { label: string; color?: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info" };

export type LogisticaRowUI = {
  id: string | number;
  ref?: string | number;
  fecha?: string | null;
  kg?: number | string | null; // en tu mapper hoy viene como `kg` (aunque lo rotules "Cajas")
  estado?: string | null;
  chips?: ChipLike[] | null;
};

type MetaLike = {
  page?: number;
  page_size?: number;
  total?: number;
  count?: number;

  pages?: number;
  total_pages?: number;

  next?: string | null;
  previous?: string | null;
};

type Props = {
  hasWeeks: boolean;
  semanaIndex: number | null;
  rows: LogisticaRowUI[];
  meta: MetaLike;
  loading: boolean;
  onPageChange: (page: number) => void; // 1-based
};

const toInt = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampMin = (n: number, min: number) => (n < min ? min : n);

const formatFecha = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const formatCajas = (v?: number | string | null) => {
  if (v == null) return "—";
  // Si ya viene formateado (“12 cajas”), respetarlo
  if (typeof v === "string") return v;

  // Si viene numérico, mostrar como número (tu etiqueta dice "Cajas"; si luego cambias a "Kg" aquí lo ajustas)
  return new Intl.NumberFormat(undefined).format(v);
};

const formatEstado = (estado?: string | null) => {
  const raw = (estado ?? "").toString().trim();
  if (!raw) return "—";
  return raw;
};

const renderChips = (chips?: ChipLike[] | null) => {
  if (!chips || chips.length === 0) return "—";
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {chips.map((c, idx) => {
        const label = typeof c === "string" ? c : c.label;
        const color = typeof c === "string" ? "default" : (c.color ?? "default");
        return <Chip key={`${label}-${idx}`} label={label} size="small" color={color} variant="outlined" />;
      })}
    </Stack>
  );
};

const LogisticaSection: React.FC<Props> = ({
  hasWeeks,
  semanaIndex,
  rows,
  meta,
  loading,
  onPageChange,
}) => {
  // Normalización estricta para que TableLayout funcione sin tocarlo
  const page = useMemo(() => clampMin(toInt(meta?.page, 1), 1), [meta?.page]);
  const pageSize = useMemo(() => clampMin(toInt(meta?.page_size, 10), 1), [meta?.page_size]);

  const count = useMemo(() => {
    const total = toInt(meta?.total, 0);
    const countFallback = toInt(meta?.count, 0);

    // Si no viene total/count, usamos pages*pageSize SOLO para que la paginación no quede “rota”
    const pages = toInt(meta?.pages ?? meta?.total_pages, 0);

    const resolved = total > 0 ? total : countFallback > 0 ? countFallback : pages > 0 ? pages * pageSize : 0;
    return resolved;
  }, [meta?.total, meta?.count, meta?.pages, meta?.total_pages, pageSize]);

  const emptyMessage = useMemo(() => {
    if (!hasWeeks) return "Aún no hay semanas registradas para mostrar logística.";
    if (!rows || rows.length === 0) return "No hay filas en logística para esta semana.";
    return "No hay datos.";
  }, [hasWeeks, rows]);

  const columns: Column<LogisticaRowUI>[] = useMemo(
    () => [
      {
        label: "Fecha programada",
        key: "fecha",
        render: (r) => formatFecha(r.fecha),
      },
      {
        label: "Kg",
        key: "kg",
        align: "right",
        render: (r) => formatCajas(r.kg),
      },
      {
        label: "Estado",
        key: "estado",
        render: (r) => formatEstado(r.estado),
      },
      {
        label: "Tags",
        key: "chips",
        render: (r) => renderChips(r.chips),
      },
    ],
    []
  );

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.2 }}>
          Logística
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Cola y estado operativo{typeof semanaIndex === "number" ? ` — Semana ${semanaIndex}` : ""}.
        </Typography>
      </Box>

      <TableLayout<LogisticaRowUI>
        data={Array.isArray(rows) ? rows : []}
        columns={columns}
        rowKey={(r) => r.id ?? r.ref}
        page={page}
        pageSize={pageSize}
        metaPageSize={meta?.page_size}
        count={count}
        onPageChange={onPageChange}
        loading={loading}
        skeletonRows={6}
        dense
        striped
        serverSidePagination
        emptyMessage={emptyMessage}
      />
    </Box>
  );
};

export default LogisticaSection;
