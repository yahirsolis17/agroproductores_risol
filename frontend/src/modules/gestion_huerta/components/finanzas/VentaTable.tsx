// src/modules/gestion_huerta/components/finanzas/VentaTable.tsx
import React from 'react';
import { Box, Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';
import { VentaHuerta } from '../../types/ventaTypes';

const intFmt = (n: number | string) => {
  const num = typeof n === 'string' ? Number(n.replace(/,/g, '')) : n;
  if (!Number.isFinite(num)) return '—';
  return Math.trunc(num).toLocaleString('es-MX', { maximumFractionDigits: 0 });
};

const money = (n: number | string) => {
  const num = typeof n === 'string' ? Number(n.replace(/,/g, '')) : n;
  if (!Number.isFinite(num)) return '—';
  return Math.trunc(num).toLocaleString('es-MX', { maximumFractionDigits: 0 });
};

const NumberCell: React.FC<{ value: number | string }> = ({ value }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum"',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {intFmt(value)}
  </Box>
);

const MoneyCell: React.FC<{ value: number | string }> = ({ value }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum"',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    <Box component="span" sx={{ lineHeight: 1 }}>$</Box>
    <Box component="span">{money(value)}</Box>
  </Box>
);

interface Props {
  data: VentaHuerta[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (p: number) => void;

  onEdit:    (venta: VentaHuerta) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete:  (id: number) => void;

  loading?: boolean;
  emptyMessage?: string;
}

const fmtFechaLarga = (iso: string) => {
  const d = new Date(iso + 'T00:00:00'); // evita desfase
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
};

const columns: Column<VentaHuerta>[] = [
  { label: 'Fecha', key: 'fecha_venta', render: v => fmtFechaLarga(v.fecha_venta) },
  { label: 'Tipo de mango', key: 'tipo_mango', render: v => v.tipo_mango || '—' },
  { label: 'Descripción', key: 'descripcion', render: v => v.descripcion || '—' },
  {
    label: 'Cajas', key: 'num_cajas', align: 'right',
    render: v => <NumberCell value={v.num_cajas} />,
  },
  {
    label: 'Precio por caja', key: 'precio_por_caja', align: 'right',
    render: v => <MoneyCell value={v.precio_por_caja} />,
  },
  {
    label: 'Total', key: 'total_venta', align: 'right',
    render: v => <MoneyCell value={v.total_venta} />,
  },
  {
    label: 'Gasto', key: 'gasto', align: 'right',
    render: v => <MoneyCell value={v.gasto} />,
  },
  {
    label: 'Ganancia neta', key: 'ganancia_neta', align: 'right',
    render: v => <MoneyCell value={v.ganancia_neta} />,
  },
  {
    label: 'Estado', key: 'archivado_en', align: 'center',
    render: v => v.archivado_en
      ? <Chip label="Archivada" size="small" color="warning" />
      : <Chip label="Activa"    size="small" color="success" />
  },
];

const VentaTable: React.FC<Props> = ({
  data, page, pageSize, count, onPageChange,
  onEdit, onArchive, onRestore, onDelete,
  loading = false, emptyMessage = 'Sin ventas registradas.',
}) => (
  <TableLayout<VentaHuerta>
    data={data}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    serverSidePagination
    striped
    dense
    loading={loading}
    emptyMessage={emptyMessage}
    columns={columns}
    rowKey={v => v.id}
    renderActions={venta => {
      const isArchived = Boolean(venta.archivado_en) || !venta.is_active;
      return (
        <ActionsMenu
          isArchived={isArchived}
          onEdit={!isArchived ? () => onEdit(venta) : undefined}
          onArchiveOrRestore={() => isArchived ? onRestore(venta.id) : onArchive(venta.id)}
          onDelete={isArchived ? () => onDelete(venta.id) : undefined}
          permEdit="change_venta"
          permArchiveOrRestore="archive_venta"
          permDelete="delete_venta"
        />
      );
    }}
  />
);

export default VentaTable;
