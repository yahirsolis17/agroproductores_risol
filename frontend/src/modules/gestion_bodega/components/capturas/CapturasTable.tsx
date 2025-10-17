import { useMemo } from "react";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { TableLayout, Column } from "../../../../components/common/TableLayout";
import ActionsMenu from "../common/ActionsMenu";
import { formatDateDisplay } from "../../../../global/utils/date";

import type { Captura, PaginationMeta } from "../../types/capturasTypes";

type Props = {
  items: Captura[];
  meta: PaginationMeta;
  loading: boolean;

  onPageChange: (page: number) => void;

  onCreate: () => void;
  onEdit: (row: Captura) => void;
  onArchive: (row: Captura) => void;
  onRestore: (row: Captura) => void;
  onDelete: (row: Captura) => void;

  blocked?: boolean; // semana cerrada / temporada finalizada
  onClassify?: (row: Captura) => void;
};

export default function CapturasTable({
  items,
  meta,
  loading,
  onPageChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  blocked = false,
  onClassify,
}: Props) {
  const columns: Column<Captura>[] = useMemo(
    () => [
      { label: "ID", key: "id", align: "center" },
      {
        label: "Fecha",
        key: "fecha",
        align: "left",
        render: (r) => formatDateDisplay(r.fecha),
      },
      { label: "Huertero", key: "huertero_nombre", align: "left" },
      { label: "Tipo", key: "tipo_mango", align: "left" },
      {
        label: "Cajas",
        key: "cantidad_cajas",
        align: "right",
        render: (r) => r.cantidad_cajas,
      },
      {
        label: "Notas",
        key: "observaciones",
        align: "left",
        render: (r) => r.observaciones ?? "-",
      },
      {
        label: "Estado",
        key: "is_active" as any,
        align: "center",
        render: (r) => {
          if (blocked) return <Chip size="small" color="warning" label="Bloqueada" />;
          return r.is_active
            ? <Chip size="small" color="success" label="Activa" />
            : <Chip size="small" color="default" label="Archivada" />;
        },
      },
    ],
    [blocked]
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <TableLayout<Captura>
        data={items}
        page={meta.page ?? 1}
        pageSize={meta.page_size ?? 10}
        count={meta.count ?? 0}
        onPageChange={onPageChange}
        columns={columns}
        loading={loading}
        rowKey={(row) => row.id}
        renderActions={(row) => {
          const isArchived = !row.is_active;
          const permEdit = 'change_recepcion';
          const permDelete = 'delete_recepcion';
          const permArch = 'archive_recepcion';
          const permRest = 'restore_recepcion';
          const permArchiveOrRestore = isArchived ? permRest : permArch;

          return (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <ActionsMenu
                isArchived={isArchived}
                onEdit={(!blocked && !isArchived) ? () => onEdit(row) : undefined}
                onArchiveOrRestore={!blocked ? () => (isArchived ? onRestore(row) : onArchive(row)) : undefined}
                onDelete={isArchived ? () => onDelete(row) : undefined}
                permEdit={permEdit}
                permArchiveOrRestore={permArchiveOrRestore}
                permDelete={permDelete}
              />
              {!!onClassify && row.is_active && (
                <Button size="small" variant="text" onClick={() => onClassify(row)}>
                  Clasificar
                </Button>
              )}
            </Box>
          );
        }}
      />

      {/* Resumen semanal */}
      <Box display="flex" gap={3} justifyContent="flex-end" mt={2} sx={{ color: 'text.secondary', fontSize: 13 }}>
        <span>Total recepciones: {items.length}</span>
        <span>Total cajas: {items.reduce((acc, it) => acc + (Number(it.cantidad_cajas) || 0), 0)}</span>
        <span>Prom. cajas/día: {(() => {
          const total = items.reduce((acc, it) => acc + (Number(it.cantidad_cajas) || 0), 0);
          return (total / 7).toFixed(1);
        })()}</span>
      </Box>
    </Paper>
  );
}
