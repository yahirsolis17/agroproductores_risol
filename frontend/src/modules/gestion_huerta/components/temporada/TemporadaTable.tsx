// Reportes de Producción - generado por asistente IA (enero 2025)
// src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';
import { Temporada } from '../../types/temporadaTypes';


const formatFechaLarga = (iso?: string | null) => {
  if (!iso) return '—';
  // Parse seguro para "YYYY-MM-DD" evitando desfases de zona horaria
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return '—';

  let s = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  // Último toque: "de 2025" → "del 2025"
  s = s.replace(/ de (\d{4})$/, ' del $1');
  return s;
};

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

  // 👇 NUEVO: callback para “Ver cosechas”
  onCosechas: (t: Temporada) => void;
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
    render: (t) => formatFechaLarga(t.fecha_inicio)
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
    render: (t) => formatFechaLarga(t.fecha_fin)
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

  // 👇 NUEVO
  onCosechas,
}) => {
  const navigate = useNavigate();
  return (
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

          // 👇 NUEVOS props para “Ver cosechas”
          onCosechas={() => onCosechas(t)}
          permCosechas="view_cosecha"
          onReporte={() => navigate('/reportes', { state: { tipo: 'temporada', id: t.id } })}
          permReporte="view_reportes"
        />
      );
    }}
  />
  );
};

export default TemporadaTable;
