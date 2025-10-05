// src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';
import type { TemporadaBodega } from '../../types/temporadaBodegaTypes';

// === igual que en huerta: formateo robusto para YYYY-MM-DD ===
const formatFechaLarga = (iso?: string | null) => {
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
  data: TemporadaBodega[];
  page: number;
  pageSize: number;
  count: number;
  loading?: boolean;
  emptyMessage?: string;
  onPageChange: (p: number) => void;

  onArchive: (t: TemporadaBodega) => void;
  onRestore: (t: TemporadaBodega) => void;
  onDelete: (t: TemporadaBodega) => void;
  onFinalize: (t: TemporadaBodega) => void;

  // “Entrar” a la administración (capturas/inventarios/etc.) con esa temporada
  onAdministrar: (t: TemporadaBodega) => void;
}

const columns: Column<TemporadaBodega>[] = [
  {
    label: 'Año',
    key: 'año' as any,
    render: (t) => <span className="font-medium">{t.año}</span>,
  },
  {
    label: 'Bodega',
    key: 'bodega_nombre' as any,
    render: (t) => (
      <div>
        <div className="font-medium">{t.bodega_nombre ?? '—'}</div>
      </div>
    ),
  },
  {
    label: 'Fecha Inicio',
    key: 'fecha_inicio',
    render: (t) => formatFechaLarga(t.fecha_inicio),
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
    render: (t) => formatFechaLarga(t.fecha_fin),
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

const TemporadaBodegaTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  loading,
  emptyMessage,
  onPageChange,
  onArchive,
  onRestore,
  onDelete,
  onFinalize,
  onAdministrar,
}) => (
  <TableLayout<TemporadaBodega>
    data={data}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    columns={columns}
    loading={loading}
    striped
    dense
    serverSidePagination
    emptyMessage={emptyMessage}
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
          labelTemporadas="Entrar"
          labelFinalize={isFinalized ? 'Reactivar' : 'Finalizar'}
          onTemporadas={() => onAdministrar(t)}
          onFinalize={() => onFinalize(t)}
          onArchiveOrRestore={() => (isArchived ? onRestore(t) : onArchive(t))}
          onDelete={isArchived ? () => onDelete(t) : undefined}

          // Permisos (coinciden con los codenames del ViewSet)
          permTemporadas="view_temporadabodega"
          permFinalize="change_temporadabodega"
          permArchiveOrRestore="archive_temporadabodega"
          permDelete="delete_temporadabodega"
        />
      );
    }}
  />
);

export default TemporadaBodegaTable;
