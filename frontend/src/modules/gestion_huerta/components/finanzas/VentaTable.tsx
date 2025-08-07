import React from 'react';
import { Chip, Button } from '@mui/material';
import { TableLayout, Column, FilterConfig } from '../../../../components/common/TableLayout';
import { Venta } from '../../types/ventaTypes';
import ActionsMenu from '../common/ActionsMenu';

const currency = (n: number) =>
  `$ ${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const columns: Column<Venta>[] = [
  {
    label: 'Fecha',
    key: 'fecha_venta',
    render: (row) => new Date(row.fecha_venta).toLocaleDateString('es-MX'),
  },
  { label: 'Cajas', key: 'num_cajas', align: 'right' },
  {
    label: 'Precio/caja',
    key: 'precio_por_caja',
    align: 'right',
    render: (row) => currency(row.precio_por_caja),
  },
  {
    label: 'Gasto',
    key: 'gasto',
    align: 'right',
    render: (row) => currency(row.gasto),
  },
  {
    // Usamos key existente (precio_por_caja) y calculamos total_venta en render
    label: 'Total venta',
    key: 'precio_por_caja',
    align: 'right',
    render: (row) => currency((row.num_cajas || 0) * (row.precio_por_caja || 0)),
  },
  {
    // Usamos key existente (gasto) y calculamos ganancia_neta en render
    label: 'Ganancia neta',
    key: 'gasto',
    align: 'right',
    render: (row) =>
      currency((row.num_cajas || 0) * (row.precio_por_caja || 0) - (row.gasto || 0)),
  },
  {
    label: 'Tipo mango',
    key: 'tipo_mango',
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
  data: Venta[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (n: number) => void;
  onEdit: (row: Venta) => void;
  onArchive: (row: Venta) => void;
  onRestore: (row: Venta) => void;
  onDelete: (row: Venta) => void;
  loading?: boolean;
  emptyMessage: string;
  filterConfig?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (f: Record<string, any>) => void;
  limpiarFiltros?: () => void; // ← ahora sí usado
}

const VentaTable: React.FC<Props> = ({
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
  <TableLayout<Venta>
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
        permEdit="change_venta"
        permArchiveOrRestore="archive_venta"
        permDelete="delete_venta"
      />
    )}
  />
);

export default VentaTable;
