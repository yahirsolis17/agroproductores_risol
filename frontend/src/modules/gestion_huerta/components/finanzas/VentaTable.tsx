// src/modules/gestion_huerta/components/finanzas/VentaTable.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';

import { VentaHuerta } from '../../types/ventaTypes';

interface Props {
  data: VentaHuerta[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (p: number) => void;

  /* Acciones por fila */
  onEdit:    (v: VentaHuerta) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete:  (id: number) => void;

  loading?: boolean;
  emptyMessage?: string;
}

const dinero = (n: number) =>
  `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const columns: Column<VentaHuerta>[] = [
  {
    label: 'Fecha',
    key:   'fecha_venta',
    render: v => new Date(v.fecha_venta).toLocaleDateString('es-MX'),
  },
  { label: 'Tipo mango', key: 'tipo_mango' },
  { label: 'Cajas',      key: 'num_cajas',        align: 'right' },
  { label: 'Precio/caja',key: 'precio_por_caja',  align: 'right',
    render: v => dinero(v.precio_por_caja) },
  { label: 'Gasto',      key: 'gasto',            align: 'right',
    render: v => dinero(v.gasto) },
  { label: 'Total venta',key: 'total_venta',      align: 'right',
    render: v => dinero(v.total_venta) },
  { label: 'Ganancia',   key: 'ganancia_neta',    align: 'right',
    render: v => dinero(v.ganancia_neta) },
  {
    label: 'Estado', key: 'archivado_en', align: 'center',
    render: v =>
      v.archivado_en
        ? <Chip label="Archivada" size="small" color="warning"/>
        : <Chip label="Activa"    size="small" color="success"/>
  },
];

const VentaTable: React.FC<Props> = ({
  data, page, pageSize, count, onPageChange,
  onEdit, onArchive, onRestore, onDelete,
  loading = false,
  emptyMessage = 'Sin ventas registradas.',
}) => (
  <TableLayout<VentaHuerta>
    data={data}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    serverSidePagination
    striped
    dense
    loading={loading}
    emptyMessage={emptyMessage}
    columns={columns}
    rowKey={row => row.id}
    renderActions={v => {
      const isArchived = !v.is_active;
      return (
        <ActionsMenu
          isArchived={isArchived}
          onEdit={!isArchived ? () => onEdit(v) : undefined}
          onArchiveOrRestore={() =>
            isArchived ? onRestore(v.id) : onArchive(v.id)
          }
          onDelete={isArchived ? () => onDelete(v.id) : undefined}
          permEdit="change_venta"
          permArchiveOrRestore="archive_venta"
          permDelete="delete_venta"
        />
      );
    }}
  />
);

export default VentaTable;
