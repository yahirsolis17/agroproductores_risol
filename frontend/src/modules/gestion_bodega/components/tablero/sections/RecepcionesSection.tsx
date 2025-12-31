// frontend/src/modules/gestion_bodega/components/recepciones/RecepcionesSection.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Paper } from "@mui/material";

import RulesBanner from "../../capturas/RulesBanner";
import CapturasToolbar from "../../capturas/CapturasToolbar";
import CapturasTable from "../../capturas/CapturasTable";
import RecepcionFormModal from "../../capturas/RecepcionFormModal";

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
  isExpiredWeek?: boolean;

  /** Callback para que el Shell marque refetch de summary/recepciones/logística cuando hay mutaciones. */
  onMutateSuccess?: () => void;

  /** Acción para abrir el Drawer de empaque (lifted state) */
  onOpenEmpaque: (recepcion: Captura) => void;

  /** Token que al cambiar dispara refetch de capturas (usado post-empaque save) */
  empaqueRefetchToken?: number;
}

const RecepcionesSection: React.FC<RecepcionesSectionProps> = ({
  bodegaId,
  temporadaId,
  hasWeeks,
  selectedWeek,
  isActiveSelectedWeek,
  isExpiredWeek,
  onMutateSuccess,
  onOpenEmpaque,
  empaqueRefetchToken,
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

  // ─────────────────────────────────────────────────────────────
  // External refetch trigger (post-empaque save)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (empaqueRefetchToken && empaqueRefetchToken > 0) {
      void capRefetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empaqueRefetchToken]);

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
          onEmpaque={onOpenEmpaque}
          blocked={recepDisabled}
        />
      </Paper>
    </Box>
  );
};

export default RecepcionesSection;


