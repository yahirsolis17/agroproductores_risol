import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { Propietario } from '../../types/propietarioTypes';
import ActionsMenu from '../common/ActionsMenu';

interface Props {
  data: Propietario[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (newPage: number) => void;

  /* CRUD */
  onEdit:   (p: Propietario) => void;
  onArchiveOrRestore: (id: number, isArchived: boolean) => void;
  onDelete:           (id: number) => void;

  emptyMessage?: string;
  loading?: boolean;
}

const columns: Column<Propietario>[] = [
  { label: 'Nombre',     key: 'nombre' },
  { label: 'Apellidos',  key: 'apellidos' },
  { label: 'Teléfono',   key: 'telefono' },
  { label: 'Dirección',  key: 'direccion' },
  {
    label: 'Estado',
    key:   'archivado_en',
    align: 'center',
    render: (p) =>
      p.archivado_en ? (
        <Chip label="Archivado" size="small" color="warning" />
      ) : (
        <Chip label="Activo" size="small" color="success" />
      ),
  },
];

const PropietarioTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  onPageChange,
  onEdit,
  onArchiveOrRestore,
  onDelete,
  emptyMessage = 'No hay propietarios registrados.',
  loading,
}) => (
  <TableLayout<Propietario>
    data={data}
    columns={columns}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    emptyMessage={emptyMessage}
    striped
    dense
    loading={loading}
    renderActions={(p) => {
      const isArchived = Boolean(p.archivado_en);
      return (
        <ActionsMenu
          isArchived={isArchived}
          /* Editar solo si está activo */
          onEdit={!isArchived ? () => onEdit(p) : undefined}
          onArchiveOrRestore={() => onArchiveOrRestore(p.id, isArchived)}
          onDelete={() => onDelete(p.id)}
        />
      );
    }}
  />
);

export default PropietarioTable;
