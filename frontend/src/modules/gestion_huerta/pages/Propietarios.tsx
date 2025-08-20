// src/modules/gestion_huerta/pages/Propietarios.tsx
/* eslint-disable react-hooks/exhaustive-deps */
/* ──────────────────────────────────────────────────────────────
 *  src/modules/gestion_huerta/pages/Propietarios.tsx
 * ── Tabla con paginación + filtros backend + filtro local “autocomplete”
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
import { propietarioService } from '../services/propietarioService';
import {
  PropietarioCreateData,
  Propietario as PropietarioT,
} from '../types/propietarioTypes';

/* ──────────────────────────────────────────────────────────────
 *  Constantes
 * ──────────────────────────────────────────────────────────── */
import type { Estado } from '../../../global/store/propietariosSlice';
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
    filters, 
    refetch,
  } = usePropietarios();

  /* ──────────────────────────────────────────────────────────────
   *  Filtro “autocomplete” local enviado al backend
   * ──────────────────────────────────────────────────────────── */
  // Opciones de filtro autocomplete por id (como en huertas), ORDENADAS ALFABÉTICAMENTE
  const nombreOptions = propietarios
    .map((p) => ({
      label: `${p.nombre} ${p.apellidos} - ${p.telefono}`,
      value: p.id,
      firstLetter: p.nombre[0].toUpperCase(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));

  // Filtro exacto por id (como en huertas)
const handleFilterChange = (filters: Record<string, any>) => {
  if (import.meta.env.DEV) {
    console.log('[UI] handleFilterChange - Filtros recibidos:', filters);
  }
  if (filters.id) {
    if (import.meta.env.DEV) {
      console.log('[UI] Filtro por id detectado:', filters.id);
    }
    changeFilters({ id: filters.id });
    return;
  }
  if (filters.nombre) {
    const selected = nombreOptions.find((opt) => opt.label === filters.nombre);
    if (selected) {
      if (import.meta.env.DEV) {
        console.log('[UI] Filtro seleccionado:', selected.value);
      }
      changeFilters({ id: selected.value });
      return;
    }
  }
  if (import.meta.env.DEV) {
    console.log('[UI] Limpiando filtros (no hay id ni nombre seleccionado)');
  }
  changeFilters({});
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

  // Log cuando se llama a changeFilters desde el componente
  const onChangeFilters = (filters: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.log('[UI] onChangeFilters (llamando a handleFilterChange):', filters);
    }
    handleFilterChange(filters);
  };

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
          onChange={(_, v) => {
            const next = v as Estado;
            // Si cambiamos entre Activos ⇄ Archivados, limpiamos filtros:
            if (
              (estado === 'activos' && next === 'archivados') ||
              (estado === 'archivados' && next === 'activos')
            ) {
              changeFilters({});
            }
            // Finalmente, cambiamos de tab:
            changeEstado(next);
          }}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2 }}
        >
          
          <Tab value="activos"    label="Activos" />
          <Tab value="archivados" label="Archivados" />
          <Tab value="todos"      label="Todos" />

        </Tabs>
            <Button
            variant="outlined"
            onClick={() => {
              changeFilters({});
              changePage(1);
            }}
          >
            Limpiar filtros
          </Button>
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
            filterValues={filters}
            filterConfig={[
              {
                key: 'id',
                label: 'Propietario',
                type: 'autocomplete-async',
                width: 320,
loadOptions: async (input: string) => {
  // 1) si es solo dígitos → precarga por ID
  if (/^\d+$/.test(input)) {
    const p = await propietarioService.fetchById(input);
    return p
      ? [{ label: `${p.nombre} ${p.apellidos} – ${p.telefono}`, value: p.id }]
      : [];
  }
  // 2) si es texto → búsqueda normal
  const lista = await propietarioService.search(input);
  return lista.map((p) => ({
    label: `${p.nombre} ${p.apellidos} – ${p.telefono}`,
    value:  p.id,
  }));
},
              },
            ]}
              
            onFilterChange={onChangeFilters}
            applyFiltersInternally={false}
            onPageChange={(p) => {
              if (import.meta.env.DEV) {
                console.log('[UI] Cambio de página:', p);
              }
              changePage(p);
            }}
            onEdit={(p) => {
              if (import.meta.env.DEV) {
                console.log('[UI] Editar propietario:', p);
              }
              launchEdit(p);
            }}
            onArchiveOrRestore={(id, archivado) => {
              if (import.meta.env.DEV) {
                console.log('[UI] Archivar/Restaurar propietario:', { id, archivado });
              }
              handleArchiveOrRestore(id, archivado);
            }}
            onDelete={(id) => {
              if (import.meta.env.DEV) {
                console.log('[UI] Eliminar propietario:', id);
              }
              askDelete(id);
            }}
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
