// frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx
import { useMemo } from "react";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { TableLayout, Column } from "../../../../components/common/TableLayout";
import ActionsMenu from "../common/ActionsMenu";
import { formatSmartDateTime } from "../../../../global/utils/date";
import type { Captura, PaginationMeta, EmpaqueStatus } from "../../types/capturasTypes";

type BaseProps = {
  meta: PaginationMeta;
  loading: boolean;
  onPageChange: (page: number) => void;

  onEdit?: (row: Captura) => void;
  onArchive?: (row: Captura) => void;
  onRestore?: (row: Captura) => void;
  onDelete?: (row: Captura) => void;

  /** Acción para abrir el Drawer de Empaque (desde menú ⋯). */
  onEmpaque?: (row: Captura) => void;

  /** (Sigue existiendo si lo usas en tu flujo actual) */
  onClassify?: (row: Captura) => void;

  /** Bloqueo por semana cerrada / no operable / etc. */
  blocked?: boolean;
};

type Props =
  & BaseProps
  & (
    | { items: Captura[]; rows?: never }
    | { rows: Captura[]; items?: never }
  );

function safeStatus(v: any): EmpaqueStatus {
  const s = String(v || "").trim().toUpperCase();
  if (s === "EMPACADO") return "EMPACADO";
  if (s === "PARCIAL") return "PARCIAL";
  if (s === "MERMA_TOTAL") return "MERMA_TOTAL";
  return "SIN_EMPAQUE";
}

function getEmpaqueChipProps(row: Captura, blocked: boolean) {
  if (blocked) {
    return {
      label: "Bloqueada",
      color: "warning" as const,
      variant: "filled" as const,
    };
  }

  // cajas_empaquetadas EXCLUDES merma (backend fix)
  const packed = Number(row.cajas_empaquetadas) || 0;
  const merma = Number(row.cajas_merma) || 0;
  const st = safeStatus(row.empaque_status);

  if (st === "MERMA_TOTAL") {
    return {
      label: `Merma ${merma}`,
      color: "error" as const,
      variant: "filled" as const,
    };
  }
  if (st === "EMPACADO" || st === "PARCIAL") {
    const parts: string[] = [];
    if (packed > 0) parts.push(`Empacado ${packed}`);
    if (merma > 0) parts.push(`Merma ${merma}`);
    const label = parts.length > 0 ? parts.join(" · ") : "Sin empacar";
    return {
      label,
      color: (st === "EMPACADO" ? "success" : "warning") as "success" | "warning",
      variant: "filled" as const,
    };
  }
  return {
    label: "Sin empacar",
    color: "default" as const,
    variant: "outlined" as const,
  };
}

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
  onEmpaque,
  onClassify,
  blocked = false,
}: Props) {
  const data: Captura[] = items ?? rows ?? [];

  const page = meta.page ?? 1;
  const pageSize = meta.page_size ?? 10;
  const total = meta.count ?? 0;

  const columns: Column<Captura>[] = useMemo(
    () => [
      {
        label: "Fecha",
        key: "fecha",
        align: "left",
        render: (r) => formatSmartDateTime(r.fecha),
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
        label: "Empaque",
        key: "empaque_status" as any,
        align: "center",
        render: (r) => {
          const chip = getEmpaqueChipProps(r, blocked);

          // Indicador puro (drawer abre desde ⋯).
          return (
            <Chip
              size="small"
              label={chip.label}
              color={chip.color}
              variant={chip.variant}
              sx={{ fontWeight: 800 }}
            />
          );
        },
      },
      {
        label: "Notas",
        key: "observaciones",
        align: "left",
        render: (r) => r.observaciones ?? "-",
      },
    ],
    [blocked]
  );

  return (
    <>
      <TableLayout<Captura>
        data={data}
        page={page}
        pageSize={pageSize}
        metaPageSize={meta.page_size}
        count={total}
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

          const permEdit = "change_recepcion";
          const permDelete = "delete_recepcion";
          const permArch = "archive_recepcion";
          const permRest = "restore_recepcion";
          const permArchiveOrRestore = isArchived ? permRest : permArch;

          // Empaque: dedicado si existe, si no, cae a change_recepcion
          const permEmpaque = ["empaque_recepcion", "change_recepcion"];

          const labelEmpaque = blocked || isArchived ? "Ver empaque" : "Empacar";

          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                width: "100%",
              }}
            >
              <ActionsMenu
                isArchived={isArchived}
                onEdit={(!blocked && !isArchived && onEdit) ? () => onEdit(row) : undefined}
                onArchiveOrRestore={
                  !blocked && (onArchive || onRestore)
                    ? () => (isArchived ? onRestore?.(row) : onArchive?.(row))
                    : undefined
                }
                onDelete={isArchived && onDelete ? () => onDelete(row) : undefined}
                permEdit={permEdit}
                permArchiveOrRestore={permArchiveOrRestore}
                permDelete={permDelete}
                onEmpaque={onEmpaque ? () => onEmpaque(row) : undefined}
                labelEmpaque={labelEmpaque}
                permEmpaque={permEmpaque}
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

      <Box
        display="flex"
        gap={3}
        justifyContent="flex-end"
        mt={2}
        sx={{ color: "text.secondary", fontSize: 13 }}
      >
        <span>Total recepciones: {total}</span>
        <span>Recepciones en esta página: {data.length}</span>
        <span>
          Cajas (página): {data.reduce((acc, it) => acc + (Number(it.cantidad_cajas) || 0), 0)}
        </span>
      </Box>
    </>
  );
}
