// src/modules/gestion_huerta/components/finanzas/InversionTable.tsx
import React from 'react';
import { Box, Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';
import { parseLocalDateStrict, formatDateLongEs } from '../../../../global/utils/date';
import { InversionHuerta } from '../../types/inversionTypes';

const money = (n: number | string) => {
  const num = typeof n === 'string' ? Number(n.replace(/,/g, '')) : n;
  if (!Number.isFinite(num)) return '—';
  // SIN decimales; separador de miles
  return Math.trunc(num).toLocaleString('es-MX', { maximumFractionDigits: 0 });
};

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
  data: InversionHuerta[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (p: number) => void;

  onEdit:    (inv: InversionHuerta) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete:  (id: number) => void;

  loading?: boolean;
  emptyMessage?: string;

  /** mapa id→nombre de categoría */
  categoriesMap?: Record<number, string>;
}

const fmtFechaLarga = (iso: string) => {
  const d = parseLocalDateStrict(iso);
  return formatDateLongEs(d);
};

const columns = (map?: Record<number,string>): Column<InversionHuerta>[] => [
  { label: 'Fecha', key: 'fecha', render: i => fmtFechaLarga(i.fecha) },
  { label: 'Descripción', key: 'descripcion', render: i => i.descripcion || '—' },
  {
    label: 'Insumos',
    key: 'gastos_insumos',
    align: 'right',
    render: i => <MoneyCell value={i.gastos_insumos} />,
  },
  {
    label: 'Mano de obra',
    key: 'gastos_mano_obra',
    align: 'right',
    render: i => <MoneyCell value={i.gastos_mano_obra} />,
  },
  {
    label: 'Total',
    key: 'gastos_totales',
    align: 'right',
    render: i => <MoneyCell value={i.gastos_totales} />,
  },
  {
    label: 'Categoría',
    key: 'categoria',
    render: i => {
      const name = map?.[i.categoria];
      return name ? name : `#${i.categoria}`;
    }
  },
  {
    label: 'Estado', key: 'archivado_en', align: 'center',
    render: i => i.archivado_en
      ? <Chip label="Archivada" size="small" color="warning" />
      : <Chip label="Activa"    size="small" color="success" />
  },
];

const InversionTable: React.FC<Props> = ({
  data, page, pageSize, count, onPageChange,
  onEdit, onArchive, onRestore, onDelete,
  loading = false, emptyMessage = 'Sin inversiones registradas.',
  categoriesMap,
}) => (
  <TableLayout<InversionHuerta>
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
    columns={columns(categoriesMap)}
    rowKey={i => i.id}
    renderActions={inv => {
      const isArchived = Boolean(inv.archivado_en) || !inv.is_active;
      return (
        <ActionsMenu
          isArchived={isArchived}
          onEdit={!isArchived ? () => onEdit(inv) : undefined}
          onArchiveOrRestore={() => isArchived ? onRestore(inv.id) : onArchive(inv.id)}
          onDelete={isArchived ? () => onDelete(inv.id) : undefined}
          permEdit="change_inversioneshuerta"
          permArchiveOrRestore={['archive_inversioneshuerta', 'restore_inversioneshuerta']}
          permDelete="delete_inversioneshuerta"
        />
      );
    }}
  />
);

export default InversionTable;
