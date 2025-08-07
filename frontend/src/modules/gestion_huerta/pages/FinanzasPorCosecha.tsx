/* src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Paper,
  Typography,
  CircularProgress,
  Box,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { motion } from 'framer-motion';

import InversionTable     from '../components/finanzas/InversionTable';
import VentaTable         from '../components/finanzas/VentaTable';
import InversionFormModal from '../components/finanzas/InversionFormModal';
import VentaFormModal     from '../components/finanzas/VentaFormModal';
import { FilterConfig }   from '../../../components/common/TableLayout';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { useInversiones }         from '../hooks/useInversiones';
import { useVentas }              from '../hooks/useVentas';
import { useCategoriasInversion } from '../hooks/useCategoriasInversion';

import type { InversionCreate, InversionUpdate } from '../types/inversionTypes';
import type { VentaCreate, VentaUpdate }         from '../types/ventaTypes';

type Vista     = 'inversiones' | 'ventas';
type EstadoTab = 'activos' | 'archivados' | 'todos';

const pageSize = 10;

const FinanzasPorCosecha: React.FC = () => {
  // ─── IDs del contexto obtenidos de la URL (?huerta_id&temporada_id&cosecha_id)
  const [params] = useSearchParams();
  const cosechaId   = parseInt(params.get('cosecha_id')   ?? '', 10);
  const huertaId    = parseInt(params.get('huerta_id')    ?? '', 10);
  const temporadaId = parseInt(params.get('temporada_id') ?? '', 10);
  const validIds    = [cosechaId, huertaId, temporadaId].every(Number.isInteger);

  // ─── Hooks de datos (Inversiones, Ventas, Categorías)
  const inv = useInversiones(cosechaId);
  const ven = useVentas(cosechaId);
  const cat = useCategoriasInversion(true);

  // ─── Control de pestañas
  const [vista, setVista] = useState<Vista>('inversiones');
  const [tab,   setTab]   = useState<EstadoTab>('activos');
  useEffect(() => {
    if (vista === 'inversiones') inv.setEstado(tab);
    else                         ven.setEstado(tab);
  }, [vista, tab]);

  // ─── Filtros de búsqueda
  const invFilters: FilterConfig[] = [{ key: 'search', label: 'Buscar', type: 'text' }];
  const venFilters: FilterConfig[] = [{ key: 'search', label: 'Buscar', type: 'text' }];
  const limpiarInv = () => inv.setFilters({});
  const limpiarVen = () => ven.setFilters({});

  // ─── Estados de los modales y edición
  const [modalInvOpen, setModalInvOpen] = useState(false);
  const [modalVenOpen, setModalVenOpen] = useState(false);
  const [invEdit,      setInvEdit]      = useState<InversionCreate|InversionUpdate|null>(null);
  const [venEdit,      setVenEdit]      = useState<VentaCreate|VentaUpdate|null>(null);

  // ─── Enviar inversión
  const handleSubmitInversion = async (vals: InversionCreate | InversionUpdate) => {
    const payload = { ...vals, fecha: (vals as any).fecha?.slice(0,10) };
    const isEdit  = Boolean(invEdit);
    const resp = isEdit
      ? await inv.editInversion((invEdit as any).id, payload as InversionUpdate)
      : await inv.addInversion({
          ...(payload as InversionCreate),
          cosecha_id: cosechaId,
          huerta_id : huertaId,
          temporada_id: temporadaId,
        });
    handleBackendNotification(resp as any);
    setModalInvOpen(false);
    setInvEdit(null);
    inv.refetch();
  };

  // ─── Enviar venta
  const handleSubmitVenta = async (vals: VentaCreate | VentaUpdate) => {
    const isEdit = Boolean(venEdit);
    const payload = isEdit
      ? vals as VentaUpdate
      : ({
          ...(vals as VentaCreate),
          cosecha: cosechaId,
          huerta_id: huertaId,
          temporada_id: temporadaId,
        });
    const resp = isEdit
      ? await ven.editVenta((venEdit as any).id, payload as VentaUpdate)
      : await ven.addVenta(payload as VentaCreate);
    handleBackendNotification(resp as any);
    setModalVenOpen(false);
    setVenEdit(null);
    ven.refetch();
  };

  // ─── Confirmar eliminación
  const [delDialog, setDelDialog] = useState<{ kind: 'inv'|'ven'; id: number }|null>(null);
  const askDelete = (kind: 'inv'|'ven', id: number) => setDelDialog({ kind, id });
  const confirmDelete = async () => {
    if (!delDialog) return;
    try {
      const resp = delDialog.kind === 'inv'
        ? await inv.removeInversion(delDialog.id)
        : await ven.removeVenta(delDialog.id);
      handleBackendNotification(resp as any);
      delDialog.kind === 'inv' ? inv.refetch() : ven.refetch();
    } catch (e: any) {
      handleBackendNotification(e?.response?.data||e);
    } finally {
      setDelDialog(null);
    }
  };

  // ─── Archivar / restaurar filas
  const handleArchiveOrRestoreInv = async (row: any, restore: boolean) => {
    const r = restore ? await inv.restore(row.id) : await inv.archive(row.id);
    handleBackendNotification(r as any);
    inv.refetch();
  };
  const handleArchiveOrRestoreVen = async (row: any, restore: boolean) => {
    const r = restore ? await ven.restore(row.id) : await ven.archive(row.id);
    handleBackendNotification(r as any);
    ven.refetch();
  };

  // ─── Loader inicial: espera cosecha + primer fetch
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!inv.loading && !ven.loading) loadedOnce.current = true;
  }, [inv.loading, ven.loading]);

  if (!validIds) {
    return (
      <Box className="flex justify-center p-12">
        <Typography>Parámetros insuficientes.</Typography>
      </Box>
    );
  }

  if (!loadedOnce.current && (inv.loading || ven.loading)) {
    return (
      <Box className="flex justify-center p-12">
        <CircularProgress size={48} />
      </Box>
    );
  }

  // ───────────── Render ───────────────────
  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:px-10 sm:pb-8 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Finanzas por Cosecha
        </Typography>

        {/* Pestañas: Inversiones / Ventas */}
        <Tabs
          value={vista}
          onChange={(_, v) => setVista(v as Vista)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="inversiones" label="Inversiones" />
          <Tab value="ventas"      label="Ventas"       />
        </Tabs>

        {/* Pestañas de estado */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as EstadoTab)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="activos"    label="Activas"    />
          <Tab value="archivados" label="Archivadas" />
          <Tab value="todos"      label="Todas"      />
        </Tabs>

        {vista === 'inversiones' ? (
          <>
            {/* Botón Nueva Inversión */}
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                disabled={!huertaId || !temporadaId || !cosechaId}
                onClick={() => { setInvEdit(null); setModalInvOpen(true); }}
              >
                Nueva inversión
              </Button>
            </Box>

            {/* Tabla de inversiones */}
            <InversionTable
              data={inv.inversiones}
              page={inv.page}
              pageSize={pageSize}
              count={inv.meta.count}
              onPageChange={inv.setPage}
              loading={inv.loading}
              emptyMessage={inv.inversiones.length ? '' : 'No hay inversiones.'}
              filterConfig={invFilters}
              filterValues={inv.filters}
              onFilterChange={inv.setFilters}
              limpiarFiltros={limpiarInv}
              onEdit={(r) => { setInvEdit(r); setModalInvOpen(true); }}
              onDelete={r => askDelete('inv', r.id)}
              onArchive={r => handleArchiveOrRestoreInv(r, false)}
              onRestore={r => handleArchiveOrRestoreInv(r, true)}
            />

            {/* Modal de inversión */}
            {modalInvOpen && (
              <InversionFormModal
                open={modalInvOpen}
                onClose={() => { setModalInvOpen(false); setInvEdit(null); }}
                isEdit={!!invEdit}
                cosechaId={cosechaId}
                huertaId={huertaId}
                temporadaId={temporadaId}
                initialValues={invEdit ?? undefined}
                onSubmit={handleSubmitInversion}
                categorias={cat.categorias}
                loadingCategorias={cat.loading}
                createCategoria={cat.addCategoria}
                updateCategoria={cat.editCategoria}
                archiveCategoria={cat.archive}
                restoreCategoria={cat.restore}
                removeCategoria={cat.removeCategoria}
                onRefetchCategorias={cat.refetch}
              />
            )}
          </>
        ) : (
          <>
            {/* Botón Nueva Venta */}
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                disabled={!huertaId || !temporadaId || !cosechaId}
                onClick={() => { setVenEdit(null); setModalVenOpen(true); }}
              >
                Nueva venta
              </Button>
            </Box>

            {/* Tabla de ventas */}
            <VentaTable
              data={ven.ventas}
              page={ven.page}
              pageSize={pageSize}
              count={ven.meta.count}
              onPageChange={ven.setPage}
              loading={ven.loading}
              emptyMessage={ven.ventas.length ? '' : 'No hay ventas.'}
              filterConfig={venFilters}
              filterValues={ven.filters}
              onFilterChange={ven.setFilters}
              limpiarFiltros={limpiarVen}
              onEdit={r   => { setVenEdit(r); setModalVenOpen(true); }}
              onDelete={r => askDelete('ven', r.id)}
              onArchive={r => handleArchiveOrRestoreVen(r, false)}
              onRestore={r => handleArchiveOrRestoreVen(r, true)}
            />

            {/* Modal de venta */}
            {modalVenOpen && (
              <VentaFormModal
                open={modalVenOpen}
                onClose={() => setModalVenOpen(false)}
                isEdit={!!venEdit}
                initialValues={venEdit ?? { cosecha: cosechaId }}
                onSubmit={handleSubmitVenta}
                cosechaId={cosechaId}
              />
            )}
          </>
        )}

        {/* Dialogo de confirmación de eliminación */}
        <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar este registro permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialog(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default FinanzasPorCosecha;
