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
  onPageChange: (p: number) => void;
  onArchive: (t: Temporada) => void;
  onRestore: (t: Temporada) => void;
  onDelete: (t: Temporada) => void;
  onConsult: (t: Temporada) => void;
  onFinalize: (t: Temporada) => void;          // ← NUEVA
  emptyMessage?: string;
}

const columns: Column<Temporada>[] = [
  { label: 'Año', key: 'año' },
  { label: 'Huerta', key: 'huerta_nombre' },
  { label: 'Inicio', key: 'fecha_inicio' },
  {
    label: 'Finalizada',
    key: 'finalizada',
    align: 'center',
    render: (t) =>
      t.finalizada ? <Chip label="Sí" size="small" /> : <Chip label="No" size="small" />,
  },
  { label: 'Fin', key: 'fecha_fin' },
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
  onArchive,
  onRestore,
  onDelete,
  onConsult,
  onFinalize,
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
      const isArchived  = !t.is_active;
      const isFinalized = t.finalizada;

      return (
        <ActionsMenu
          isArchived={isArchived}
          isFinalized={isFinalized}
          hideEdit                              // no hay “Editar”
          hideFinalize={isArchived}             // no se muestra finalizar si está archivada
          onFinalize={() => onFinalize(t)}      // Finalizar / Reactivar
          onTemporadas={() => onConsult(t)}     // Consultar
          labelTemporadas="Consultar"
          labelFinalize={isFinalized ? 'Reactivar' : 'Finalizar'}
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
