import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { Huerta } from '../../types/huertaTypes';
import { HuertaRentada } from '../../types/huertaRentadaTypes';
import ActionsMenu from '../common/ActionsMenu';

type Registro = Huerta | HuertaRentada;
const columns: Column<any>[] = [
  { label: 'Nombre',     key: 'nombre' },
  { label: 'Ubicación',  key: 'ubicacion' },
  { label: 'Variedades', key: 'variedades' },
  { label: 'Hectáreas',  key: 'hectareas', align: 'center' },
  {
    label: 'Tipo',
    key: 'tipo',
    render: (h: Registro) =>
      'monto_renta' in h
        ? <Chip label="Rentada" size="small" color="info" />
        : <Chip label="Propia"  size="small" color="success" />,
  },
  {
    label: 'Monto renta',
    key: 'monto_renta',
    align: 'right',
    render: (h: Registro) =>
      'monto_renta' in h
        ? `$ ${h.monto_renta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        : '—',
  },
  {
    label: 'Estado',
    key: 'is_active',
    align: 'center',
    render: (h: Registro) =>
      h.is_active
        ? <Chip label="Activa"    size="small" color="success" />
        : <Chip label="Archivada" size="small" color="warning" />,
  },
];

interface Props {
  data: Registro[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (n: number) => void;
  onEdit:    (h: Registro) => void;
  onArchive: (h: Registro) => void;
  onRestore: (h: Registro) => void;
  onDelete:  (h: Registro) => void;
  emptyMessage: string;
  loading?: boolean;
}

const HuertaTable: React.FC<Props> = (p) => (
  <TableLayout<Registro>
    {...p}
    loading={p.loading}
    columns={columns}
    striped
    dense
    renderActions={(h) => {
      const archivada = !h.is_active;
      return (
        <ActionsMenu
          isArchived={archivada}
          onEdit={!archivada ? () => p.onEdit(h) : undefined}
          onArchiveOrRestore={() => archivada ? p.onRestore(h) : p.onArchive(h)}
          onDelete={() => p.onDelete(h)}
        />
      );
    }}
  />
);

export default HuertaTable;
