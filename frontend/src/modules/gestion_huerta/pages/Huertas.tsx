/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Paper, Typography, CircularProgress, Box,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';

import { useHuertasCombinadas } from '../hooks/useHuertasCombinadas';
import { usePropietarios }      from '../hooks/usePropietarios';

import HuertaToolbar        from '../components/huerta/HuertaToolBar';
import HuertaTable          from '../components/huerta/HuertaTable';
import HuertaModalTabs      from '../components/huerta/HuertaModalTabs';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

import { HuertaCreateData }        from '../types/huertaTypes';
import { HuertaRentadaCreateData } from '../types/huertaRentadaTypes';
import { PropietarioCreateData }   from '../types/propietarioTypes';

import { huertaService }        from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { isRentada } from '../utils/huertaTypeGuards';

type ViewFilter = 'activas' | 'archivadas' | 'todas';
const pageSize = 10;

const Huertas: React.FC = () => {
  const [filter, setFilter] = useState<ViewFilter>('activas');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] =
    useState<{ tipo: 'propia' | 'rentada'; data: any } | null>(null);

  const [delDialog, setDelDialog] = useState<{ id: number; tipo: 'propia' | 'rentada' } | null>(null);
  const [propModal, setPropModal] = useState(false);

  /* datos */
  const { huertas, loading, page, setPage,
          add, edit, toggleLocal, fetchAll } = useHuertasCombinadas();

  const { propietarios, loading: loadProps,
          addPropietario, fetchPropietarios } = usePropietarios();

  /* loader suave */
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    let t: any;
    if (loading || loadProps) t = setTimeout(() => setSpin(true), 300);
    else setSpin(false);
    return () => clearTimeout(t);
  }, [loading, loadProps]);

  /* alta */
  const savePropia  = async (v: HuertaCreateData)        => { await add(v, 'propia');  await fetchAll(); };
  const saveRentada = async (v: HuertaRentadaCreateData) => { await add(v, 'rentada'); await fetchAll(); };

  /* edición */
  const launchEdit = (h: any) => {
    setEditTarget({ tipo: isRentada(h) ? 'rentada' : 'propia', data: h });
    setModalOpen(true);                    // ← ¡esto faltaba!
  };
  
  const saveEdit = async (vals: any) => {
    if (!editTarget) return;
    await edit(editTarget.data.id, vals, editTarget.tipo);
    setModalOpen(false);
  };

  /* archivar/restaurar */
  const svc = (t:'propia'|'rentada') => t==='propia'? huertaService: huertaRentadaService;

  const toggleArchivado = async (h: any, nuevo: boolean) => {
    const t = isRentada(h) ? 'rentada' : 'propia';
    toggleLocal(h.id, nuevo, t);
  
    try {
      const res = nuevo
        ? await svc(t).restaurar(h.id)
        : await svc(t).archivar(h.id);
  
      handleBackendNotification(res);  // ✅ Aquí se muestra la noti
    } catch (e: any) {
      toggleLocal(h.id, !nuevo, t);
      handleBackendNotification(e.response?.data);
    }
  };
  

  /* delete */
  const askDelete = (h:any)=> setDelDialog({id:h.id,tipo:isRentada(h)?'rentada':'propia'});
  const confirmDelete = async () => {
    if(!delDialog) return;
    try{
      handleBackendNotification(await svc(delDialog.tipo).delete(delDialog.id));
      await fetchAll();
    }finally{ setDelDialog(null);}
  };

  /* alta propietario inline */
  const saveNewProp = async (v:PropietarioCreateData)=>{
    await addPropietario(v);
    await fetchPropietarios();
  };

  /* filtro activo */
  const rows = huertas.filter(h =>
    filter==='activas'?  h.is_active:
    filter==='archivadas'? !h.is_active: true);

  const empty =
    filter==='activas'?    'No hay huertas activas.':
    filter==='archivadas'? 'No hay huertas archivadas.':
                            'No hay huertas registradas.';

  /* render */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto"
      initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.4}}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Huertas
        </Typography>

        <HuertaToolbar onOpen={()=>{ setEditTarget(null); setModalOpen(true); }} />

        <Tabs value={filter} onChange={(_,v)=>setFilter(v)}
              textColor="primary" indicatorColor="primary" sx={{mb:2}}>
          <Tab value="activas"    label="Activas"/>
          <Tab value="archivadas" label="Archivadas"/>
          <Tab value="todas"      label="Todas"/>
        </Tabs>

        {spin ? (
          <Box display="flex" justifyContent="center" mt={6}><CircularProgress/></Box>
        ) : (
          <HuertaTable
            data={rows}
            page={page}
            pageSize={pageSize}
            count={rows.length}
            onPageChange={(n)=>setPage(n)}
            emptyMessage={empty}
            onEdit={launchEdit}
            onArchive={(h)=>toggleArchivado(h,false)}
            onRestore={(h)=>toggleArchivado(h,true)}
            onDelete={askDelete}
          />
        )}

        {/* modal alta/edición */}
        <HuertaModalTabs
          open={modalOpen}
          onClose={()=>setModalOpen(false)}
          onSubmitPropia={editTarget?.tipo==='propia'? saveEdit: savePropia}
          onSubmitRentada={editTarget?.tipo==='rentada'? saveEdit: saveRentada}
          propietarios={propietarios}
          onRegisterNewPropietario={()=>setPropModal(true)}
          editTarget={editTarget||undefined}
        />

        {/* propietario inline */}
        <PropietarioFormModal
          open={propModal}
          onClose={()=>setPropModal(false)}
          onSubmit={saveNewProp}
        />

        {/* confirm delete */}
        <Dialog open={Boolean(delDialog)} onClose={()=>setDelDialog(null)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta huerta permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={()=>setDelDialog(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Huertas;
