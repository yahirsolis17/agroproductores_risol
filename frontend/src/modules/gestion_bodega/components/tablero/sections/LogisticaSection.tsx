
import React, { useMemo } from "react";
import { Box, Typography, Button, Tabs, Tab } from "@mui/material";
import { TableLayout, type Column } from "../../../../../components/common/TableLayout";

export type LogisticaRowUI = {
  id: string | number;
  ref?: string | number;
  fecha?: string | null;
  kg?: number | string | null; // en tu mapper hoy viene como `kg` (aunque lo rotules "Cajas")
  estado?: string | null;
  acciones?: any;
};

type MetaLike = {
  page?: number;
  page_size?: number;
  count?: number;
  next?: string | null;
  previous?: string | null;
  total_pages?: number;
  total?: number;
};

type Props = {
  hasWeeks: boolean;
  semanaIndex: number | null;
  rows: LogisticaRowUI[];
  meta: MetaLike;
  loading: boolean;
  onPageChange: (page: number) => void;
  onAddCamion?: () => void;
  onEditCamion?: (row: LogisticaRowUI) => void;
  // Filters
  filterEstado?: string | null;
  onFilterEstadoChange?: (est: string | null) => void;
};

const formatFecha = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const formatCajas = (v?: number | string | null) => {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  return new Intl.NumberFormat(undefined).format(v);
};

const formatEstado = (estado?: string | null) => {
  const raw = (estado ?? "").toString().trim();
  if (!raw) return "—";
  return raw;
};



const LogisticaSection: React.FC<Props> = ({
  hasWeeks,
  semanaIndex,
  rows,
  meta,
  loading,
  onPageChange,
  onAddCamion,
  onEditCamion,
  filterEstado,
  onFilterEstadoChange,
}) => {
  const page = useMemo(() => Math.max(1, Number(meta?.page ?? 1)), [meta?.page]);
  const pageSize = useMemo(() => Math.max(1, Number(meta?.page_size ?? 10)), [meta?.page_size]);
  const count = useMemo(() => {
    const base = Number(meta?.count ?? 0);
    if (Number.isFinite(base) && base > 0) return base;
    const legacyTotal = Number(meta?.total ?? 0);
    return Number.isFinite(legacyTotal) ? legacyTotal : 0;
  }, [meta?.count, meta?.total]);

  const emptyMessage = useMemo(() => {
    if (!hasWeeks) return "Aún no hay semanas registradas para mostrar logística.";
    if (!rows || rows.length === 0) return "No hay filas en logística para esta semana.";
    return "No hay datos.";
  }, [hasWeeks, rows]);

  const columns: Column<LogisticaRowUI>[] = useMemo(
    () => [
      {
        label: "Referencia",
        key: "ref",
        render: (r) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.ref}</Typography>,
      },
      {
        label: "Fecha de salida",
        key: "fecha",
        render: (r) => formatFecha(r.fecha),
      },
      {
        label: "Cajas",
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
        label: "Folio",
        key: "ref",
        render: (r) => {
          const raw = (r.estado || "").toString().trim().toUpperCase();
          if (raw === "CONFIRMADO") {
            let s = String(r.ref || "");
            // kpis.py sets ref to "Camión {numero}"
            if (s.includes("Camión")) {
              s = s.replace("Camión", "").trim();
              const n = parseInt(s, 10);
              if (!isNaN(n)) return `#${String(n).padStart(5, "0")}`;
            }
          }
          return "—";
        },
      },
      {
        label: "Acciones",
        key: "acciones",
        render: (r) => {
          if (!onEditCamion) return "—";
          const estado = (r.estado ?? "").toString().trim().toUpperCase();
          if (estado !== "BORRADOR") return "—";
          return (
            <Button
              size="small"
              variant="outlined"
              onClick={(event) => {
                event.stopPropagation();
                onEditCamion(r);
              }}
            >
              Completar
            </Button>
          );
        },
      },
    ],
    [onEditCamion]
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    // newValue is 'ALL', 'BORRADOR', 'CONFIRMADO'
    const val = newValue === "ALL" ? null : newValue;
    if (onFilterEstadoChange) onFilterEstadoChange(val);
  };

  const currentTab = filterEstado || "ALL";

  return (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.2 }}>
            Logística
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Cola y estado operativo{typeof semanaIndex === "number" ? ` — Semana ${semanaIndex}` : ""}.
          </Typography>
        </Box>
        {onAddCamion && (
          <Button variant="contained" size="small" onClick={onAddCamion}>
            Nuevo Camión
          </Button>
        )}
      </Box>

      {/* Tabs Filter */}
      {onFilterEstadoChange && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="filtro estado logistica">
            <Tab label="Todos" value="ALL" />
            <Tab label="Borradores" value="BORRADOR" />
            <Tab label="Confirmados" value="CONFIRMADO" />
          </Tabs>
        </Box>
      )}

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
        onRowClick={onEditCamion ? (r) => onEditCamion(r) : undefined}
      />
    </Box>
  );
};

export default LogisticaSection;
