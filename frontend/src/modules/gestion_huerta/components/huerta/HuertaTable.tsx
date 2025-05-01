// src/modules/gestion_huerta/components/huerta/HuertaTable.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { Huerta } from '../../types/huertaTypes';
import ActionsMenu from '../common/ActionsMenu';

/* ─────────────────── Columnas base ─────────────────── */
const columns: Column<Huerta>[] = [
  { label: 'Nombre',     key: 'nombre' },
  { label: 'Ubicación',  key: 'ubicacion' },
  { label: 'Variedades', key: 'variedades' },
  { label: 'Hectáreas',  key: 'hectareas', align: 'center' },
  {
    label: 'Propietario',
    key:   'propietario',
    render: (h) => {
      const ownerName = h.propietario_detalle
        ? `${h.propietario_detalle.nombre} ${h.propietario_detalle.apellidos}`
        : `ID: ${h.propietario}`;

      const ownerArchived =
        h.propietario_detalle &&
        (h.propietario_detalle as unknown as { is_active?: boolean }).is_active === false;

      return (
        <>
          {ownerName}{' '}
          {ownerArchived && (
            <Chip
              label="Propietario archivado"
              size="small"
              color="warning"
              sx={{ ml: .5 }}
            />
          )}
        </>
      );
    },
  },
  {
    label: 'Estado',
    key:   'is_active',
    align: 'center',
    render: (h) =>
      h.is_active
        ? <Chip label="Activa"    size="small" color="success" />
        : <Chip label="Archivada" size="small" color="warning" />,
  },
];

/* ─────────────────── Componente ─────────────────── */
interface Props {
  data: Huerta[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (n: number) => void;

  /* CRUD */
  onEdit?:    (h: Huerta) => void;
  onArchive?: (id: number) => void;
  onRestore?: (id: number) => void;
  onDelete?:  (id: number) => void;

  emptyMessage?: string;
}

const HuertaTable: React.FC<Props> = ({
  data, page, pageSize, count, onPageChange,
  onEdit, onArchive, onRestore, onDelete,
  emptyMessage = 'No hay huertas registradas.',
}) => (
  <TableLayout<Huerta>
    data={data}
    columns={columns}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    emptyMessage={emptyMessage}
    renderActions={(h) => {
      const isArchived = !h.is_active;
      return (
        <ActionsMenu
          isArchived={isArchived}
          onEdit={!isArchived && onEdit ? () => onEdit(h) : undefined}
          onArchiveOrRestore={() =>
            isArchived ? onRestore?.(h.id) : onArchive?.(h.id)
          }
          onDelete={onDelete ? () => onDelete(h.id) : undefined}
        />
      );
    }}
  />
);

export default HuertaTable;
