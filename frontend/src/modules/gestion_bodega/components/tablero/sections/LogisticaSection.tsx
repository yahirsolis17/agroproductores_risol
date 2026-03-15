
import React, { useMemo } from "react";
import { Box, Typography, Button, Tabs, Tab, Tooltip } from "@mui/material";
import { TableLayout, type Column } from "../../../../../components/common/TableLayout";

export type LogisticaRowUI = {
  id: string | number;
  ref?: string | number;
  fecha?: string | null;
  cajas?: number | string | null;
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
  canManageCamiones?: boolean;
  camionesTooltip?: string;
  // Filters
  filterEstado?: string | null;
  onFilterEstadoChange?: (est: string | null) => void;
};

import { formatSmartDateTime } from "../../../../../global/utils/date";

const formatFecha = (iso?: string | null) => {
  return formatSmartDateTime(iso);
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
  canManageCamiones = true,
  camionesTooltip = "No tienes permiso para gestionar camiones.",
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
        render: (_r, i) => {
          const effectiveCount = count > 0 ? count : rows.length;
          return (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {`Camión #${effectiveCount - (page - 1) * pageSize - (i ?? 0)}`}
            </Typography>
          );
        },
      },
      {
        label: "Fecha de salida",
        key: "fecha",
        render: (r) => formatFecha(r.fecha),
      },
      {
        label: "Cajas",
        key: "cajas",
        align: "right",
        render: (r) => formatCajas(r.cajas),
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
          const anyRow = r as any;
          // 1. Show string folio if available (e.g., BOD-1-T1-W1-C00001)
          if (anyRow.folio && typeof anyRow.folio === "string" && anyRow.folio.trim()) {
            return anyRow.folio;
          }
          // 2. Fallback: show numero as padded #
          const num = anyRow.numero;
          if (num != null && !isNaN(Number(num))) {
            return `#${String(num).padStart(5, "0")}`;
          }
          // 3. Borradores — no folio yet
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
    [onEditCamion, count, rows.length, page, pageSize]
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
        <Tooltip title={canManageCamiones ? "" : camionesTooltip} disableHoverListener={canManageCamiones}>
          <span>
            <Button
              variant="contained"
              size="small"
              onClick={onAddCamion}
              disabled={!onAddCamion || !canManageCamiones}
            >
              Nuevo Cami?n
            </Button>
          </span>
        </Tooltip>
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
