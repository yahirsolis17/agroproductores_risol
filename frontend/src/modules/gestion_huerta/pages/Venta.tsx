/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState, useEffect } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

import { useVentas } from '../hooks/useVentas';
import { VentaHuerta, VentaHuertaCreateData, VentaHuertaUpdateData } from '../types/ventaTypes';

import VentaToolbar from '../components/finanzas/VentaToolbar';
import VentaTable   from '../components/finanzas/VentaTable';
import VentaFormModal from '../components/finanzas/VentaFormModal';
import { temporadaService } from '../services/temporadaService';
import { cosechaService } from '../services/cosechaService';

const PAGE_SIZE = 10;

const Venta: React.FC = () => {
  const {
    ventas,
    loading,
    page,
    meta,
    filters,
    changePage,
    changeFilters,
    addVenta,
    editVenta,
    archive,
    restore,
    removeVenta,
    temporadaId,
    cosechaId,
  } = useVentas();

  // Conteo de filtros activos
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.estado && filters.estado !== 'activas') c++;
    if (filters.fechaDesde) c++;
    if (filters.fechaHasta) c++;
    return c;
  }, [filters]);

  const handleClearFilters = () => changeFilters({});

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VentaHuerta | null>(null);

  /* ---------- Estado de temporada y cosecha ---------- */
  const [tempState, setTempState] = useState<{ is_active: boolean; finalizada: boolean } | null>(null);
  const [cosechaState, setCosechaState] = useState<{ is_active: boolean; finalizada: boolean } | null>(null);

  useEffect(() => {
    if (!temporadaId || !cosechaId) return;
    let alive = true;
    (async () => {
      try {
        const [
          { data: { temporada } },
          { data: { cosecha } },
        ] = await Promise.all([
          temporadaService.getById(temporadaId),
          cosechaService.getById(cosechaId),
        ]);
        if (!alive) return;
        setTempState({
          is_active: temporada.is_active,
          finalizada: temporada.finalizada,
        });
        setCosechaState({
          is_active: cosecha.is_active,
          finalizada: cosecha.finalizada,
        });
      } catch {
        if (!alive) return;
        setTempState(null);
        setCosechaState(null);
      }
    })();
    return () => { alive = false; };
  }, [temporadaId, cosechaId]);

  const { canCreate, createTooltip } = useMemo(() => {
    if (!tempState || !cosechaState) {
      return { canCreate: false, createTooltip: '' };
    }
    if (!tempState.is_active) {
      return { canCreate: false, createTooltip: 'No se pueden registrar ventas en una temporada archivada.' };
    }
    if (tempState.finalizada) {
      return { canCreate: false, createTooltip: 'No se pueden registrar ventas en una temporada finalizada.' };
    }
    if (!cosechaState.is_active) {
      return { canCreate: false, createTooltip: 'No se pueden registrar ventas en una cosecha archivada.' };
    }
    if (cosechaState.finalizada) {
      return { canCreate: false, createTooltip: 'No se pueden registrar ventas en una cosecha finalizada.' };
    }
    return { canCreate: true, createTooltip: '' };
  }, [tempState, cosechaState]);

  const openCreate = () => {
    if (!canCreate) return;
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit   = (v: VentaHuerta) => { setEditTarget(v); setModalOpen(true); };

  // onSubmit
  const handleSubmit = async (vals: VentaHuertaCreateData | VentaHuertaUpdateData) => {
    if (editTarget) {
      await editVenta(editTarget.id, vals as VentaHuertaUpdateData);
    } else {
      await addVenta(vals as VentaHuertaCreateData);
    }
    // el modal se cierra desde el propio onSubmit
  };

  // Confirm delete
  const [delId, setDelId] = useState<number | null>(null);
  const confirmDelete = async () => {
    if (delId == null) return;
    await removeVenta(delId);
    setDelId(null);
  };

  return (
    <Box p={2}>
      <VentaToolbar
        filters={filters}
        onFiltersChange={changeFilters}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        onCreateClick={openCreate}
        canCreate={canCreate}
        createTooltip={createTooltip}
        totalCount={meta.count}
      />

      <VentaTable
        data={ventas}
        page={page}
        pageSize={PAGE_SIZE}
        count={meta.count}
        onPageChange={changePage}
        onEdit={openEdit}
        onArchive={(id) => archive(id)}
        onRestore={(id) => restore(id)}
        onDelete={(id) => setDelId(id)}
        loading={loading}
      />

      <VentaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editTarget ?? undefined}
      />

      <Dialog open={delId != null} onClose={() => setDelId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Eliminar esta venta permanentemente?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDelId(null)}>Cancelar</Button>
          <Button color="error" onClick={confirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Venta;
