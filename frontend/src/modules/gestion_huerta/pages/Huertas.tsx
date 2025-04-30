// src/modules/gestion_huerta/pages/Huertas.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Paper, Typography, CircularProgress, Box, Tabs, Tab,
} from '@mui/material';

import { useHuertas } from '../hooks/useHuertas';
import { usePropietarios } from '../hooks/usePropietarios';

import HuertaToolbar       from '../components/huerta/HuertaToolBar';
import HuertaTable         from '../components/huerta/HuertaTable';
import HuertaFormModal     from '../components/huerta/HuertaFormModal';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

import { HuertaCreateData }      from '../types/huertaTypes';
import { PropietarioCreateData } from '../types/propietarioTypes';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import { huertaService } from '../services/huertaService';

type ViewFilter = 'activas' | 'archivadas' | 'todas';
const pageSize = 10;

const Huertas: React.FC = () => {
  /* ---------- state ---------- */
  const [openHuertaModal, setOpenHuertaModal] = useState(false);
  const [openPropModal,   setOpenPropModal]   = useState(false);
  const [defaultPropId,   setDefaultPropId]   = useState<number>();
  const [filter,          setFilter]          = useState<ViewFilter>('activas');
  const [delayedLoading,  setDelayedLoading]  = useState(false);

  /* ---------- hooks ---------- */
  const {
    huertas, loading: loadingHuerta, page, setPage,
    addHuerta, fetchHuertas, toggleActivoLocal,
  } = useHuertas();

  const {
    propietarios, loading: loadingProps,
    fetchPropietarios, addPropietario,
  } = usePropietarios();

  /* ---------- loader suave ---------- */
  const isReallyLoading = loadingHuerta || loadingProps;
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isReallyLoading) {
      timer = setTimeout(() => setDelayedLoading(true), 300); // 300 ms como en UsersAdmin
    } else {
      setDelayedLoading(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isReallyLoading]);

  /* ---------- handlers ---------- */
  const closeHuertaModal = () => {
    setOpenHuertaModal(false);
    setDefaultPropId(undefined);
  };

  const createHuerta = async (payload: HuertaCreateData) => {
    await addHuerta(payload);
    await fetchHuertas();
    closeHuertaModal();
  };

  const createPropietario = async (payload: PropietarioCreateData) => {
    const nuevo = await addPropietario(payload);
    await fetchPropietarios();
    setDefaultPropId(nuevo.id);
    return nuevo;
  };

  /* ---------- filtro ---------- */
  const filteredHuertas = huertas.filter((h) => {
    if (filter === 'activas')    return  h.is_active;
    if (filter === 'archivadas') return !h.is_active;
    return true;
  });

  const emptyMessage =
    filter === 'activas'    ? 'No hay huertas activas.'
    : filter === 'archivadas' ? 'No hay huertas archivadas.'
    : 'No hay huertas registradas.';

  /* ---------- acciones (optimistas) ---------- */
  const archive = async (id: number) => {
    toggleActivoLocal(id, false);              // ⬅️ cambio instantáneo
    try {
      const res = await huertaService.archivar(id);
      handleBackendNotification(res);
    } catch (e: any) {
      // si falla, revierte cambio local
      toggleActivoLocal(id, true);
      handleBackendNotification(e.response?.data);
    }
  };

  const restore = async (id: number) => {
    toggleActivoLocal(id, true);
    try {
      const res = await huertaService.restaurar(id);
      handleBackendNotification(res);
    } catch (e: any) {
      toggleActivoLocal(id, false);
      handleBackendNotification(e.response?.data);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await huertaService.delete(id);
      handleBackendNotification(res);
      await fetchHuertas();                   // refresco final
    } catch (e: any) {
      handleBackendNotification(e.response?.data);
    }
  };

  /* ---------- render ---------- */
  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Huertas
        </Typography>

        <HuertaToolbar onOpen={() => setOpenHuertaModal(true)} />

        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          textColor="primary" indicatorColor="primary" sx={{ mb: 2 }}
        >
          <Tab value="activas"    label="Activas" />
          <Tab value="archivadas" label="Archivadas" />
          <Tab value="todas"      label="Todas" />
        </Tabs>

        {delayedLoading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <HuertaTable
            data={filteredHuertas}
            page={page}
            pageSize={pageSize}
            count={filteredHuertas.length}
            onPageChange={setPage}
            emptyMessage={emptyMessage}
            onArchive={archive}
            onRestore={restore}
            onDelete={remove}
          />
        )}

        {/* ---- Modales ---- */}
        <HuertaFormModal
          open={openHuertaModal}
          onClose={closeHuertaModal}
          onSubmit={createHuerta}
          propietarios={propietarios}
          onRegisterNewPropietario={() => setOpenPropModal(true)}
          defaultPropietarioId={defaultPropId}
        />

        <PropietarioFormModal
          open={openPropModal}
          onClose={() => setOpenPropModal(false)}
          onSubmit={createPropietario}
        />
      </Paper>
    </motion.div>
  );
};

export default Huertas;
