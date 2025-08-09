/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
} from '@mui/material';

import { useInversiones } from '../hooks/useInversiones';
import {
  InversionHuerta,
  InversionCreateData,
  InversionUpdateData,
} from '../types/inversionTypes';

import InversionToolbar from '../components/finanzas/InversionToolbar';
import InversionTable   from '../components/finanzas/InversionTable';
import InversionFormModal from '../components/finanzas/InversionFormModal';

const PAGE_SIZE = 10;

const Inversion: React.FC = () => {
  const {
    inversiones,
    loading,
    page,
    meta,
    filters,
    changePage,
    changeFilters,
    addInversion,
    editInversion,
    archive,
    restore,
    removeInversion,
  } = useInversiones();

  // Tabs estado
  const estado = filters.estado ?? 'activas';
  const handleEstado = (_: any, val: 'activas'|'archivadas'|'todas') => {
    changeFilters({ ...filters, estado: val });
  };

  // Conteo de filtros activos
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.categoria)  c++;
    if (filters.fechaDesde) c++;
    if (filters.fechaHasta) c++;
    return c;
  }, [filters]);

  const handleClearFilters = () => changeFilters({ estado }); // limpia todo menos el tab actual

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InversionHuerta | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (inv: InversionHuerta) => {
    setEditTarget(inv);
    setModalOpen(true);
  };

  // submit
  const handleSubmit = async (
    vals: InversionCreateData | InversionUpdateData
  ) => {
    if (editTarget) {
      await editInversion(editTarget.id, vals as InversionUpdateData);
    } else {
      await addInversion(vals as InversionCreateData);
    }
  };

  // confirm delete
  const [delId, setDelId] = useState<number | null>(null);
  const confirmDelete = async () => {
    if (delId == null) return;
    await removeInversion(delId);
    setDelId(null);
  };

  return (
    <Box p={2}>
      {/* Tabs de estado */}
      <Box mb={1}>
        <Tabs
          value={estado}
          onChange={handleEstado}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="activas"    label="Activas" />
          <Tab value="archivadas" label="Archivadas" />
          <Tab value="todas"      label="Todas" />
        </Tabs>
      </Box>

      <InversionToolbar
        filters={filters}
        onFiltersChange={changeFilters}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        onCreateClick={openCreate}
        totalCount={meta.count}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <InversionTable
          data={inversiones}
          page={page}
          pageSize={PAGE_SIZE}
          count={meta.count}
          onPageChange={changePage}
          onEdit={openEdit}
          onArchive={(id) => archive(id)}
          onRestore={(id) => restore(id)}
          onDelete={(id) => setDelId(id)}
        />
      )}

      <InversionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editTarget ?? undefined}
      />

      <Dialog open={delId != null} onClose={() => setDelId(null)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Eliminar esta inversión permanentemente?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelId(null)}>Cancelar</Button>
          <Button color="error" onClick={confirmDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inversion;
