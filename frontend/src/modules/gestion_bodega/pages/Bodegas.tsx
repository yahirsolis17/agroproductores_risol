/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Paper,
  Typography,
  CircularProgress,
  Box,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

import BodegaToolbar from '../components/bodegas/BodegaToolbar';
import BodegaTable from '../components/bodegas/BodegaTable';
import BodegaFormModal from '../components/bodegas/BodegaFormModal';

import { useAppDispatch } from '../../../global/store/store';
import { clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';

import { useBodegas } from '../hooks/useBodegas';

import type {
  Bodega,
  BodegaCreateData,
  BodegaUpdateData,
  BodegaFilters,
} from '../types/bodegaTypes';
import type { FilterConfig } from '../../../components/common/TableLayout';

type VistaTab = 'activos' | 'archivados' | 'todos';

const Bodegas: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // ✅ todo el I/O con el backend pasa por el hook
  const {
    list,
    loading,
    page,
    setPage,
    estado,
    setEstado,
    setFilters,
    meta,
    // CRUD
    create,
    update,
    remove,
    archivar,
    restaurar,
  } = useBodegas();

  // ⛳️ La lista principal NO debe mostrar breadcrumbs
  useEffect(() => {
    dispatch(clearBreadcrumbs());
    return () => {
      dispatch(clearBreadcrumbs());
    };
  }, [dispatch]);

  // Tabs sincronizados con el estado global
  const [tab, setTab] = useState<VistaTab>(estado as VistaTab);
  useEffect(() => { if (tab !== (estado as VistaTab)) setTab(estado as VistaTab); }, [estado]);
  useEffect(() => { if (tab !== estado) setEstado(tab); }, [tab]);

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bodega | null>(null);
  const [delDialog, setDelDialog] = useState<Bodega | null>(null);

  // spinner solo para la primera carga
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (!loading && !hasLoadedOnce.current) hasLoadedOnce.current = true;
  }, [loading]);

  // Filtros declarativos (TableLayout)
  const [nombreFiltro, setNombreFiltro] = useState<string | null>(null);
  const [ubicacionFiltro, setUbicacionFiltro] = useState<string | null>(null);

  const filterConfig: FilterConfig[] = useMemo(
    () => [
      { key: 'nombre',    label: 'Nombre',    type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', type: 'text' },
    ],
    []
  );

  const handleFilterChange = (f: Record<string, any>) => {
    const { nombre = null, ubicacion = null } = f;
    setNombreFiltro(nombre);
    setUbicacionFiltro(ubicacion);
    setFilters({
      nombre: nombre || undefined,
      ubicacion: ubicacion || undefined,
    } as Partial<BodegaFilters>);
  };

  const limpiarFiltros = () => {
    setNombreFiltro(null);
    setUbicacionFiltro(null);
    setFilters({});
  };

  // Meta/paginación
  const count    = meta?.count ?? 0;
  const pageSize = meta?.page_size ?? 10;
  const currPage = page ?? meta?.page ?? 1;

  const dataForTable = useMemo(() => list, [list]);

  // Crear / Editar
  const onCreate = () => { setEditTarget(null); setModalOpen(true); };
  const onEdit   = (b: Bodega) => { setEditTarget(b); setModalOpen(true); };

  const onSubmit = async (vals: BodegaCreateData | BodegaUpdateData) => {
    if (editTarget) {
      await update(editTarget.id, vals as BodegaUpdateData);
    } else {
      await create(vals as BodegaCreateData);
    }
    setModalOpen(false);
    setEditTarget(null);
  };

  // Archivar / Restaurar
  const onArchive = async (b: Bodega) => { await archivar(b.id); };
  const onRestore = async (b: Bodega) => { await restaurar(b.id); };

  // Eliminar
  const onDelete = (b: Bodega) => setDelDialog(b);
  const confirmDelete = async () => {
    if (!delDialog) return;
    try {
      await remove(delDialog.id);
    } finally {
      setDelDialog(null);
    }
  };

  const onPageChange = (next: number) => setPage(next);

  // primera carga
  if (!hasLoadedOnce.current) {
    return (
      <Box className="flex justify-center p-12">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <Paper elevation={4} className="p-6 sm:px-10 sm:pb-8 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Bodegas
        </Typography>

        {/* Toolbar (botón Nuevo) */}
        <BodegaToolbar onOpen={onCreate} />

        {/* Tabs de estado */}
        <Tabs
          value={tab}
          onChange={(_, v: VistaTab) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="activos" label="Activas" />
          <Tab value="archivados" label="Archivadas" />
          <Tab value="todos"     label="Todas" />
        </Tabs>

        {/* Tabla + filtros */}
        <Box sx={{ position: 'relative', width: '100%' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          <BodegaTable
            data={dataForTable}
            page={currPage}
            pageSize={pageSize}
            count={count}
            onPageChange={onPageChange}
            loading={loading}
            emptyMessage={
              dataForTable.length
                ? ''
                : tab === 'activos'
                ? 'No hay bodegas activas.'
                : tab === 'archivados'
                ? 'No hay bodegas archivadas.'
                : 'No hay bodegas registradas.'
            }
            filterConfig={filterConfig}
            filterValues={{ nombre: nombreFiltro, ubicacion: ubicacionFiltro }}
            onFilterChange={handleFilterChange}
            limpiarFiltros={limpiarFiltros}
            // Acciones fila
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={onDelete}
            onView={(b) => {
              // ⤴️ mantenemos la semántica de URL con nombre/ubicación
              const params = new URLSearchParams();
              if (b.nombre) params.set('bodega_nombre', b.nombre);
              if (b.ubicacion) params.set('bodega_ubicacion', b.ubicacion);
              const query = params.toString();
              navigate(query ? `/bodega/${b.id}/temporadas?${query}` : `/bodega/${b.id}/temporadas`);
            }}
          />
        </Box>

        {/* Modal de crear/editar */}
        <BodegaFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={onSubmit}
          isEdit={Boolean(editTarget)}
          initialValues={editTarget || undefined}
        />

        {/* Confirmación de eliminación */}
        <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta bodega permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialog(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Bodegas;
