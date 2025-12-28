// src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx
import React from 'react';
import { Chip, Button } from '@mui/material';
import { TableLayout, Column, FilterConfig } from '../../../../components/common/TableLayout';
import type { Bodega } from '../../types/bodegaTypes';
import ActionsMenu from '../common/ActionsMenu';

interface Props {
  data: Bodega[];
  page: number;
  pageSize: number;
  metaPageSize?: number | null;
  count: number;
  onPageChange: (n: number) => void;

  onEdit:    (b: Bodega) => void;
  onArchive: (b: Bodega) => void;
  onRestore: (b: Bodega) => void;
  onDelete:  (b: Bodega) => void;
  onView?:   (b: Bodega) => void;

  loading?: boolean;
  emptyMessage: string;

  // filtros en TableLayout (server-side)
  filterConfig?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (f: Record<string, any>) => void;
  limpiarFiltros?: () => void;
}

const columns: Column<Bodega>[] = [
  { label: 'Nombre', key: 'nombre' },
  { label: 'Ubicación', key: 'ubicacion' },
  {
    label: 'Estado',
    key: 'archivado_en',
    align: 'center',
    render: (b) =>
      b.archivado_en
        ? <Chip label="Archivada" size="small" color="warning" />
        : <Chip label="Activa"    size="small" color="success" />
  },
];

const BodegaTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  metaPageSize,
  count,
  onPageChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onView,
  loading = false,
  emptyMessage,
  filterConfig = [],
  filterValues,
  onFilterChange,
  limpiarFiltros,
}) => {
  return (
    <TableLayout<Bodega>
      data={data}
      page={page}
      pageSize={metaPageSize ?? pageSize}
      metaPageSize={metaPageSize}
      count={count}
      onPageChange={onPageChange}
      columns={columns}
      serverSidePagination
      loading={loading}
      emptyMessage={emptyMessage}
      striped
      dense
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={onFilterChange}
      applyFiltersInternally={false}
      extraFilterElement={
        limpiarFiltros && (
          <Button variant="contained" color="secondary" onClick={limpiarFiltros} sx={{ height: 40 }}>
            Limpiar filtros
          </Button>
        )
      }
      renderActions={(b) => {
        const isArchived = Boolean(b.archivado_en);

        const permEdit   = 'change_bodega';
        const permDelete = 'delete_bodega';
        const permArch   = 'archive_bodega';
        const permRest   = 'restore_bodega';
        const permArchiveOrRestore = isArchived ? permRest : permArch;

        return (
          <ActionsMenu
            isArchived={isArchived}
            onEdit={isArchived ? undefined : () => onEdit(b)}
            onArchiveOrRestore={() => (isArchived ? onRestore(b) : onArchive(b))}
            onDelete={() => onDelete(b)}
            onView={!isArchived && onView ? () => onView(b) : undefined}
            permEdit={permEdit}
            permArchiveOrRestore={permArchiveOrRestore}
            permDelete={permDelete}
            permView="view_bodega"
          />
        );
      }}
    />
  );
};

export default BodegaTable;
