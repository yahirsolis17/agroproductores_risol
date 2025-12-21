// frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Paper } from "@mui/material";

import RulesBanner from "../../capturas/RulesBanner";
import CapturasToolbar from "../../capturas/CapturasToolbar";
import CapturasTable from "../../capturas/CapturasTable";
import RecepcionFormModal from "../../capturas/RecepcionFormModal";

import EmpaqueDrawer from "../../empaque/EmpaqueDrawer";

import useCapturas from "../../../hooks/useCapturas";
import type { Captura } from "../../../types/capturasTypes";

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

  /** Callback para que el Shell marque refetch de summary/recepciones/logística cuando hay mutaciones. */
  onMutateSuccess?: () => void;
}

const RecepcionesSection: React.FC<RecepcionesSectionProps> = ({
  bodegaId,
  temporadaId,
  hasWeeks,
  selectedWeek,
  isActiveSelectedWeek,
  onMutateSuccess,
}) => {
  const {
    items: capRows,
    meta: capMeta,
    loading: capLoading,
    saving: capSaving,
    canOperate: capCanOperate,
    reasonDisabled: capReasonDisabled,
    setBodega: capSetBodega,
    setTemporada: capSetTemporada,
    setSemana: capSetSemana,
    setPage: capSetPage,
    refetch: capRefetch,
    create: capCreate,
    update: capUpdate,
    archivar: capArchivar,
    restaurar: capRestaurar,
    remove: capRemove,
  } = useCapturas();

  // Context sync (bodega/temporada)
  useEffect(() => {
    if (bodegaId) capSetBodega(bodegaId);
    if (temporadaId) capSetTemporada(temporadaId);
  }, [bodegaId, temporadaId, capSetBodega, capSetTemporada]);

  const selectedWeekId = (selectedWeek as any)?.id as number | undefined;
  const lastSemanaRef = useRef<number | undefined>(undefined);

  // Context sync (semana) + refetch (solo cuando cambia weekId)
  useEffect(() => {
    capSetSemana(selectedWeekId);

    if (!capCanOperate) return;

    // Si no hay semanas publicadas, cargamos sin filtro de semana.
    if (!hasWeeks) {
      capRefetch();
      return;
    }

    if (!selectedWeekId) return;
    if (lastSemanaRef.current === selectedWeekId) return;

    lastSemanaRef.current = selectedWeekId;
    capRefetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekId, capCanOperate, capSetSemana, capRefetch, hasWeeks]);

  // Bloqueos (semana cerrada/no iniciada)
  const recepDisabled = !capCanOperate ? true : hasWeeks ? !isActiveSelectedWeek : false;
  const recepReason = !capCanOperate
    ? capReasonDisabled || "Selecciona bodega y temporada."
    : hasWeeks && !isActiveSelectedWeek
    ? "Semana cerrada o no iniciada."
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
      capRefetch();
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

  const handleOpenEmpaque = useCallback((row: Captura) => {
    setSelectedRecepcion(row);
    setOpenEmpaque(true);
  }, []);

  const handleCloseEmpaque = useCallback(() => {
    setOpenEmpaque(false);
    setSelectedRecepcion(null);
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
        // UI-only: en Fase 4 se conectará a backend y esta acción habilitará guardar
        canSave={false}
      />
    </Box>
  );
};

export default RecepcionesSection;
