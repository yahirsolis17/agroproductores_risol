import { useMemo } from "react";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { TableLayout, Column } from "../../../../components/common/TableLayout";
import ActionsMenu from "../common/ActionsMenu";
import { formatDateDisplay } from "../../../../global/utils/date";

import type { Captura, PaginationMeta } from "../../types/capturasTypes";

type BaseProps = {
  /** Paginación/control */
  meta: PaginationMeta;
  loading: boolean;
  onPageChange: (page: number) => void;

  /** Acciones */
  onEdit?: (row: Captura) => void;
  onArchive?: (row: Captura) => void;
  onRestore?: (row: Captura) => void;
  onDelete?: (row: Captura) => void;
  onClassify?: (row: Captura) => void;

  /** Estado contextual (semana cerrada / temporada finalizada) */
  blocked?: boolean;

  /** Ya no es requerida; la tabla no crea por sí misma */
  onCreate?: () => void;
};

/**
 * Compatibilidad: acepta `items` o `rows`.
 * - Si usas esta tabla dentro del Tablero y tu data se llama `rows`, no truena.
 */
type Props =
  & BaseProps
  & (
    | { items: Captura[]; rows?: never }
    | { rows: Captura[]; items?: never }
  );

export default function CapturasTable({
  items,
  rows,
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
  const data: Captura[] = items ?? rows ?? [];

  const columns: Column<Captura>[] = useMemo(
    () => [
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
    <>
      <TableLayout<Captura>
        data={data}
        page={meta.page ?? 1}
        pageSize={meta.page_size ?? 10}
        count={meta.count ?? 0}
        onPageChange={onPageChange}
        columns={columns}
        loading={loading}
        serverSidePagination
        striped
        dense
        emptyMessage={"No hay recepciones registradas."}
        rowKey={(row) => row.id}
        renderActions={(row) => {
          const isArchived = !row.is_active;

          // codenames alineados con tu backend
          const permEdit = 'change_recepcion';
          const permDelete = 'delete_recepcion';
          const permArch = 'archive_recepcion';
          const permRest = 'restore_recepcion';
          const permArchiveOrRestore = isArchived ? permRest : permArch;

          return (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <ActionsMenu
                isArchived={isArchived}
                onEdit={(!blocked && !isArchived && onEdit) ? () => onEdit(row) : undefined}
                onArchiveOrRestore={!blocked && (onArchive || onRestore)
                  ? () => (isArchived ? onRestore?.(row) : onArchive?.(row))
                  : undefined}
                onDelete={isArchived && onDelete ? () => onDelete(row) : undefined}
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
        <span>Total recepciones: {data.length}</span>
        <span>
          Total cajas: {data.reduce((acc, it) => acc + (Number(it.cantidad_cajas) || 0), 0)}
        </span>
        <span>
          Prom. cajas/día: {(() => {
            const total = data.reduce((acc, it) => acc + (Number(it.cantidad_cajas) || 0), 0);
            return (total / 7).toFixed(1);
          })()}
        </span>
      </Box>
    </>
  );
}
