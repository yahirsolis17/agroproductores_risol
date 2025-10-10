import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';
import type { TemporadaBodega } from '../../types/temporadaBodegaTypes';

// === Formateo robusto para YYYY-MM-DD evitando desfases de zona ===
const formatFechaLarga = (iso?: string | null) => {
  if (!iso) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  let formatted = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.replace(/ de (\d{4})$/, ' del $1');
};

interface Props {
  data: TemporadaBodega[];
  page: number;
  pageSize: number;
  count: number;
  loading?: boolean;
  emptyMessage?: string;
  onPageChange: (page: number) => void;

  onArchive: (temporada: TemporadaBodega) => void;
  onRestore: (temporada: TemporadaBodega) => void;
  onDelete: (temporada: TemporadaBodega) => void;
  onFinalize: (temporada: TemporadaBodega) => void;

  /** Permite entrar a la administración (capturas, inventarios, etc.) de la temporada. */
  onAdministrar: (temporada: TemporadaBodega) => void;
}

const columns: Column<TemporadaBodega>[] = [
  {
    label: 'Año',
    key: 'año' as keyof TemporadaBodega,
    render: (temporada) => <span className="font-medium">{temporada.año}</span>,
  },
  {
    label: 'Bodega',
    key: 'bodega_nombre' as keyof TemporadaBodega,
    render: (temporada) => {
      const ubicacion = typeof temporada.bodega_ubicacion === 'string' ? temporada.bodega_ubicacion.trim() : '';
      return (
        <div>
          <div className="font-medium">{temporada.bodega_nombre ?? 'Sin nombre'}</div>
          {ubicacion ? <div className="text-sm text-gray-500">{ubicacion}</div> : null}
        </div>
      );
    },
  },
  {
    label: 'Fecha Inicio',
    key: 'fecha_inicio',
    render: (temporada) => formatFechaLarga(temporada.fecha_inicio),
  },
  {
    label: 'Estado',
    key: 'finalizada',
    align: 'center',
    render: (temporada) =>
      temporada.finalizada ? (
        <Chip label="Finalizada" size="small" color="warning" />
      ) : (
        <Chip label="En curso" size="small" color="primary" />
      ),
  },
  {
    label: 'Fecha Fin',
    key: 'fecha_fin',
    render: (temporada) => formatFechaLarga(temporada.fecha_fin),
  },
  {
    label: 'Archivo',
    key: 'is_active',
    align: 'center',
    render: (temporada) =>
      temporada.is_active ? (
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
    renderActions={(temporada) => {
      const isArchived = !temporada.is_active;
      const isFinalized = temporada.finalizada;

      return (
        <ActionsMenu
          isArchived={isArchived}
          isFinalized={isFinalized}
          hideEdit
          hideFinalize={isArchived}
          labelTemporadas="Entrar"
          labelFinalize={isFinalized ? 'Reactivar' : 'Finalizar'}
          onTemporadas={!isArchived ? () => onAdministrar(temporada) : undefined}
          onFinalize={() => onFinalize(temporada)}
          onArchiveOrRestore={() => (isArchived ? onRestore(temporada) : onArchive(temporada))}
          onDelete={isArchived ? () => onDelete(temporada) : undefined}
          // Permisos (coinciden con los codenames del ViewSet)
          permTemporadas="view_temporadabodega"
          permFinalize="change_temporadabodega"
          // Permiso dinámico según estado (evita bloquear Restaurar)
          permArchiveOrRestore={isArchived ? 'restore_temporadabodega' : 'archive_temporadabodega'}
          permDelete="delete_temporadabodega"
        />
      );
    }}
  />
);

export default TemporadaBodegaTable;
