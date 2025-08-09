import React from 'react';
import { Chip } from '@mui/material';
import { TableLayout, Column } from '../../../../components/common/TableLayout';
import ActionsMenu from '../common/ActionsMenu';

import { InversionHuerta } from '../../types/inversionTypes';

/* ───────────────────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────────────────── */
const dinero = (n: number) =>
  `$ ${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fechaLarga = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  // Ej: "8 de agosto de 2025"
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
};

/* ───────────────────────────────────────────────────────────
   Tipos
─────────────────────────────────────────────────────────── */
interface Props {
  data: InversionHuerta[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (p: number) => void;

  /* Acciones fila */
  onEdit:    (inv: InversionHuerta) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete:  (id: number) => void;

  loading?: boolean;
  emptyMessage?: string;

  /** id → nombre de categoría */
  categoriesMap?: Record<number, string>;
}

/* ───────────────────────────────────────────────────────────
   Columnas
─────────────────────────────────────────────────────────── */
const makeColumns = (map?: Record<number, string>): Column<InversionHuerta>[] => [
  {
    label: 'Fecha',
    key: 'fecha',
    render: i => fechaLarga(i.fecha),
  },
  {
    label: 'Descripción',
    key: 'descripcion',
    render: i => i.descripcion || '—',
  },
  {
    label: 'Insumos',
    key: 'gastos_insumos',
    align: 'right',
    render: i => dinero(i.gastos_insumos),
  },
  {
    label: 'Mano de obra',
    key: 'gastos_mano_obra',
    align: 'right',
    render: i => dinero(i.gastos_mano_obra),
  },
  {
    label: 'Total',
    key: 'gastos_totales',
    align: 'right',
    render: i => dinero(i.gastos_totales),
  },
  {
    label: 'Categoría',
    key: 'categoria',
    render: i => (map?.[i.categoria] ?? `#${i.categoria}`),
  },
  {
    label: 'Estado',
    key: 'is_active',
    align: 'center',
    render: i =>
      i.is_active
        ? <Chip label="Activa" size="small" color="success" />
        : <Chip label="Archivada" size="small" color="warning" />,
  },
];

/* ───────────────────────────────────────────────────────────
   Componente
─────────────────────────────────────────────────────────── */
const InversionTable: React.FC<Props> = ({
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
  emptyMessage = 'Sin inversiones registradas.',
  categoriesMap,
}) => {
  const columns = makeColumns(categoriesMap);

  return (
    <TableLayout<InversionHuerta>
      data={data}
      page={page}
      pageSize={pageSize}
      count={count}
      onPageChange={onPageChange}
      striped
      dense
      loading={loading}
      emptyMessage={emptyMessage}
      columns={columns}
      rowKey={i => i.id}
      renderActions={inv => {
        const isArchived = !inv.is_active;
        return (
          <ActionsMenu
            isArchived={isArchived}
            onEdit={!isArchived ? () => onEdit(inv) : undefined}
            onArchiveOrRestore={() =>
              isArchived ? onRestore(inv.id) : onArchive(inv.id)
            }
            onDelete={isArchived ? () => onDelete(inv.id) : undefined}
            permEdit="change_inversion"
            permArchiveOrRestore="archive_inversion"
            permDelete="delete_inversion"
          />
        );
      }}
    />
  );
};

export default InversionTable;
