// src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx
import React from 'react';
import { Chip, Box } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { Cosecha } from '../../types/cosechaTypes';
import ActionsMenu from '../common/ActionsMenu';
 

// Formato de fecha seguro (evita desfases por zona horaria)
const formatPretty = (iso: string | null) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return '—';

  let s = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  return s.replace(/ de (\d{4})$/, ' del $1');
};

interface Props {
  data: Cosecha[];
  page: number;
  pageSize: number;
  metaPageSize?: number | null;
  count: number;
  onPageChange: (p: number) => void;
  onRename: (c: Cosecha) => void;
  onDelete: (c: Cosecha) => void;
  onArchive: (c: Cosecha) => void;
  onRestore: (c: Cosecha) => void;
  onToggleFinalizada: (c: Cosecha) => void;
  onVerFinanzas: (c: Cosecha) => void;
  onReporteCosecha?: (c: Cosecha) => void;
  emptyMessage?: string;
  loading?: boolean;
}

const columns: Column<Cosecha>[] = [
  { label: 'Nombre', key: 'nombre' },
  {
    label: 'Fecha inicio',
    key: 'fecha_inicio',
    render: c => formatPretty(c.fecha_inicio),
  },
  {
    label: 'Fecha fin',
    key: 'fecha_fin',
    render: c => formatPretty(c.fecha_fin),
  },
  {
    label: 'Estado',
    key: 'finalizada',
    align: 'center',
    render: c =>
      c.finalizada
        ? <Chip label="Finalizada" size="small" color="warning" />
        : <Chip label="En curso" size="small" color="primary" />,
  },
  {
    label: 'Archivo',
    key: 'is_active',
    align: 'center',
    render: c =>
      c.is_active
        ? <Chip label="Activa" size="small" color="success" />
        : <Chip label="Archivada" size="small" color="default" />,
  },
];

const CosechaTable: React.FC<Props> = ({
  data, page, pageSize, metaPageSize, count, onPageChange,
  onRename, onDelete, onArchive, onRestore, onToggleFinalizada, onVerFinanzas,
  onReporteCosecha, emptyMessage, loading,
}) => (
  <TableLayout<Cosecha>
    data={data}
    page={page}
    pageSize={metaPageSize ?? pageSize}
    metaPageSize={metaPageSize}
    count={count}
    onPageChange={onPageChange}
    serverSidePagination
    columns={columns}
    rowKey={row => row.id}
    striped
    dense
    loading={loading}
    emptyMessage={emptyMessage}
    renderActions={c => {
      const isArchived = !c.is_active;
      const isFinalized = c.finalizada;
      return (
        <Box display="flex" alignItems="center" gap={1}>
          <ActionsMenu
            isArchived={isArchived}
            isFinalized={isFinalized}
            labelFinalize={isFinalized ? 'Reactivar' : 'Finalizar'}
            onFinalize={() => onToggleFinalizada(c)}
            onEdit={!isArchived ? () => onRename(c) : undefined}
            onArchiveOrRestore={() => (isArchived ? onRestore(c) : onArchive(c))}
            onDelete={isArchived ? () => onDelete(c) : undefined}
            onReporteCosecha={onReporteCosecha ? () => onReporteCosecha(c) : undefined}
            // Integrado: Ver finanzas dentro del menú
            onVerFinanzas={() => onVerFinanzas(c)}
            permVerFinanzas="view_inversioneshuerta"
            /* 👇 permisos necesarios (solo añadidos; nada más cambia) */
            permEdit="change_cosecha"
            permArchiveOrRestore={['archive_cosecha', 'restore_cosecha']}
            permDelete="delete_cosecha"
            permFinalize={['finalize_cosecha', 'change_cosecha']}
            permReporteCosecha="view_cosecha"
          />
          
        </Box>
      );
    }}
  />
);

export default CosechaTable;
