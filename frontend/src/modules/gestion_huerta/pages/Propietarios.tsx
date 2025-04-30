// modules/gestion_huerta/pages/Propietarios.tsx
import React, { useState } from 'react';
import {
  Paper, Typography, CircularProgress, Box,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Tabs, Tab,
} from '@mui/material';
import { motion } from 'framer-motion';
import PropietarioToolbar from '../components/propietario/PropietarioToolbar';
import PropietarioTable from '../components/propietario/PropietarioTable';
import { usePropietarios } from '../hooks/usePropietarios';
import { PropietarioCreateData } from '../types/propietarioTypes';

type ViewFilter = 'activos' | 'archivados' | 'todos';
const pageSize = 10;

const Propietarios: React.FC = () => {
  const {
    propietarios,
    loading,
    page,
    setPage,
    addPropietario,
    archivarPropietario,
    restaurarPropietario,
    removePropietario,
  } = usePropietarios();

  const [filter, setFilter] = useState<ViewFilter>('activos');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  /* ---------- CRUD ---------- */
  const handleCreate = async (p: PropietarioCreateData) => { await addPropietario(p); };
  const handleArchiveOrRestore = (id: number, isArchived: boolean) =>
    isArchived ? restaurarPropietario(id) : archivarPropietario(id);
  const handleDeleteAsk = (id: number) => { setConfirmId(id); setConfirmOpen(true); };
  const confirmDelete   = () => confirmId && removePropietario(confirmId).finally(() => setConfirmOpen(false));

  /* ---------- filtrado ---------- */
  const filtered = propietarios.filter(p =>
    filter === 'activos'     ? !p.archivado_en :
    filter === 'archivados'  ?  p.archivado_en :
    true
  );

  const emptyMessage =
    filter === 'activos'     ? 'No hay propietarios activos.'
    : filter === 'archivados'? 'No hay propietarios archivados.'
    :                         'No hay propietarios registrados.';

  /* ---------- render ---------- */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Propietarios
        </Typography>

        <PropietarioToolbar onCreate={handleCreate} />

        <Tabs value={filter} onChange={(_,v)=>setFilter(v)}
              textColor="primary" indicatorColor="primary" sx={{ mt:1, mb:1 }}>
          <Tab label="Activos"     value="activos"    />
          <Tab label="Archivados"  value="archivados" />
          <Tab label="Todos"       value="todos"      />
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
        ) : (
          <PropietarioTable
            data={filtered}
            page={page}
            pageSize={pageSize}
            count={filtered.length}
            onPageChange={setPage}
            onArchiveOrRestore={handleArchiveOrRestore}
            onDelete={handleDeleteAsk}
            emptyMessage={emptyMessage}
          />
        )}
      </Paper>

      {/* Confirm Delete */}
      <Dialog open={confirmOpen} onClose={()=>setConfirmOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Eliminar propietario definitivamente?</DialogContent>
        <DialogActions>
          <Button onClick={()=>setConfirmOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={confirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default Propietarios;
