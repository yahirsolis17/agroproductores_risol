// src/modules/gestion_huerta/pages/Propietarios.tsx
import React, { useState } from 'react';
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

import PropietarioToolbar from '../components/propietario/PropietarioToolbar';
import PropietarioTable from '../components/propietario/PropietarioTable';
import { usePropietarios } from '../hooks/usePropietarios';
import { PropietarioCreateData } from '../types/propietarioTypes';
import { propietarioService } from '../services/propietarioService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

type ViewFilter = 'activos' | 'archivados' | 'todos';

const Propietarios: React.FC = () => {
  const {
    propietarios,
    loading,
    page,
    setPage,
    addPropietario,
    fetchPropietarios,
  } = usePropietarios();

  const [filter, setFilter] = useState<ViewFilter>('activos');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  /* ---------- CRUD helpers ---------- */
  const handleCreate = async (payload: PropietarioCreateData) => {
    await addPropietario(payload);
    await fetchPropietarios();
  };

  const handleArchiveOrRestore = async (id: number, isArchived: boolean) => {
    try {
      const res = isArchived
        ? await propietarioService.restore(id)
        : await propietarioService.archive(id);
      handleBackendNotification(res);
      await fetchPropietarios();
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (confirmId == null) return;
    try {
      const res = await propietarioService.delete(confirmId);
      handleBackendNotification(res);
      await fetchPropietarios();
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    } finally {
      setConfirmOpen(false);
    }
  };

  /* ---------- filtrado ---------- */
  const pageSize = 10;

  const filtered = propietarios.filter((p) => {
    if (filter === 'activos') return !p.archivado_en;
    if (filter === 'archivados') return Boolean(p.archivado_en);
    return true; // todos
  });

  /* ---------- mensaje vacío según pestaña ---------- */
  const emptyMessage =
    filter === 'activos'
      ? 'No hay propietarios activos.'
      : filter === 'archivados'
      ? 'No hay propietarios archivados .'
      : 'No hay propietarios registrados.';

  /* ---------- render ---------- */
  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper
        elevation={4}
        className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white"
      >
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Propietarios
        </Typography>

        <PropietarioToolbar onCreate={handleCreate} />

        {/* Tabs pegadas a la cabecera de la tabla */}
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mt: 1, mb: 1 }}
        >
          <Tab label="Activos" value="activos" />
          <Tab label="Archivados" value="archivados" />
          <Tab label="Todos" value="todos" />
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <PropietarioTable
            data={filtered}
            page={page}
            pageSize={pageSize}
            count={filtered.length}
            onPageChange={setPage}
            onArchiveOrRestore={handleArchiveOrRestore}
            onDelete={handleDelete}
            emptyMessage={emptyMessage}   /* ← Aquí va el mensaje */
          />
        )}
      </Paper>

      {/* confirm delete */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que deseas eliminar este propietario?
        </DialogContent>
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
