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
  onFinalize: (t: Temporada) => void;
  emptyMessage?: string;
  loading?: boolean;
}

const columns: Column<Temporada>[] = [
  { 
    label: 'Año', 
    key: 'año',
    render: (t) => <span className="font-medium">{t.año}</span>
  },
  { 
    label: 'Huerta', 
    key: 'huerta_nombre',
    render: (t) => (
      <div>
        <div className="font-medium">{t.huerta_nombre}</div>
        {t.is_rentada && (
          <div className="text-xs text-orange-600 font-medium">Rentada</div>
        )}
      </div>
    )
  },
  { 
    label: 'Fecha Inicio', 
    key: 'fecha_inicio',
    render: (t) => new Date(t.fecha_inicio).toLocaleDateString('es-ES')
  },
  {
    label: 'Estado',
    key: 'finalizada',
    align: 'center',
    render: (t) =>
      t.finalizada ? (
        <Chip label="Finalizada" size="small" color="warning" />
      ) : (
        <Chip label="En curso" size="small" color="primary" />
      ),
  },
  { 
    label: 'Fecha Fin', 
    key: 'fecha_fin',
    render: (t) => t.fecha_fin ? new Date(t.fecha_fin).toLocaleDateString('es-ES') : '—'
  },
  {
    label: 'Archivo',
    key: 'is_active',
    align: 'center',
    render: (t) =>
      t.is_active ? (
        <Chip label="Activa" size="small" color="success" />
      ) : (
        <Chip label="Archivada" size="small" color="default" />
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
  loading,
}) => (
  <TableLayout<Temporada>
    data={data}
    page={page}
    striped
    dense
    loading={loading}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    columns={columns}
    emptyMessage={emptyMessage}
    serverSidePagination={true}
    rowKey={(row) => row.id}
    renderActions={(t) => {
      const isArchived = !t.is_active;
      const isFinalized = t.finalizada;

      return (
        <ActionsMenu
          isArchived={isArchived}
          isFinalized={isFinalized}
          hideEdit
          hideFinalize={isArchived}
          onFinalize={() => onFinalize(t)}
          onTemporadas={() => onConsult(t)}
          labelTemporadas="Consultar"
          labelFinalize={isFinalized ? 'Reactivar' : 'Finalizar'}
          onArchiveOrRestore={() =>
            isArchived ? onRestore(t) : onArchive(t)
          }
          onDelete={isArchived ? () => onDelete(t) : undefined}
          permFinalize="change_temporada"
          permTemporadas="view_temporada"
          permArchiveOrRestore="archive_temporada"
          permDelete="delete_temporada"
        />
      );
    }}
  />
);

export default TemporadaTable;
