import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { Cosecha } from '../../types/cosechaTypes';
import ActionsMenu from '../common/ActionsMenu';

interface Props {
  data: Cosecha[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (p: number) => void;

  onRename: (c: Cosecha) => void;
  onDelete: (c: Cosecha) => void;
  onArchive: (c: Cosecha) => void;
  onRestore: (c: Cosecha) => void;
  onToggleFinalizada: (c: Cosecha) => void;

  emptyMessage?: string;
  loading?: boolean;
}

const columns: Column<Cosecha>[] = [
  { label: 'Nombre', key: 'nombre' },
  { 
    label: 'Fecha inicio', 
    key: 'fecha_inicio',
    render: (c) => c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleString('es-MX') : '—'
  },
  {
    label: 'Estado',
    key: 'finalizada',
    align: 'center',
    render: (c) =>
      c.finalizada ? (
        <Chip label="Finalizada" size="small" color="warning" />
      ) : (
        <Chip label="En curso" size="small" color="primary" />
      ),
  },
  {
    label: 'Archivo',
    key: 'is_active',
    align: 'center',
    render: (c) =>
      c.is_active ? (
        <Chip label="Activa" size="small" color="success" />
      ) : (
        <Chip label="Archivada" size="small" color="default" />
      ),
  },
];

const CosechaTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  onPageChange,
  onRename,
  onDelete,
  onArchive,
  onRestore,
  onToggleFinalizada,
  emptyMessage,
  loading,
}) => {
  return (
    <TableLayout<Cosecha>
      data={data}
      page={page}
      pageSize={pageSize}
      count={count}
      onPageChange={onPageChange}
      serverSidePagination
      columns={columns}
      rowKey={(row) => row.id}
      striped
      dense
      loading={loading}
      emptyMessage={emptyMessage}
      renderActions={(c) => {
        const isArchived = !c.is_active;
        const isFinalized = c.finalizada;

        return (
          <ActionsMenu
            isArchived={isArchived}
            isFinalized={isFinalized}
            labelFinalize={isFinalized ? 'Reactivar' : 'Finalizar'}
            onFinalize={() => onToggleFinalizada(c)}
            onEdit={!isArchived ? () => onRename(c) : undefined}
            onArchiveOrRestore={() => (isArchived ? onRestore(c) : onArchive(c))}
            onDelete={isArchived ? () => onDelete(c) : undefined}
          />
        );
      }}
    />
  );
};

export default CosechaTable;
