import React from 'react';
import { Chip, Tooltip, Button } from '@mui/material';
import {
  TableLayout,
  Column,
  FilterConfig,
} from '../../../../components/common/TableLayout';
import { Huerta }         from '../../types/huertaTypes';
import { HuertaRentada }  from '../../types/huertaRentadaTypes';
import ActionsMenu        from '../common/ActionsMenu';

/* ───────── Tipos de fila ───────── */
export type RegistroPropia  = Huerta        & { tipo: 'propia';  monto_renta?: number };
export type RegistroRentada = HuertaRentada & { tipo: 'rentada'; monto_renta: number };
export type Registro = RegistroPropia | RegistroRentada;

/* ───────── Columnas ───────── */
const columns: Column<Registro>[] = [
  { label: 'Nombre',     key: 'nombre' },
  { label: 'Ubicación',  key: 'ubicacion' },
  { label: 'Variedades', key: 'variedades' },
  { label: 'Hectáreas',  key: 'hectareas', align: 'center' },
  {
    label: 'Propietario',
    key:   'propietario',
    render: (h) => {
      const p = (h as any).propietario_detalle;
      if (!p) return '—';
      const isArchivado = p.archivado_en || !p.is_active;
      return (
        <Tooltip title={isArchivado ? 'Propietario archivado' : 'Propietario activo'} arrow>
          <span>
            <Chip
              label={`${p.nombre} ${p.apellidos}`}
              size="small"
              color={isArchivado ? 'warning' : 'success'}
              sx={{ fontWeight: 500, fontSize: 13, height: 24, cursor: 'pointer' }}
            />
          </span>
        </Tooltip>
      );
    },
  },
  {
    label: 'Tipo',
    key:   'tipo',
    render: (h) =>
      h.tipo === 'rentada'
        ? <Chip label="Rentada" size="small" color="info"    />
        : <Chip label="Propia"  size="small" color="success" />,
  },
  {
    label: 'Monto renta',
    key:   'monto_renta',
    align: 'right',
    render: (h) =>
      h.tipo === 'rentada'
        ? `$ ${h.monto_renta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        : '—',
  },
  {
    label: 'Estado',
    key:   'is_active',
    align: 'center',
    render: (h) =>
      h.is_active
        ? <Chip label="Activa"    size="small" color="success" />
        : <Chip label="Archivada" size="small" color="warning" />,
  },
];

/* ───────── Props ───────── */
interface Props {
  data: Registro[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (n: number) => void;

  onEdit:    (h: Registro) => void;
  onArchive: (h: Registro) => void;
  onRestore: (h: Registro) => void;
  onDelete:  (h: Registro) => void;
  onTemporadas?: (h: Registro) => void;

  loading?: boolean;
  emptyMessage: string;

  filterConfig?: FilterConfig[];
  onFilterChange?: (f: Record<string, any>) => void;
  applyFiltersInternally?: boolean;
  /** ← NEW: activar filtrado local (para “tipo”) */
  filterValues?: Record<string, any>;
  limpiarFiltros?: () => void;
}

const HuertaTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  onPageChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onTemporadas,
  loading = false,
  emptyMessage,
  filterConfig = [],
  onFilterChange,
  applyFiltersInternally = true,   // ← por defecto ON
  filterValues,
  limpiarFiltros,
}) => (
  <TableLayout<Registro>
    data={data}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    columns={columns}
    serverSidePagination
    loading={loading}
    emptyMessage={emptyMessage}
    striped
    dense
    filterConfig={filterConfig}
    onFilterChange={onFilterChange}
    applyFiltersInternally={applyFiltersInternally}
    filterValues={filterValues}
    extraFilterElement={
      limpiarFiltros && (
        <Button variant="contained" color="secondary" onClick={limpiarFiltros} sx={{ height: 40 }}>
          Limpiar filtros
        </Button>
      )
    }
    renderActions={(h) => {
      const archivada = !h.is_active;
      return (
        <ActionsMenu
          isArchived={archivada}
          onEdit={!archivada ? () => onEdit(h) : undefined}
          onArchiveOrRestore={() => (archivada ? onRestore(h) : onArchive(h))}
          onDelete={() => onDelete(h)}
          onTemporadas={
            !archivada && onTemporadas ? () => onTemporadas(h) : undefined
          }
        />
      );
    }}
  />
);

export default HuertaTable;
