import React from 'react';
import { Box, Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { VentaHuerta } from '../../types/ventaTypes';

/**
 * Formatea un número como moneda en pesos mexicanos con dos decimales.
 */
const dinero = (n: number) =>
  `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Definición de columnas para la tabla de ventas.
 * Cada columna puede renderizar su propio valor.  Para valores numéricos se usa la
 * función `dinero` para mostrar separadores de miles y dos decimales.
 */
const columns: Column<VentaHuerta>[] = [
  {
    label: 'Fecha',
    key: 'fecha_venta',
    render: (v) => new Date(v.fecha_venta).toLocaleDateString('es-MX'),
  },
  { label: 'Tipo mango', key: 'tipo_mango' },
  { label: 'Cajas', key: 'num_cajas', align: 'right' },
  {
    label: 'Precio/caja',
    key: 'precio_por_caja',
    align: 'right',
    render: (v) => dinero(v.precio_por_caja),
  },
  {
    label: 'Gasto',
    key: 'gasto',
    align: 'right',
    render: (v) => dinero(v.gasto),
  },
  {
    label: 'Total venta',
    key: 'total_venta',
    align: 'right',
    render: (v) => dinero(v.total_venta),
  },
  {
    label: 'Ganancia',
    key: 'ganancia_neta',
    align: 'right',
    render: (v) => dinero(v.ganancia_neta),
  },
  {
    label: 'Estado',
    key: 'archivado_en',
    align: 'center',
    render: (v) =>
      v.archivado_en ? (
        <Chip label="Archivada" size="small" color="warning" />
      ) : (
        <Chip label="Activa" size="small" color="success" />
      ),
  },
];

interface Props {
  data: VentaHuerta[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (p: number) => void;
  /** Acciones por fila */
  onEdit: (v: VentaHuerta) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const VentaTable: React.FC<Props> = ({
  data,
  page,
  pageSize,
  count,
  onPageChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
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
    rowKey={(row) => row.id}
    renderActions={(v) => {
      const isArchived = !v.is_active;
      return (
        <Box display="flex" gap={1}>
          <PermissionButton
            perm="change_venta"
            onClick={!isArchived ? () => onEdit(v) : undefined}
            disabled={isArchived}
          >
            Editar
          </PermissionButton>
          <PermissionButton
            perm="archive_venta"
            onClick={() => (isArchived ? onRestore(v.id) : onArchive(v.id))}
          >
            {isArchived ? 'Restaurar' : 'Archivar'}
          </PermissionButton>
          {isArchived && (
            <PermissionButton
              perm="delete_venta"
              onClick={() => onDelete(v.id)}
            >
              Eliminar
            </PermissionButton>
          )}
        </Box>
      );
    }}
  />
);

export default VentaTable;
