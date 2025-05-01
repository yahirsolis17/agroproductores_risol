import React, { useState } from 'react';
import {
  Paper, Typography, CircularProgress, Box,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Tabs, Tab,
} from '@mui/material';
import { motion } from 'framer-motion';

import PropietarioToolbar  from '../components/propietario/PropietarioToolbar';
import PropietarioTable    from '../components/propietario/PropietarioTable';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

import { usePropietarios } from '../hooks/usePropietarios';
import { useHuertas }      from '../hooks/useHuertas';

import {
  PropietarioCreateData,
  Propietario as PropietarioType,
} from '../types/propietarioTypes';

type ViewFilter = 'activos' | 'archivados' | 'todos';
const pageSize = 10;

const Propietarios: React.FC = () => {
  /* -------- hooks de datos -------- */
  const {
    propietarios,
    loading,
    page,
    setPage,
    addPropietario,
    editPropietario,
    archivarPropietario,
    restaurarPropietario,
    removePropietario,
  } = usePropietarios();

  const { fetchHuertas } = useHuertas();   // mantener badges de Propietario en Huertas

  /* -------- UI state -------- */
  const [filter, setFilter]       = useState<ViewFilter>('activos');
  const [confirmOpen, setConfirm] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [editOpen, setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<PropietarioType | null>(null);

  /* -------- CRUD helpers -------- */
  const handleCreate = async (p: PropietarioCreateData) => {
    await addPropietario(p);
    await fetchHuertas();
  };

  const handleEditSubmit = async (vals: PropietarioCreateData) => {
    if (!editTarget) return;
    await editPropietario(editTarget.id, vals);
    setEditOpen(false);
  };

  const launchEdit = (p: PropietarioType) => {
    setEditTarget(p);
    setEditOpen(true);
  };

  const handleArchiveOrRestore = async (id: number, isArchived: boolean) => {
    if (isArchived) await restaurarPropietario(id);
    else            await archivarPropietario(id);
    await fetchHuertas();
  };

  const askDelete     = (id: number) => { setConfirmId(id); setConfirm(true); };
  const confirmDelete = async () => {
    if (confirmId == null) return;
    await removePropietario(confirmId);
    await fetchHuertas();
    setConfirm(false);
  };

  /* -------- filtrado + mensajes -------- */
  const filtered = propietarios.filter(p =>
    filter === 'activos'     ? !p.archivado_en :
    filter === 'archivados'  ?  p.archivado_en :
    true
  );

  const emptyMessage =
    filter === 'activos'      ? 'No hay propietarios activos.'
    : filter === 'archivados' ? 'No hay propietarios archivados.'
    :                          'No hay propietarios registrados.';

  /* -------- render -------- */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto"
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Propietarios
        </Typography>

        <PropietarioToolbar onCreate={handleCreate} />

        <Tabs value={filter} onChange={(_,v)=>setFilter(v)}
              textColor="primary" indicatorColor="primary" sx={{ mt:1, mb:1 }}>
          <Tab value="activos"     label="Activos"/>
          <Tab value="archivados"  label="Archivados"/>
          <Tab value="todos"       label="Todos"/>
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress/>
          </Box>
        ) : (
          <PropietarioTable
            data={filtered}
            page={page}
            pageSize={pageSize}
            count={filtered.length}
            onPageChange={setPage}
            onEdit={launchEdit}
            onArchiveOrRestore={handleArchiveOrRestore}
            onDelete={askDelete}
            emptyMessage={emptyMessage}
          />
        )}
      </Paper>

      {/* Modal edición */}
      <PropietarioFormModal
        open={editOpen}
        onClose={()=>setEditOpen(false)}
        onSubmit={handleEditSubmit}
        isEdit
        initialValues={editTarget ? {
          nombre:    editTarget.nombre,
          apellidos: editTarget.apellidos,
          telefono:  editTarget.telefono,
          direccion: editTarget.direccion,
        } : undefined}
      />

      {/* Confirm delete */}
      <Dialog open={confirmOpen} onClose={()=>setConfirm(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Eliminar propietario definitivamente?</DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirm(false)}>Cancelar</Button>
          <Button color="error" onClick={confirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default Propietarios;
