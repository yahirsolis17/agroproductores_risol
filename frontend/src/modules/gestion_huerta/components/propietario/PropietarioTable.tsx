// src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx
import React from 'react';
import { Chip } from '@mui/material';
import PropietarioActionsMenu from '../common/PropietarioActionsMenu';
import { Propietario } from '../../types/propietarioTypes';
import { TableLayout, Column } from '../../../../components/common/TableLayout';

interface Props {
  data: Propietario[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (newPage: number) => void;
  onArchiveOrRestore: (id: number, isArchived: boolean) => void;
  onDelete: (id: number) => void;
  /** Mensaje que aparece cuando no hay filas */
  emptyMessage?: string;
}

const columns: Column<Propietario>[] = [
  { label: 'Nombre', key: 'nombre' },
  { label: 'Apellidos', key: 'apellidos' },
  { label: 'Teléfono', key: 'telefono' },
  { label: 'Dirección', key: 'direccion' },
  {
    label: 'Estado',
    key: 'archivado_en',
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
  onArchiveOrRestore,
  onDelete,
  emptyMessage = 'No hay propietarios registrados.',
}) => {
  return (
    <TableLayout<Propietario>
      data={data}
      page={page}
      pageSize={pageSize}
      count={count}
      columns={columns}
      onPageChange={onPageChange}
      emptyMessage={emptyMessage}
      renderActions={(p) => {
        const isArchived = Boolean(p.archivado_en);
        return (
          <PropietarioActionsMenu
            isArchived={isArchived}
            onArchiveOrRestore={() =>
              onArchiveOrRestore(p.id, isArchived)
            }
            onDelete={() => onDelete(p.id)}
          />
        );
      }}
    />
  );
};

export default PropietarioTable;
