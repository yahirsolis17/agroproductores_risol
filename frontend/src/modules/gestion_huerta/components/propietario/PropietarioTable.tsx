// src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column, FilterConfig } from '../../../../components/common/TableLayout';
import { Propietario } from '../../types/propietarioTypes';
import ActionsMenu from '../common/ActionsMenu';

interface Props {
  data: Propietario[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (newPage: number) => void;
  serverSidePagination?: boolean;
  filterValues?: Record<string, any>;
  onEdit:   (p: Propietario) => void;
  onArchiveOrRestore: (id: number, isArchived: boolean) => void;
  onDelete:           (id: number) => void;

  /** ↓↓↓ Nuevas props para filtros dinámicos ↓↓↓ */
  filterConfig?: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  applyFiltersInternally?: boolean;

  emptyMessage?: string;
  loading?: boolean;
}

const columns: Column<Propietario>[] = [
  { label:'Nombre',    key:'nombre' },
  { label:'Apellidos', key:'apellidos' },
  { label:'Teléfono',  key:'telefono' },
  { label:'Dirección', key:'direccion' },
  {
    label:'Estado', key:'archivado_en', align:'center',
    render:(p)=>
      p.archivado_en
        ? <Chip label="Archivado" size="small" color="warning"/>
        : <Chip label="Activo"    size="small" color="success"/>
  },
];

const PropietarioTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  onPageChange,
  serverSidePagination = true,
  onEdit,
  onArchiveOrRestore,
  onDelete,
  filterConfig = [],
  filterValues,
  onFilterChange,
  applyFiltersInternally = false,
  emptyMessage = 'No hay propietarios registrados.',
  loading,
}) => {
  // Log de renderizado de tabla y props (solo en desarrollo)
  if (import.meta.env.DEV) {
    console.log('[Table] Renderizando PropietarioTable', {
      data,
      page,
      pageSize,
      count,
      filterConfig,
      applyFiltersInternally,
    });
  }
  return (
    <TableLayout<Propietario>
      data={data}
      columns={columns}
      page={page}
      pageSize={pageSize}
      count={count}
      onPageChange={onPageChange}
      serverSidePagination={serverSidePagination}
      filterValues={filterValues}
      /** configuramos el filtro como en Huertas */
      filterConfig={filterConfig}
      onFilterChange={(filters) => {
        if (import.meta.env.DEV) {
          console.log('[Table] onFilterChange:', filters);
        }
        if (onFilterChange) onFilterChange(filters);
      }}
      applyFiltersInternally={applyFiltersInternally}

      rowKey={(p) => p.id}
      emptyMessage={emptyMessage}
      striped
      dense
      loading={loading}
      renderActions={(p) => {
        const isArch = Boolean(p.archivado_en);
        return (
          <ActionsMenu
            isArchived={isArch}
            onEdit={!isArch ? () => onEdit(p) : undefined}
            onArchiveOrRestore={() => onArchiveOrRestore(p.id, isArch)}
            onDelete={() => onDelete(p.id)}
            permEdit="change_propietario"
            permArchiveOrRestore="archive_propietario"
            permDelete="delete_propietario"
          />
        );
      }}
    />
  );
};

export default PropietarioTable;
