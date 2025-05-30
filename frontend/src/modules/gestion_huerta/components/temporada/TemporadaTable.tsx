// src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx

import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';
import { Temporada } from '../../types/temporadaTypes';

interface Props {
  data: Temporada[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (page: number) => void;
  onEdit: (t: Temporada) => void;
  onArchive: (t: Temporada) => void;
  onRestore: (t: Temporada) => void;
  onDelete: (t: Temporada) => void;
  emptyMessage?: string;
}

const columns: Column<Temporada>[] = [
  { label: 'Año', key: 'año' },
  { label: 'Huerta', key: 'huerta_nombre' },
  { label: 'Inicio', key: 'fecha_inicio' },
  { label: 'Fin', key: 'fecha_fin' },
  {
    label: 'Finalizada',
    key: 'finalizada',
    align: 'center',
    render: (t) =>
      t.finalizada ? (
        <Chip label="Sí" size="small" />
      ) : (
        <Chip label="No" size="small" />
      ),
  },
  {
    label: 'Estado',
    key: 'is_active',
    align: 'center',
    render: (t) =>
      t.is_active ? (
        <Chip label="Activa" size="small" color="success" />
      ) : (
        <Chip label="Archivada" size="small" color="warning" />
      ),
  },
];

const TemporadaTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  onPageChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  emptyMessage,
}) => (
  <TableLayout<Temporada>
    data={data}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    columns={columns}
    emptyMessage={emptyMessage}
    renderActions={(t) => {
      const isArchived = !t.is_active;
      return (
        <ActionsMenu
          isArchived={isArchived}
          onEdit={!isArchived ? () => onEdit(t) : undefined}
          onArchiveOrRestore={() =>
            isArchived ? onRestore(t) : onArchive(t)
          }
          onDelete={isArchived ? () => onDelete(t) : undefined}
        />
      );
    }}
  />
);

export default TemporadaTable;
