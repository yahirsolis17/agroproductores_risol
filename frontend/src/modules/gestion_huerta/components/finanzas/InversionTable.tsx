import React from 'react';
import { Chip, Button } from '@mui/material';
import { TableLayout, Column, FilterConfig } from '../../../../components/common/TableLayout';
import { Inversion } from '../../types/inversionTypes';
import ActionsMenu from '../common/ActionsMenu';

const currency = (n: number) =>
  `$ ${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const columns: Column<Inversion>[] = [
  { label: 'Nombre', key: 'nombre' },
  {
    label: 'Fecha',
    key: 'fecha',
    render: (row) => new Date(row.fecha).toLocaleDateString('es-MX'),
  },
  {
    label: 'Categoría',
    key: 'categoria_id',
    render: (row) => row.categoria?.nombre || '—',
  },
  {
    label: 'Insumos',
    key: 'gastos_insumos',
    align: 'right',
    render: (row) => currency(row.gastos_insumos),
  },
  {
    label: 'Mano de obra',
    key: 'gastos_mano_obra',
    align: 'right',
    render: (row) => currency(row.gastos_mano_obra),
  },
  {
    // ⟵ Usamos un key existente (gastos_insumos) para satisfacer Column<Inversion>,
    // y calculamos el total en render (antes tenías "monto_total" que no existe en el tipo).
    label: 'Total',
    key: 'gastos_insumos',
    align: 'right',
    render: (row) => currency((row.gastos_insumos || 0) + (row.gastos_mano_obra || 0)),
  },
  {
    label: 'Estado',
    key: 'archivado_en',
    align: 'center',
    render: (row) =>
      row.archivado_en ? (
        <Chip label="Archivada" size="small" color="warning" />
      ) : (
        <Chip label="Activa" size="small" color="success" />
      ),
  },
];

interface Props {
  data: Inversion[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (n: number) => void;
  onEdit: (row: Inversion) => void;
  onArchive: (row: Inversion) => void;
  onRestore: (row: Inversion) => void;
  onDelete: (row: Inversion) => void;
  loading?: boolean;
  emptyMessage: string;
  filterConfig?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (f: Record<string, any>) => void;
  limpiarFiltros?: () => void; // ← ahora sí lo usamos
}

const InversionTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  onPageChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  loading = false,
  emptyMessage,
  filterConfig = [],
  filterValues,
  onFilterChange,
  limpiarFiltros,
}) => (
  <TableLayout<Inversion>
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
    filterValues={filterValues}
    onFilterChange={onFilterChange}
    applyFiltersInternally={false}
    extraFilterElement={
      limpiarFiltros && (
        <Button variant="contained" color="secondary" onClick={limpiarFiltros} sx={{ height: 40 }}>
          Limpiar filtros
        </Button>
      )
    }
    renderActions={(row) => (
      <ActionsMenu
        isArchived={!!row.archivado_en || !row.is_active}
        onEdit={!row.archivado_en && row.is_active ? () => onEdit(row) : undefined}
        onArchiveOrRestore={() => (!row.archivado_en && row.is_active ? onArchive(row) : onRestore(row))}
        onDelete={() => onDelete(row)}
        permEdit="change_inversioneshuerta"
        permArchiveOrRestore="archive_inversioneshuerta"
        permDelete="delete_inversioneshuerta"
      />
    )}
  />
);

export default InversionTable;
