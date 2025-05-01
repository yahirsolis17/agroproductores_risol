// src/modules/gestion_huerta/pages/Huertas.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Paper, Typography, CircularProgress,
  Box, Tabs, Tab,
} from '@mui/material';

import { useHuertas }      from '../hooks/useHuertas';
import { usePropietarios } from '../hooks/usePropietarios';

import HuertaToolbar        from '../components/huerta/HuertaToolBar';
import HuertaTable          from '../components/huerta/HuertaTable';
import HuertaFormModal      from '../components/huerta/HuertaFormModal';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

import {
  HuertaCreateData,
  Huerta as HuertaType,
} from '../types/huertaTypes';
import { PropietarioCreateData } from '../types/propietarioTypes';
import { huertaService }         from '../services/huertaService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

/* ─────────────────── Config ─────────────────── */
type ViewFilter = 'activas' | 'archivadas' | 'todas';
const pageSize = 10;

/* ───────────────── Componente ───────────────── */
const Huertas: React.FC = () => {
  /* ------------ UI State ------------ */
  const [filter, setFilter] = useState<ViewFilter>('activas');

  /* Modales alta / edición */
  const [openNew, setOpenNew] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HuertaType | null>(null);

  /* Modal alta propietario (desde autocomplete) */
  const [openPropModal, setOpenPropModal] = useState(false);
  const [defaultPropId, setDefaultPropId] = useState<number>();

  /* ------------ Datos (hooks) ------------ */
  const {
    huertas, loading: loadHuertas, page, setPage,
    addHuerta, editHuerta, fetchHuertas, toggleActivoLocal,
  } = useHuertas();

  const {
    propietarios, loading: loadProps,
    addPropietario, fetchPropietarios,
  } = usePropietarios();

  /* Loader suave */
  const [delayedLoading, setDelayedLoading] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (loadHuertas || loadProps) t = setTimeout(() => setDelayedLoading(true), 300);
    else                          setDelayedLoading(false);
    return () => { if (t) clearTimeout(t); };
  }, [loadHuertas, loadProps]);

  /* ------------ CRUD ------------ */
  /* Alta huerta */
  const saveNewHuerta = async (vals: HuertaCreateData) => {
    await addHuerta(vals); await fetchHuertas(); setOpenNew(false);
  };

  /* Edición huerta */
  const launchEdit = (h: HuertaType) => { setEditTarget(h); setEditOpen(true); };
  const saveEditHuerta = async (vals: HuertaCreateData) => {
    if (!editTarget) return;
    await editHuerta(editTarget.id, vals); setEditOpen(false);
  };

  /* Archivado / restauración (optimista) */
  const archive = async (id: number) => {
    toggleActivoLocal(id, false);
    try { handleBackendNotification(await huertaService.archivar(id)); }
    catch (e:any){ toggleActivoLocal(id,true); handleBackendNotification(e.response?.data); }
  };
  const restore = async (id: number) => {
    toggleActivoLocal(id, true);
    try { handleBackendNotification(await huertaService.restaurar(id)); }
    catch (e:any){ toggleActivoLocal(id,false); handleBackendNotification(e.response?.data); }
  };

  /* Delete */
  const remove = async (id: number) => {
    try { handleBackendNotification(await huertaService.delete(id)); await fetchHuertas(); }
    catch(e:any){ handleBackendNotification(e.response?.data); }
  };

  /* Alta propietario inline */
  const saveNewProp = async (vals: PropietarioCreateData) => {
    const p = await addPropietario(vals);
    await fetchPropietarios();
    setDefaultPropId(p.id);
    return p;
  };

  /* ------------ Filtro & mensajes ------------ */
  const filtered = huertas.filter(h =>
    filter === 'activas'     ?  h.is_active :
    filter === 'archivadas'  ? !h.is_active :
    true
  );

  const emptyMsg =
    filter === 'activas'      ? 'No hay huertas activas.'     :
    filter === 'archivadas'   ? 'No hay huertas archivadas.'  :
                                'No hay huertas registradas.';

  /* ------------ Render ------------ */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto"
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Huertas
        </Typography>

        <HuertaToolbar onOpen={() => setOpenNew(true)} />

        <Tabs value={filter} onChange={(_,v)=>setFilter(v)}
              textColor="primary" indicatorColor="primary" sx={{ mb:2 }}>
          <Tab value="activas"    label="Activas"/>
          <Tab value="archivadas" label="Archivadas"/>
          <Tab value="todas"      label="Todas"/>
        </Tabs>

        {delayedLoading ? (
          <Box display="flex" justifyContent="center" mt={6}><CircularProgress/></Box>
        ) : (
          <HuertaTable
            data={filtered}
            page={page}
            pageSize={pageSize}
            count={filtered.length}
            onPageChange={setPage}
            emptyMessage={emptyMsg}
            onEdit={launchEdit}
            onArchive={archive}
            onRestore={restore}
            onDelete={remove}
          />
        )}

        {/* ----- Modal ALTA Huerta ----- */}
        <HuertaFormModal
          open={openNew}
          onClose={()=>setOpenNew(false)}
          onSubmit={saveNewHuerta}
          propietarios={propietarios}
          onRegisterNewPropietario={()=>setOpenPropModal(true)}
          defaultPropietarioId={defaultPropId}
        />

        {/* ----- Modal EDICIÓN Huerta ----- */}
        <HuertaFormModal
          open={editOpen}
          onClose={()=>setEditOpen(false)}
          onSubmit={saveEditHuerta}
          propietarios={propietarios}
          onRegisterNewPropietario={()=>setOpenPropModal(true)}
          isEdit
          initialValues={
            editTarget ? {
              nombre: editTarget.nombre,
              ubicacion: editTarget.ubicacion,
              variedades: editTarget.variedades,
              historial: editTarget.historial ?? undefined,
              hectareas: editTarget.hectareas,
              propietario: editTarget.propietario,
            } : undefined
          }
        />

        {/* ----- Modal ALTA Propietario (inline) ----- */}
        <PropietarioFormModal
          open={openPropModal}
          onClose={()=>setOpenPropModal(false)}
          onSubmit={saveNewProp}
        />
      </Paper>
    </motion.div>
  );
};

export default Huertas;
