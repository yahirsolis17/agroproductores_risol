import React from 'react';
import { Box, Chip } from '@mui/material';

import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { parseLocalDateStrict, formatDateLongEs } from '../../../../global/utils/date';
import { PreCosecha } from '../../types/precosechaTypes';
import ActionsMenu from '../common/ActionsMenu';

const money = (n: number | string) => {
  const num = typeof n === 'string' ? Number(n.replace(/,/g, '')) : n;
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const MoneyCell: React.FC<{ value: number | string }> = ({ value }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
    <Box component="span">$</Box>
    <Box component="span">{money(value)}</Box>
  </Box>
);

interface Props {
  data: PreCosecha[];
  page: number;
  pageSize: number;
  metaPageSize?: number | null;
  count: number;
  onPageChange: (p: number) => void;
  onEdit: (item: PreCosecha) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
  onConsult: (item: PreCosecha) => void;
  categoriesMap?: Record<number, string>;
  loading?: boolean;
  emptyMessage?: string;
  readOnly?: boolean;
}

const fmtFechaLarga = (iso: string) => {
  const d = parseLocalDateStrict(iso);
  return formatDateLongEs(d);
};

const columns = (map?: Record<number, string>): Column<PreCosecha>[] => [
  { label: 'Fecha', key: 'fecha', render: (i) => fmtFechaLarga(i.fecha) },
  { label: 'Descripción', key: 'descripcion', render: (i) => i.descripcion || '—' },
  { label: 'Insumos', key: 'gastos_insumos', align: 'right', render: (i) => <MoneyCell value={i.gastos_insumos} /> },
  { label: 'Mano de obra', key: 'gastos_mano_obra', align: 'right', render: (i) => <MoneyCell value={i.gastos_mano_obra} /> },
  { label: 'Total', key: 'gastos_totales', align: 'right', render: (i) => <MoneyCell value={i.gastos_totales} /> },
  {
    label: 'Categoría',
    key: 'categoria',
    render: (i) => {
      const name = map?.[i.categoria];
      return name ? name : `#${i.categoria}`;
    },
  },
  {
    label: 'Estado',
    key: 'archivado_en',
    align: 'center',
    render: (i) =>
      i.archivado_en ? <Chip label="Archivada" size="small" color="warning" /> : <Chip label="Activa" size="small" color="success" />,
  },
];

const PreCosechaTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  metaPageSize,
  count,
  onPageChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onConsult,
  categoriesMap,
  loading = false,
  emptyMessage = 'Sin registros de PreCosecha.',
  readOnly = false,
}) => (
  <TableLayout<PreCosecha>
    data={data}
    page={page}
    pageSize={metaPageSize ?? pageSize}
    metaPageSize={metaPageSize}
    count={count}
    onPageChange={onPageChange}
    serverSidePagination
    striped
    dense
    loading={loading}
    emptyMessage={emptyMessage}
    columns={columns(categoriesMap)}
    rowKey={(row) => row.id}
    renderActions={(item) => {
      const isArchived = Boolean(item.archivado_en) || !item.is_active;
      return (
        <ActionsMenu
          isArchived={isArchived}
          hideFinalize
          onTemporadas={() => onConsult(item)}
          labelTemporadas="Consultar"
          permTemporadas="view_precosecha"
          onEdit={!isArchived && !readOnly ? () => onEdit(item) : undefined}
          onArchiveOrRestore={!readOnly ? () => (isArchived ? onRestore(item.id) : onArchive(item.id)) : undefined}
          onDelete={isArchived && !readOnly ? () => onDelete(item.id) : undefined}
          permEdit="change_precosecha"
          permArchiveOrRestore={['archive_precosecha', 'restore_precosecha']}
          permDelete="delete_precosecha"
        />
      );
    }}
  />
);

export default PreCosechaTable;
