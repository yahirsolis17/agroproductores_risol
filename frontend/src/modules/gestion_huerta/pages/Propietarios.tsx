import React from 'react';
import {
  Paper, Typography, CircularProgress, Box,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Tabs, Tab,
} from '@mui/material';
import { motion } from 'framer-motion';

import PropietarioToolbar   from '../components/propietario/PropietarioToolbar';
import PropietarioTable     from '../components/propietario/PropietarioTable';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

import { usePropietarios }  from '../hooks/usePropietarios';
import { useHuertas }       from '../hooks/useHuertas';
import { PropietarioCreateData, Propietario as T } from '../types/propietarioTypes';

const pageSize = 10;
type Estado = 'activos' | 'archivados' | 'todos';

const Propietarios:React.FC=()=>{
  const {
    propietarios, loading, meta, page,
    setPage, estado, setEstado,
    addPropietario, editPropietario,
    archivarPropietario, restaurarPropietario,
    removePropietario,
  }=usePropietarios();

  const { fetchHuertas } = useHuertas();

  /* --- UI local --- */
  const [editOpen,setEditOpen]=React.useState(false);
  const [editTarget,setEditTarget]=React.useState<T|null>(null);
  const [confirmOpen,setConfirm]=React.useState(false);
  const [confirmId,setConfirmId]=React.useState<number>();

  /* --- CRUD helpers --- */
  const handleCreate=async(p:PropietarioCreateData)=>{
    await addPropietario(p); await fetchHuertas();
  };
  const handleEditSubmit=async(vals:PropietarioCreateData)=>{
    if(!editTarget) return;
    await editPropietario(editTarget.id,vals); setEditOpen(false);
  };
  const launchEdit=(p:T)=>{ setEditTarget(p); setEditOpen(true); };
  const handleArchiveOrRestore=async(id:number,isArch:boolean)=>{
    isArch ? await restaurarPropietario(id) : await archivarPropietario(id);
    await fetchHuertas();
  };
  const askDelete=(id:number)=>{ setConfirmId(id); setConfirm(true); };
  const confirmDel=async()=>{
    if(confirmId!==undefined){ await removePropietario(confirmId); await fetchHuertas(); }
    setConfirm(false);
  };

  /* --- textos --- */
  const emptyMessage =
    estado==='activos'   ? 'No hay propietarios activos.'
  : estado==='archivados'? 'No hay propietarios archivados.'
                         : 'No hay propietarios registrados.';

  return(
    <motion.div className="p-6 max-w-6xl mx-auto"
      initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.4}}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Propietarios
        </Typography>

        <PropietarioToolbar onCreate={handleCreate}/>

        <Tabs value={estado} onChange={(_,v)=>setEstado(v as Estado)}
              textColor="primary" indicatorColor="primary" sx={{mt:1,mb:1}}>
          <Tab value="activos"    label="Activos"/>
          <Tab value="archivados" label="Archivados"/>
          <Tab value="todos"      label="Todos"/>
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}><CircularProgress/></Box>
        ) : (
          <PropietarioTable
            data={propietarios}
            page={page}
            pageSize={pageSize}
            count={meta.count}
            serverSidePagination
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
        open={editOpen} onClose={()=>setEditOpen(false)} onSubmit={handleEditSubmit}
        isEdit initialValues={editTarget ? {
          nombre:editTarget.nombre, apellidos:editTarget.apellidos,
          telefono:editTarget.telefono, direccion:editTarget.direccion,
        }:undefined}
      />

      {/* Confirm delete */}
      <Dialog open={confirmOpen} onClose={()=>setConfirm(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Eliminar propietario definitivamente?</DialogContent>
        <DialogActions>
          <Button onClick={()=>setConfirm(false)}>Cancelar</Button>
          <Button color="error" onClick={confirmDel}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default Propietarios;
