/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

import { useVentas } from '../hooks/useVentas';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../global/store/store';
import { setBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import {
  VentaHuerta,
  VentaCreateData,
  VentaUpdateData,
} from '../types/ventaTypes';

import VentaToolbar from '../components/finanzas/VentaToolbar';
import VentaTable   from '../components/finanzas/VentaTable';
import VentaFormModal from '../components/finanzas/VentaFormModal';

const PAGE_SIZE = 10;

const Venta: React.FC = () => {
  const dispatch = useDispatch();
  const {
    ventas,
    loading,
    page,
    meta,
    filters,
    huertaId,
    temporadaId,
    changePage,
    changeFilters,
    addVenta,
    editVenta,
    archive,
    restore,
    removeVenta,
  } = useVentas();

  const temporada = useAppSelector((s) =>
    s.temporada.list.find((t) => t.id === temporadaId)
  );
  const huertaNombre = temporada?.huerta_nombre;
  const año = temporada?.año;

  useEffect(() => {
    if (huertaId && huertaNombre && año) {
      dispatch(
        setBreadcrumbs(
          breadcrumbRoutes.ventasInversiones(huertaId, huertaNombre, año)
        )
      );
    }
    return () => {
      // No limpiamos las migas para que persistan al cambiar de pestaña
    };
  }, [dispatch, huertaId, huertaNombre, año]);

  // Conteo de filtros activos
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.tipoMango) c++;
    if (filters.fechaDesde) c++;
    if (filters.fechaHasta) c++;
    return c;
  }, [filters]);

  const handleClearFilters = () => changeFilters({});

  // Estado para modal de crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VentaHuerta | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (v: VentaHuerta) => {
    setEditTarget(v);
    setModalOpen(true);
  };

  // onSubmit para el formulario
  const handleSubmit = async (
    vals: VentaCreateData | VentaUpdateData
  ) => {
    if (editTarget) {
      await editVenta(editTarget.id, vals as VentaUpdateData);
    } else {
      await addVenta(vals as VentaCreateData);
    }
  };

  // Confirmación de eliminación
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

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <VentaTable
          data={ventas}
          page={page}
          pageSize={PAGE_SIZE}
          count={meta.count}
          onPageChange={changePage}
          onEdit={openEdit}
          // Callbacks reciben sólo el id
          onArchive={(id) => archive(id)}
          onRestore={(id) => restore(id)}
          onDelete={(id) => setDelId(id)}
        />
      )}

      <VentaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editTarget ?? undefined}
      />

      <Dialog open={delId != null} onClose={() => setDelId(null)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Eliminar esta venta permanentemente?
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

export default Venta;
