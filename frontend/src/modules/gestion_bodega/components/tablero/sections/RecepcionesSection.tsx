// frontend/src/modules/gestion_bodega/components/recepciones/RecepcionesSection.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Paper } from "@mui/material";

import RulesBanner from "../../capturas/RulesBanner";
import CapturasToolbar from "../../capturas/CapturasToolbar";
import CapturasTable from "../../capturas/CapturasTable";
import RecepcionFormModal from "../../capturas/RecepcionFormModal";

import EmpaqueDrawer from "../../empaque/EmpaqueDrawer";

import useCapturas from "../../../hooks/useCapturas";
import useEmpaques from "../../../hooks/useEmpaques";
import type { Captura } from "../../../types/capturasTypes";
import { Material } from "../../../types/shared";

type WeekLike = {
  id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  inicio?: string;
  fin?: string;
};

interface RecepcionesSectionProps {
  bodegaId: number;
  temporadaId: number;

  hasWeeks: boolean;
  semanaIndex: number | null;

  selectedWeek: WeekLike | null;
  isActiveSelectedWeek: boolean;
  isExpiredWeek?: boolean;

  /** Callback para que el Shell marque refetch de summary/recepciones/logística cuando hay mutaciones. */
  onMutateSuccess?: () => void;
}

function normalizeBackendCalidadToUILabel(material: "PLASTICO" | "MADERA", calidadRaw: any): string {
  const raw = String(calidadRaw ?? "").trim().toUpperCase();

  // Alias principales (compatibles con el normalizeCalidad del service)
  if (raw === "NINIO" || raw === "NIÑO") return "Niño";
  if (raw === "RONIA" || raw === "ROÑA") return "Roña";

  // PLÁSTICO: SEGUNDA/EXTRA se tratan como PRIMERA (según regla ya aplicada en bulkUpsert)
  if (material === "PLASTICO" && (raw === "PRIMERA" || raw === "SEGUNDA" || raw === "EXTRA")) {
    return "Primera (≥ 2da)";
  }

  if (raw === "PRIMERA") return "Primera";

  // Capitalización simple para el resto (TERCERA -> Tercera, MERMA -> Merma, etc.)
  if (!raw) return "";
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

function buildInitialLinesPatchFromEmpaques(
  rows: any[],
  recepcionId: number
): { patch: Record<string, number>; existingKeys: string[] } {
  const patch: Record<string, number> = {};
  const existingKeys: string[] = [];

  const filtered = Array.isArray(rows)
    ? rows.filter((r) => Number(r?.recepcion) === Number(recepcionId))
    : [];

  for (const r of filtered) {
    const material = String(r?.material ?? "").toUpperCase() as "PLASTICO" | "MADERA";
    if (material !== "PLASTICO" && material !== "MADERA") continue;

    const uiCalidad = normalizeBackendCalidadToUILabel(material, r?.calidad);
    if (!uiCalidad) continue;

    const key = `${material}.${uiCalidad}`;
    const qty = Number(r?.cantidad_cajas ?? 0);
    const safeQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;

    patch[key] = (patch[key] ?? 0) + safeQty;
  }

  for (const k of Object.keys(patch)) existingKeys.push(k);

  return { patch, existingKeys };
}

const RecepcionesSection: React.FC<RecepcionesSectionProps> = ({
  bodegaId,
  temporadaId,
  hasWeeks,
  selectedWeek,
  isActiveSelectedWeek,
  isExpiredWeek,
  onMutateSuccess,
}) => {
  const {
    items: capRows,
    meta: capMeta,
    loading: capLoading,
    saving: capSaving,
    canOperate: capCanOperate,
    reasonDisabled: capReasonDisabled,
    setContext: capSetContext,
    setSemana: capSetSemana,
    setPage: capSetPage,
    refetch: capRefetch,
    create: capCreate,
    update: capUpdate,
    archivar: capArchivar,
    restaurar: capRestaurar,
    remove: capRemove,
  } = useCapturas();

  const {
    // list state
    empaques: empRows,
    status: empStatus,

    // actions
    refetch: empRefetch,
    clearError: empClearError,

    // bulk upsert
    bulkUpsert: empBulkUpsert,
    bulkSaving: empBulkSaving,
  } = useEmpaques(false); // false = no autoFetch

  const selectedWeekId = (selectedWeek as any)?.id as number | undefined;

  // ─────────────────────────────────────────────────────────────
  // Sync contexto base (bodega/temporada) + reset page
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bodegaId || !temporadaId) return;

    capSetContext({ bodegaId, temporadaId, resetPage: true });

    // Si NO hay semanas publicadas, cargamos sin filtro de semana
    if (!hasWeeks) {
      capSetSemana(undefined);
      void capRefetch();
    }
    // Si HAY semanas, el fetch lo dispara el effect de selectedWeekId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaId, temporadaId, hasWeeks]);

  // ─────────────────────────────────────────────────────────────
  // Sync semana + reset page + refetch
  // Nota: se fetchea aunque la semana esté cerrada para permitir ver histórico.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasWeeks) return; // ya se maneja arriba

    capSetSemana(selectedWeekId);
    capSetPage(1);

    if (!selectedWeekId) return;
    void capRefetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWeeks, selectedWeekId]);

  // Bloqueos (operación)
  const recepDisabled = !capCanOperate
    ? true
    : hasWeeks
      ? !isActiveSelectedWeek || !!isExpiredWeek
      : false;

  const recepReason = !capCanOperate
    ? capReasonDisabled || "Selecciona bodega y temporada."
    : hasWeeks && !isActiveSelectedWeek
      ? "Semana cerrada o no iniciada."
      : hasWeeks && isExpiredWeek
        ? "Semana caducada. Finaliza para continuar."
        : undefined;

  const weekRange = useMemo(() => {
    if (!selectedWeek) return undefined;
    return {
      from: (selectedWeek as any)?.fecha_desde || (selectedWeek as any)?.inicio,
      to: (selectedWeek as any)?.fecha_hasta || (selectedWeek as any)?.fin,
    };
  }, [selectedWeek]);

  const onPageCapturas = useCallback(
    (n: number) => {
      capSetPage(n);
      void capRefetch();
    },
    [capSetPage, capRefetch]
  );

  // Modal Recepción (crear/editar)
  const [openRecepcionModal, setOpenRecepcionModal] = useState(false);
  const [editingRecepcion, setEditingRecepcion] = useState<any | null>(null);

  const handleNewRecepcion = useCallback(() => {
    setEditingRecepcion(null);
    setOpenRecepcionModal(true);
  }, []);

  const handleEditRecepcion = useCallback((row: any) => {
    setEditingRecepcion(row);
    setOpenRecepcionModal(true);
  }, []);

  const afterMutate = useCallback(async () => {
    await capRefetch();
    onMutateSuccess?.();
  }, [capRefetch, onMutateSuccess]);

  const handleArchiveRecepcion = useCallback(
    async (row: any) => {
      await capArchivar(row.id);
      await afterMutate();
    },
    [capArchivar, afterMutate]
  );

  const handleRestoreRecepcion = useCallback(
    async (row: any) => {
      await capRestaurar(row.id);
      await afterMutate();
    },
    [capRestaurar, afterMutate]
  );

  const handleDeleteRecepcion = useCallback(
    async (row: any) => {
      await capRemove(row.id);
      await afterMutate();
    },
    [capRemove, afterMutate]
  );

  // ─────────────────────────────────────────────────────────────
  // Empaque (abre desde ActionsMenu → onEmpaque)
  // ─────────────────────────────────────────────────────────────
  const [openEmpaque, setOpenEmpaque] = useState(false);
  const [selectedRecepcion, setSelectedRecepcion] = useState<Captura | null>(null);

  // Hidratar líneas existentes (precarga)
  const [empaqueLoading, setEmpaqueLoading] = useState(false);
  const [empaqueInitialLines, setEmpaqueInitialLines] = useState<Record<string, number> | null>(null);
  const [empaqueExistingKeys, setEmpaqueExistingKeys] = useState<string[]>([]);

  const handleOpenEmpaque = useCallback((row: Captura) => {
    setSelectedRecepcion(row);
    setOpenEmpaque(true);
  }, []);

  const handleCloseEmpaque = useCallback(() => {
    setOpenEmpaque(false);
    setSelectedRecepcion(null);

    // Limpieza segura
    setEmpaqueLoading(false);
    setEmpaqueInitialLines(null);
    setEmpaqueExistingKeys([]);
  }, []);

  // Evita inconsistencias: al cambiar semana o página, cerramos el empaque abierto
  useEffect(() => {
    handleCloseEmpaque();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekId, capMeta?.page]);

  const empaqueReadOnlyReason = useMemo(() => {
    if (!selectedRecepcion) return undefined;
    if (recepDisabled) return recepReason || "Operación bloqueada.";
    if (!selectedRecepcion.is_active) return "Recepción archivada (solo lectura).";
    return undefined;
  }, [selectedRecepcion, recepDisabled, recepReason]);

  // Dispara fetch de empaques existentes al abrir el Drawer
  useEffect(() => {
    if (!openEmpaque) return;
    if (!selectedRecepcion?.id) return;
    if (!bodegaId || !temporadaId) return;

    setEmpaqueLoading(true);
    setEmpaqueInitialLines(null);
    setEmpaqueExistingKeys([]);

    empClearError();

    // Importante: usamos el thunk/list vía hook (sin service directo) para mantener patrón Redux.
    empRefetch(
      {
        recepcion: selectedRecepcion.id,
        bodega: bodegaId,
        temporada: temporadaId,
        is_active: true,
        page: 1,
        page_size: 200,
        ordering: "-id",
      } as any
    );
  }, [openEmpaque, selectedRecepcion?.id, bodegaId, temporadaId, empRefetch, empClearError]);

  // Cuando el list termina, construimos el patch de líneas y lo pasamos al Drawer
  useEffect(() => {
    if (!openEmpaque) return;
    if (!selectedRecepcion?.id) return;

    if (empStatus === "loading") return;

    if (empStatus === "failed") {
      setEmpaqueLoading(false);
      setEmpaqueInitialLines(null);
      setEmpaqueExistingKeys([]);
      return;
    }

    if (empStatus === "succeeded") {
      const { patch, existingKeys } = buildInitialLinesPatchFromEmpaques(empRows as any[], selectedRecepcion.id);
      setEmpaqueInitialLines(patch);
      setEmpaqueExistingKeys(existingKeys);
      setEmpaqueLoading(false);
    }
  }, [openEmpaque, selectedRecepcion?.id, empStatus, empRows]);

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 2 }}>
        <RulesBanner blocked={recepDisabled} reason={recepReason} range={hasWeeks ? weekRange : undefined} />
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <CapturasToolbar
          bodegaId={bodegaId}
          temporadaId={temporadaId}
          disabledActions={recepDisabled}
          disabledReason={recepReason}
          onNewRecepcion={handleNewRecepcion}
        />
      </Box>

      <RecepcionFormModal
        open={openRecepcionModal}
        onClose={() => {
          setOpenRecepcionModal(false);
          setEditingRecepcion(null);
        }}
        initial={editingRecepcion}
        bodegaId={bodegaId}
        temporadaId={temporadaId}
        weekRange={weekRange}
        blocked={recepDisabled}
        blockReason={recepReason}
        busy={!!capSaving}
        onCreate={async (payload: any) => {
          try {
            await capCreate(payload);
            await afterMutate();
            setOpenRecepcionModal(false);
            setEditingRecepcion(null);
          } catch {
            // Notificación ya controlada por servicios/NotificationEngine.
          }
        }}
        onUpdate={async (id: number, payload: any) => {
          try {
            await capUpdate(id, payload);
            await afterMutate();
            setOpenRecepcionModal(false);
            setEditingRecepcion(null);
          } catch {
            // Notificación ya controlada por servicios/NotificationEngine.
          }
        }}
      />

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
        <CapturasTable
          items={capRows as Captura[]}
          meta={capMeta}
          loading={capLoading}
          onPageChange={onPageCapturas}
          onEdit={handleEditRecepcion}
          onArchive={handleArchiveRecepcion}
          onRestore={handleRestoreRecepcion}
          onDelete={handleDeleteRecepcion}
          onEmpaque={handleOpenEmpaque}
          blocked={recepDisabled}
        />
      </Paper>

      <EmpaqueDrawer
        open={openEmpaque}
        onClose={handleCloseEmpaque}
        recepcion={selectedRecepcion}
        blocked={!!empaqueReadOnlyReason}
        blockReason={empaqueReadOnlyReason}
        canSave={true}
        busy={empBulkSaving}
        loadingInitial={empaqueLoading}
        initialLines={empaqueInitialLines as any}
        onSave={async (lines) => {
          if (!selectedRecepcion || !bodegaId || !temporadaId) return;

          const existingSet = new Set(empaqueExistingKeys);

          const items = Object.entries(lines)
            .map(([key, qty]) => {
              const [materialStr, calidad] = key.split(".");
              const material = materialStr === "PLASTICO" ? Material.PLASTICO : Material.MADERA;

              return {
                _key: key, // helper interno para filtrar sin rearmar
                material,
                calidad,
                tipo_mango: selectedRecepcion.tipo_mango ?? "",
                cantidad_cajas: qty,
              };
            })
            // IMPORTANT: permitimos qty=0 SOLO si esa línea ya existía (para poder corregir hacia abajo)
            .filter((i) => Number(i.cantidad_cajas) > 0 || existingSet.has(i._key))
            .map(({ _key, ...rest }) => rest);

          try {
            await empBulkUpsert({
              recepcion: selectedRecepcion.id!,
              bodega: bodegaId,
              temporada: temporadaId,
              fecha: selectedRecepcion.fecha!, // Asumimos fecha de recepción por consistencia operativa
              items,
            }).unwrap();

            // Refetch para que la tabla muestre "Empacado" y totales
            await afterMutate();
            handleCloseEmpaque();
          } catch (err: any) {
            // Error ya manejado por NotificationEngine si el backend manda 400/409.
            console.error("Falló guardado empaque", err);
          }
        }}
      />
    </Box>
  );
};

export default RecepcionesSection;
