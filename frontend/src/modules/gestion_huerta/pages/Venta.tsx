// src/modules/gestion_huerta/pages/Venta.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useVentas } from '../hooks/useVentas';
import { VentaHuerta, VentaHuertaCreateData, VentaHuertaUpdateData } from '../types/ventaTypes';

import VentaToolbar from '../components/finanzas/VentaToolbar';
import VentaTable from '../components/finanzas/VentaTable';
import VentaFormModal from '../components/finanzas/VentaFormModal';
const PAGE_SIZE = 10;

type EstadoData = { is_active: boolean; finalizada: boolean };

type VentaProps = {
  temporadaState: EstadoData | null;
  cosechaState: EstadoData | null;
  hasContext: boolean;
};

const Venta: React.FC<VentaProps> = ({ temporadaState, cosechaState, hasContext }) => {
  const navigate = useNavigate();
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
    temporadaId: _temporadaId,
    cosechaId: _cosechaId,
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

  const tempState = temporadaState;

  const { canCreate, createTooltip } = useMemo(() => {
    if (!hasContext) {
      return { canCreate: false, createTooltip: 'No hay contexto. Regresa a Cosechas.' };
    }
    if (!tempState || !cosechaState) {
      return { canCreate: false, createTooltip: 'Cargando estado de temporada y cosecha…' };
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
  }, [hasContext, tempState, cosechaState]);

  const openCreate = () => {
    if (!canCreate) return;
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (v: VentaHuerta) => { setEditTarget(v); setModalOpen(true); };

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

  if (!hasContext) {
    return (
      <Box p={2}>
        <VentaToolbar
          filters={filters}
          onFiltersChange={changeFilters}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
          onCreateClick={openCreate}
          canCreate={false}
          createTooltip="No hay contexto. Regresa a Cosechas."
          totalCount={meta.count}
        />
        <Box mt={2}>
          <Button variant="contained" onClick={() => navigate('/cosechas')}>
            Volver a Cosechas
          </Button>
        </Box>
      </Box>
    );
  }

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
        pageSize={meta.page_size ?? PAGE_SIZE}
        metaPageSize={meta.page_size}
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
