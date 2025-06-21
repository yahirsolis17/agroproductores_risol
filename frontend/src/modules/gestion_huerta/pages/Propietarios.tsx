/* eslint-disable react-hooks/exhaustive-deps */
/* ──────────────────────────────────────────────────────────────
 *  src/modules/gestion_huerta/pages/Propietarios.tsx
 * ─ Tabla con paginación + filtros backend + filtro local “autocomplete”
 * ──────────────────────────────────────────────────────────── */
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { motion } from 'framer-motion';

import PropietarioToolbar   from '../components/propietario/PropietarioToolbar';
import PropietarioTable     from '../components/propietario/PropietarioTable';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

import { usePropietarios } from '../hooks/usePropietarios';
import {
  PropietarioCreateData,
  Propietario as PropietarioT,
} from '../types/propietarioTypes';

/* ──────────────────────────────────────────────────────────────
 *  Constantes
 * ──────────────────────────────────────────────────────────── */
type Estado = 'activos' | 'archivados' | 'todos';
const pageSize = 10;

/* ──────────────────────────────────────────────────────────────
 *  Componente principal
 * ──────────────────────────────────────────────────────────── */
const Propietarios: React.FC = () => {
  const {
    propietarios,
    loading,
    meta,
    page,
    estado,
    changePage,
    changeEstado,
    changeFilters,      // ← thunk para enviar filtros al backend
    addPropietario,
    editPropietario,
    archivePropietario,
    restorePropietario,
    removePropietario,
    refetch,
  } = usePropietarios();

  /* ──────────────────────────────────────────────────────────────
   *  Filtro “autocomplete” local enviado al backend
   * ──────────────────────────────────────────────────────────── */
  // preparamos las opciones únicas de nombre
  const nombreOptions = propietarios.map((p) => ({
    label: `${p.nombre} ${p.apellidos} - ${p.telefono}`,
    value: p.nombre, // el filtro sigue aplicando solo por nombre, esto no cambia
  }));
  // cuando el usuario selecciona un nombre, lo mandamos como filtro “search”
  const handleFilterChange = (filters: Record<string, any>) => {
    changeFilters({ search: filters.nombre || '' });
  };

  /* ──────────────────────────────────────────────────────────────
   *  UI local (modales, confirmaciones, spinner diferido)
   * ──────────────────────────────────────────────────────────── */
  const [editOpen,   setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<PropietarioT | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId,   setConfirmId]   = useState<number>(0);

  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    let t: any;
    if (loading) t = setTimeout(() => setShowSpinner(true), 250);
    else         setShowSpinner(false);
    return () => clearTimeout(t);
  }, [loading]);

  /* ──────────────────────────────────────────────────────────────
   *  CRUD helpers
   * ──────────────────────────────────────────────────────────── */
  const handleCreate = async (p: PropietarioCreateData) => {
    await addPropietario(p);
    refetch();
  };
  const handleEditSubmit = async (vals: PropietarioCreateData) => {
    if (!editTarget) return;
    await editPropietario(editTarget.id, vals);
    setEditOpen(false);
  };
  const launchEdit = (p: PropietarioT) => {
    setEditTarget(p);
    setEditOpen(true);
  };
  const handleArchiveOrRestore = async (id: number, archivado: boolean) => {
    if (archivado) await restorePropietario(id);
    else           await archivePropietario(id);
    refetch();
  };
  const askDelete = (id: number) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };
  const confirmDelete = async () => {
    await removePropietario(confirmId);
    refetch();
    setConfirmOpen(false);
  };

  const emptyMsg =
    estado === 'activos'
      ? 'No hay propietarios activos.'
      : estado === 'archivados'
      ? 'No hay propietarios archivados.'
      : 'No hay propietarios registrados.';

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white shadow-lg">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Propietarios
        </Typography>

        {/* Toolbar de alta rápida */}
        <PropietarioToolbar onCreate={handleCreate} />

        {/* ──────────────── Tabs de estado ──────────────── */}
        <Tabs
          value={estado}
          onChange={(_, v) => changeEstado(v as Estado)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="activos"    label="Activos" />
          <Tab value="archivados" label="Archivados" />
          <Tab value="todos"      label="Todos" />
        </Tabs>

        {/* ────────────── Tabla con filtro autocomplete ────────────── */}
        {showSpinner ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <PropietarioTable
            data={propietarios}
            page={page}
            pageSize={pageSize}
            count={meta.count}
            serverSidePagination

            /** ↓↓↓ aquí van los filtros dinámicos ↓↓↓ */
            filterConfig={[
              {
                key: 'nombre',
                label: 'Nombre',
                type: 'autocomplete',
                options: nombreOptions,
                width: 320,
              },
            ]}
            onFilterChange={handleFilterChange}
            applyFiltersInternally={false}  // seguimos paginando + filtrando por backend

            onPageChange={changePage}
            onEdit={launchEdit}
            onArchiveOrRestore={handleArchiveOrRestore}
            onDelete={askDelete}
            emptyMessage={emptyMsg}
            loading={loading}
          />
        )}
      </Paper>

      {/* ─────────── Modal edición ─────────── */}
      <PropietarioFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        isEdit
        initialValues={
          editTarget
            ? {
                nombre:    editTarget.nombre,
                apellidos: editTarget.apellidos,
                telefono:  editTarget.telefono,
                direccion: editTarget.direccion,
              }
            : undefined
        }
        onSubmit={handleEditSubmit}
      />

      {/* ───────── Confirmación de borrado ───────── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Eliminar propietario definitivamente?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={confirmDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default Propietarios;
