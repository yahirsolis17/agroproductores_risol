// src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';
import { Temporada } from '../../types/temporadaTypes';
import { parseLocalDateStrict } from '../../../../global/utils/date';


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

const getActivateOperationalState = (temporada: Temporada): { disabled: boolean; tooltip?: string } => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (temporada.año > todayStart.getFullYear()) {
    return {
      disabled: true,
      tooltip: 'No puedes activar operación en una temporada futura. Debe seguir como planificada.',
    };
  }

  const startDate = parseLocalDateStrict(temporada.fecha_inicio);
  if (!Number.isNaN(startDate.getTime()) && startDate > todayStart) {
    return {
      disabled: true,
      tooltip: 'Podrás activar la operación cuando llegue la fecha de inicio de la temporada.',
    };
  }

  return { disabled: false };
};

interface Props {
  data: Temporada[];
  page: number;
  pageSize: number;
  metaPageSize?: number | null;
  count: number;
  onPageChange: (p: number) => void;
  onArchive: (t: Temporada) => void;
  onRestore: (t: Temporada) => void;
  onDelete: (t: Temporada) => void;
  onConsult: (t: Temporada) => void;
  onFinalize: (t: Temporada) => void;
  onActivateOperational: (t: Temporada) => void;
  onPreCosecha: (t: Temporada) => void;
  emptyMessage?: string;
  loading?: boolean;

  // 👇 NUEVO: callback para "Ver cosechas"
  onCosechas: (t: Temporada) => void;
  onReporteTemporada?: (t: Temporada) => void;
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
    label: 'Lifecycle',
    key: 'estado_operativo',
    align: 'center',
    render: (t) =>
      t.estado_operativo === 'planificada' ? (
        <Chip label="Planificada" size="small" color="secondary" />
      ) : (
        <Chip label="Operativa" size="small" color="success" />
      ),
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
  metaPageSize,
  count,
  onPageChange,
  onArchive,
  onRestore,
  onDelete,
  onConsult,
  onFinalize,
  onActivateOperational,
  onPreCosecha,
  emptyMessage,
  loading,

  // 👇 NUEVO
  onCosechas,
  onReporteTemporada,
}) => (
  <TableLayout<Temporada>
    data={data}
    page={page}
    striped
    dense
    loading={loading}
    pageSize={metaPageSize ?? pageSize}
    metaPageSize={metaPageSize}
    count={count}
    onPageChange={onPageChange}
    columns={columns}
    emptyMessage={emptyMessage}
    serverSidePagination={true}
    rowKey={(row) => row.id}
    renderActions={(t) => {
      const isArchived = !t.is_active;
      const isFinalized = t.finalizada;
      const isPlanned = t.estado_operativo === 'planificada';
      const activationState = getActivateOperationalState(t);

      return (
        <ActionsMenu
          isArchived={isArchived}
          isFinalized={isFinalized}
          hideEdit
          hideFinalize={isArchived || isPlanned}
          onFinalize={() => onFinalize(t)}
          onTemporadas={() => onConsult(t)}
          labelTemporadas="Consultar"
          labelFinalize={isFinalized ? 'Reactivar' : 'Finalizar'}
          onArchiveOrRestore={() =>
            isArchived ? onRestore(t) : onArchive(t)
          }
          onDelete={isArchived ? () => onDelete(t) : undefined}
          permFinalize={['finalize_temporada', 'reactivate_temporada']}
          permTemporadas="view_temporada"
          permArchiveOrRestore={['archive_temporada', 'restore_temporada']}
          permDelete="delete_temporada"
          onActivateOperational={!isArchived && !isFinalized && isPlanned ? () => onActivateOperational(t) : undefined}
          permActivateOperational="activate_operational_temporada"
          activateOperationalDisabled={activationState.disabled}
          activateOperationalTooltip={activationState.tooltip}
          onPreCosecha={() => onPreCosecha(t)}
          permPreCosecha="view_precosecha"
          preCosechaLabel={isPlanned ? 'PreCosecha' : 'Consultar PreCosecha'}

          // 👇 NUEVOS props para "Ver cosechas"
          onCosechas={!isPlanned ? () => onCosechas(t) : undefined}
          permCosechas="view_cosecha"
          
          // 👇 NUEVO: Reporte de temporada
          onReporteTemporada={onReporteTemporada ? () => onReporteTemporada(t) : undefined}
          permReporteTemporada="view_temporada"
        />
      );
    }}
  />
);

export default TemporadaTable;
