// ============================================================================
// src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx
// ============================================================================
import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import ActionsMenu from '../common/ActionsMenu';

interface Props {
  data: CategoriaInversion[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (p: number) => void;
  onEdit:    (c: CategoriaInversion) => void;
  onArchive: (c: CategoriaInversion) => void;
  onRestore: (c: CategoriaInversion) => void;
  onDelete:  (c: CategoriaInversion) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const columns: Column<CategoriaInversion>[] = [
  { label: 'Nombre', key: 'nombre' },
  {
    label: 'Estado', key: 'archivado_en', align: 'center',
    render: c => c.archivado_en ? <Chip label="Archivada" size="small" color="warning" /> : <Chip label="Activa" size="small" color="success" />
  },
];

const CategoriaTable: React.FC<Props> = ({ data, page, pageSize, count, onPageChange, onEdit, onArchive, onRestore, onDelete, loading = false, emptyMessage = 'No hay categorías registradas.' }) => (
  <TableLayout<CategoriaInversion>
    data={data}
    columns={columns}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    serverSidePagination
    rowKey={c => c.id}
    dense
    striped
    loading={loading}
    emptyMessage={emptyMessage}
    renderActions={c => {
      const isArchived = Boolean(c.archivado_en);
      return (
        <ActionsMenu
          isArchived={isArchived}
          onEdit={!isArchived ? () => onEdit(c) : undefined}
          onArchiveOrRestore={() => (isArchived ? onRestore(c) : onArchive(c))}
          onDelete={isArchived ? () => onDelete(c) : undefined}
          permEdit="change_categoriainversion"
          permArchiveOrRestore="archive_categoriainversion"
          permDelete="delete_categoriainversion"
        />
      );
    }}
  />
);

export default CategoriaTable;