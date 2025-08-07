/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Paper, Typography, CircularProgress, Box, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { motion } from 'framer-motion';
import InversionTable from '../components/finanzas/InversionTable';
import VentaTable from '../components/finanzas/VentaTable';
import InversionFormModal from '../components/finanzas/InversionFormModal';
import VentaFormModal from '../components/finanzas/VentaFormModal';
import { FilterConfig } from '../../../components/common/TableLayout';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { useInversiones } from '../hooks/useInversiones';
import { useVentas } from '../hooks/useVentas';
import { useCategoriasInversion } from '../hooks/useCategoriasInversion';

import type { InversionCreate, InversionUpdate } from '../types/inversionTypes';
import type { VentaCreate, VentaUpdate } from '../types/ventaTypes';

type Vista = 'inversiones' | 'ventas';
type EstadoTab = 'activos' | 'archivados' | 'todos';

const pageSize = 10;

const FinanzasPorCosecha: React.FC = () => {
  const { cosechaId: param } = useParams<{ cosechaId: string }>();
  const cosechaId = Number(param);
  const huertaId = 0; // si lo obtienes de otro lado, reemplaza

  // Hooks
  const inv = useInversiones(cosechaId);
  const ven = useVentas(cosechaId);
  const cat = useCategoriasInversion();

  const [vista, setVista] = useState<Vista>('inversiones');
  const [tab, setTab] = useState<EstadoTab>('activos');

  useEffect(() => {
    if (vista === 'inversiones') inv.setEstado(tab);
    else ven.setEstado(tab);
  }, [vista, tab]);

  // Filtros simples
  const invFilters: FilterConfig[] = [{ key: 'search', label: 'Buscar', type: 'text' }];
  const venFilters: FilterConfig[] = [{ key: 'search', label: 'Buscar', type: 'text' }];

  const limpiarInv = () => inv.setFilters({});
  const limpiarVen = () => ven.setFilters({});

  // ----- Modales -----
  const [modalInvOpen, setModalInvOpen] = useState(false);
  const [modalVenOpen, setModalVenOpen] = useState(false);
  const [invEdit, setInvEdit] = useState<any | null>(null);
  const [venEdit, setVenEdit] = useState<any | null>(null);

  const handleSubmitInversion = async (vals: InversionCreate | InversionUpdate): Promise<void> => {
    const isEdit = Boolean(invEdit);
    const payload = isEdit
      ? (vals as InversionUpdate)
      : ({ ...(vals as InversionCreate), cosecha_id: cosechaId, huerta_id: huertaId });
    const res = isEdit
      ? await inv.editInversion(invEdit.id, payload)
      : await inv.addInversion(payload as InversionCreate);
    handleBackendNotification(res as any);
    setModalInvOpen(false);
    setInvEdit(null);
    inv.refetch();
  };

  const handleSubmitVenta = async (vals: VentaCreate | VentaUpdate): Promise<void> => {
    const isEdit = Boolean(venEdit);
    const payload = isEdit ? (vals as VentaUpdate) : ({ ...(vals as VentaCreate), cosecha: cosechaId });
    const res = isEdit ? await ven.editVenta(venEdit.id, payload) : await ven.addVenta(payload as VentaCreate);
    handleBackendNotification(res as any);
    setModalVenOpen(false);
    setVenEdit(null);
    ven.refetch();
  };

  const askDelete = (what: 'inv' | 'ven', id: number) => setDelDialog({ kind: what, id });
  const [delDialog, setDelDialog] = useState<{ kind: 'inv' | 'ven'; id: number } | null>(null);
  const confirmDelete = async () => {
    if (!delDialog) return;
    try {
      if (delDialog.kind === 'inv') {
        const r = await inv.removeInversion(delDialog.id);
        handleBackendNotification(r as any);
        inv.refetch();
      } else {
        const r = await ven.removeVenta(delDialog.id);
        handleBackendNotification(r as any);
        ven.refetch();
      }
    } catch (e: any) {
      handleBackendNotification(e?.response?.data);
    } finally {
      setDelDialog(null);
    }
  };

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

  // Primera carga
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!inv.loading && !ven.loading) loadedOnce.current = true;
  }, [inv.loading, ven.loading]);

  if (!loadedOnce.current && (inv.loading || ven.loading)) {
    return (
      <Box className="flex justify-center p-12">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:px-10 sm:pb-8 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Finanzas por Cosecha
        </Typography>

        <Tabs value={vista} onChange={(_, v) => setVista(v)} textColor="primary" indicatorColor="primary" sx={{ mb: 2 }}>
          <Tab value="inversiones" label="Inversiones" />
          <Tab value="ventas" label="Ventas" />
        </Tabs>

        <Tabs value={tab} onChange={(_, v: EstadoTab) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ mb: 2 }}>
          <Tab value="activos" label="Activas" />
          <Tab value="archivados" label="Archivadas" />
          <Tab value="todos" label="Todas" />
        </Tabs>

        {vista === 'inversiones' ? (
          <>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                onClick={() => {
                  setInvEdit(null);
                  setModalInvOpen(true);
                }}
              >
                Nueva inversión
              </Button>
            </Box>

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
              onFilterChange={(f) => inv.setFilters(f)}
              limpiarFiltros={limpiarInv}
              onEdit={(row) => {
                setInvEdit(row);
                setModalInvOpen(true);
              }}
              onDelete={(row) => askDelete('inv', row.id)}
              onArchive={(row) => handleArchiveOrRestoreInv(row, false)}
              onRestore={(row) => handleArchiveOrRestoreInv(row, true)}
            />

            {/* Modal de Inversiones: SOLO se monta si está abierto */}
            {modalInvOpen && (
              <InversionFormModal
                open={modalInvOpen}
                onClose={() => setModalInvOpen(false)}
                isEdit={!!invEdit}
                initialValues={
                  invEdit
                    ? {
                        nombre: invEdit.nombre,
                        fecha: invEdit.fecha,
                        descripcion: invEdit.descripcion,
                        gastos_insumos: invEdit.gastos_insumos,
                        gastos_mano_obra: invEdit.gastos_mano_obra,
                        categoria_id: invEdit.categoria?.id ?? null,
                      }
                    : undefined
                }
                onSubmit={handleSubmitInversion}
                categorias={cat.categorias}
                loadingCategorias={cat.loading}
                createCategoria={cat.createCategoria}
                updateCategoria={cat.updateCategoria}
                archiveCategoria={cat.archiveCategoria}
                restoreCategoria={cat.restoreCategoria}
                removeCategoria={cat.removeCategoria}
                onRefetchCategorias={cat.refetch}
              />
            )}
          </>
        ) : (
          <>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                onClick={() => {
                  setVenEdit(null);
                  setModalVenOpen(true);
                }}
              >
                Nueva venta
              </Button>
            </Box>

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
              onFilterChange={(f) => ven.setFilters(f)}
              limpiarFiltros={limpiarVen}
              onEdit={(row) => {
                setVenEdit(row);
                setModalVenOpen(true);
              }}
              onDelete={(row) => askDelete('ven', row.id)}
              onArchive={(row) => handleArchiveOrRestoreVen(row, false)}
              onRestore={(row) => handleArchiveOrRestoreVen(row, true)}
            />

            {/* Modal de Ventas: SOLO se monta si está abierto */}
            {modalVenOpen && (
              <VentaFormModal
                open={modalVenOpen}
                onClose={() => setModalVenOpen(false)}
                isEdit={!!venEdit}
                initialValues={
                  venEdit
                    ? {
                        fecha_venta: venEdit.fecha_venta,
                        num_cajas: venEdit.num_cajas,
                        precio_por_caja: venEdit.precio_por_caja,
                        tipo_mango: venEdit.tipo_mango,
                        descripcion: venEdit.descripcion,
                        gasto: venEdit.gasto,
                      }
                    : { cosecha: cosechaId }
                }
                onSubmit={handleSubmitVenta}
                cosechaId={cosechaId}
              />
            )}
          </>
        )}

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
