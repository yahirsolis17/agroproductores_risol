// ============================================================================
// src/modules/gestion_huerta/components/finanzas/Inversion.tsx
// ============================================================================
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState, useEffect } from 'react';
import { Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useParams } from 'react-router-dom';

import { useInversiones } from '../hooks/useInversiones';
import { InversionHuerta, InversionCreateData, InversionUpdateData } from '../types/inversionTypes';

import { temporadaService } from '../services/temporadaService';
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
    setContext,
    temporadaId,
    cosechaId,
    huertaId,
    huertaRentadaId,
  } = useInversiones();

  const { temporadaId: tStr, cosechaId: cStr } = useParams<{ temporadaId: string; cosechaId: string }>();
  const tId = Number(tStr) || null;
  const cId = Number(cStr) || null;

  // Inicializar contexto desde la URL (y levantar huerta u huerta_rentada desde la temporada)
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    (async () => {
      if (!tId || !cId) { setBooting(false); return; }
      try {
        const res = await temporadaService.getById(tId);
        const t = res.data.temporada;
        const origenHuertaId = t.huerta ?? null;
        const origenRentadaId = t.huerta_rentada ?? null;
        setContext({ temporadaId: tId, cosechaId: cId, huertaId: origenHuertaId, huertaRentadaId: origenRentadaId });
      } finally {
        setBooting(false);
      }
    })();
  }, [tId, cId]);

  // Conteo de filtros activos
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.categoria)  c++;
    if (filters.fechaDesde) c++;
    if (filters.fechaHasta) c++;
    return c;
  }, [filters]);

  const handleClearFilters = () => changeFilters({ estado: filters.estado });

  // Estado para modal de crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InversionHuerta | null>(null);

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (inv: InversionHuerta) => { setEditTarget(inv); setModalOpen(true); };

  // onSubmit para el formulario
  const handleSubmit = async (vals: InversionCreateData | InversionUpdateData) => {
    if (editTarget) {
      await editInversion(editTarget.id, vals as InversionUpdateData);
    } else {
      await addInversion(vals as InversionCreateData);
    }
  };

  // Confirmación de eliminación
  const [delId, setDelId] = useState<number | null>(null);
  const confirmDelete = async () => { if (delId != null) { await removeInversion(delId); setDelId(null); } };

  if (booting || !tId || !cId) {
    return (
      <Box display="flex" justifyContent="center" mt={4}><CircularProgress/></Box>
    );
  }

  return (
    <Box p={2}>
      <InversionToolbar
        filters={filters}
        onFiltersChange={changeFilters}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        onCreateClick={openCreate}
        totalCount={meta.count}
        canCreate={Boolean(temporadaId && cosechaId && (huertaId || huertaRentadaId))}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
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
        <DialogContent>¿Eliminar esta inversión permanentemente?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDelId(null)}>Cancelar</Button>
          <Button color="error" onClick={confirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inversion;
