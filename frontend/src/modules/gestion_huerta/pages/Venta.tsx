/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

import { useVentas } from '../hooks/useVentas';
import { VentaHuerta, VentaHuertaCreateData, VentaHuertaUpdateData } from '../types/ventaTypes';

import VentaToolbar from '../components/finanzas/VentaToolbar';
import VentaTable   from '../components/finanzas/VentaTable';
import VentaFormModal from '../components/finanzas/VentaFormModal';

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

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
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
