/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper, Typography, Box, CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Tabs, Tab,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import CosechaToolbar from '../components/cosecha/CosechaToolbar';
import CosechaTable from '../components/cosecha/CosechaTable';
import CosechaFormModal from '../components/cosecha/CosechaFormModal';

import { useCosechas } from '../hooks/useCosechas';
import { Cosecha } from '../types/cosechaTypes';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import { temporadaService } from '../services/temporadaService';

const PAGE_SIZE = 10;

const Cosechas: React.FC = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const temporadaId = Number(searchParams.get('temporada_id')) || null;

  // Info de la temporada
  const [tempLoading, setTempLoading] = useState(false);
  const [tempErr, setTempErr] = useState<string | null>(null);
  const [tempInfo, setTempInfo] = useState<{
    id: number;
    año: number;
    huerta_id: number | null;
    huerta_nombre: string | null;
    is_rentada: boolean;
    is_active: boolean;
    finalizada: boolean;
  } | null>(null);

  // Hook de cosechas
  const {
    cosechas, loading, page, meta,
    search, estado,
    setPage, setTemporadaId, setSearch, setEstado,
    addCosecha, renameCosecha, removeCosecha,
    archiveCosecha, restoreCosecha, toggleFinalizada,
  } = useCosechas();

  // Carga de temporada
  useEffect(() => {
    if (!temporadaId) {
      setTempInfo(null);
      dispatch(clearBreadcrumbs());
      return;
    }
    (async () => {
      try {
        setTempLoading(true);
        const resp = await temporadaService.getById(temporadaId);
        const t = resp.data.temporada;
        setTempInfo({
          id: t.id,
          año: t.año,
          huerta_id: t.huerta_id ?? null,
          huerta_nombre: t.huerta_nombre ?? null,
          is_rentada: !!t.is_rentada,
          is_active: t.is_active,
          finalizada: t.finalizada,
        });
        if (t.huerta_id && t.huerta_nombre) {
          dispatch(setBreadcrumbs(
            breadcrumbRoutes.cosechasList(t.huerta_id, t.huerta_nombre, t.año)
          ));
        } else {
          dispatch(clearBreadcrumbs());
        }
      } catch {
        setTempErr('No se pudo cargar la temporada.');
        dispatch(clearBreadcrumbs());
      } finally {
        setTempLoading(false);
      }
    })();
  }, [temporadaId]);

  // Comunicar temporada al slice
  useEffect(() => {
    setTemporadaId(temporadaId);
  }, [temporadaId]);

  // Delay spinner
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    let timer: number;
    if (loading) {
      timer = window.setTimeout(() => setSpin(true), 250);
    } else {
      setSpin(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Lógica de creación
  const totalCosechas = meta.count;
  const maxReached = totalCosechas >= 6;
  const canCreate = Boolean(
    temporadaId &&
    tempInfo?.is_active &&
    !tempInfo?.finalizada &&
    !maxReached
  );
  const createTooltip = !temporadaId
    ? 'Debes seleccionar una temporada.'
    : tempInfo && !tempInfo.is_active
    ? 'No se pueden iniciar cosechas en una temporada archivada.'
    : tempInfo && tempInfo.finalizada
    ? 'No se pueden iniciar cosechas en una temporada finalizada.'
    : maxReached
    ? 'Límite de 6 cosechas alcanzado.'
    : '';

  // Contador de filtros
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (search) c++;
    if (estado !== 'activas') c++;
    return c;
  }, [search, estado]);

  const emptyMessage = useMemo(() => {
    if (!temporadaId) return 'Selecciona una temporada.';
    switch (estado) {
      case 'activas': return 'No hay cosechas activas.';
      case 'archivadas': return 'No hay cosechas archivadas.';
      default: return 'No hay cosechas registradas.';
    }
  }, [estado, temporadaId]);

  // Crear cosecha auto-número
  const handleCreate = async () => {
    if (!temporadaId) return;
    const nums = cosechas
      .map(c => c.nombre.match(/Cosecha\s+(\d+)/i)?.[1])
      .filter(Boolean)
      .map(Number);
    const next = nums.length ? Math.max(...nums) + 1 : totalCosechas + 1;
    const nombre = `Cosecha ${next}`;
    try {
      await addCosecha({ temporada: temporadaId, nombre });
    } catch (e: any) {
      handleBackendNotification(e?.response?.data?.notification || e);
    }
  };

  // Renombrar
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Cosecha | null>(null);
  const openRename = (c: Cosecha) => { setEditTarget(c); setEditOpen(true); };
  const submitRename = async (nombre: string) => {
    if (!editTarget) return;
    try {
      await renameCosecha(editTarget.id, { nombre });
      setEditOpen(false);
      setEditTarget(null);
    } catch (e: any) {
      handleBackendNotification(e?.response?.data?.notification || e);
    }
  };

  // Eliminar
  const [delId, setDelId] = useState<number | null>(null);
  const confirmDelete = async () => {
    if (delId == null) return;
    try {
      await removeCosecha(delId);
    } catch (e: any) {
      handleBackendNotification(e?.response?.data?.notification || e);
    } finally {
      setDelId(null);
    }
  };

  // Acciones fila
  const handleArchive = async (c: Cosecha) => {
    try { await archiveCosecha(c.id); } 
    catch (e: any) { handleBackendNotification(e?.response?.data?.notification || e); }
  };
  const handleRestore = async (c: Cosecha) => {
    try { await restoreCosecha(c.id); } 
    catch (e: any) { handleBackendNotification(e?.response?.data?.notification || e); }
  };
  const handleToggleFinal = async (c: Cosecha) => {
    try { await toggleFinalizada(c.id); } 
    catch (e: any) { handleBackendNotification(e?.response?.data?.notification || e); }
  };

  const clearFilters = () => {
    setSearch('');
    setEstado('activas');
  };

  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-2">
          Gestión de Cosechas
        </Typography>

        {/* Encabezado de temporada */}
        {tempLoading ? (
          <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>
        ) : tempInfo ? (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Temporada {tempInfo.año} – {tempInfo.huerta_nombre || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estado: {tempInfo.is_active ? 'Activa' : 'Archivada'} · {tempInfo.finalizada ? 'Finalizada' : 'En curso'}
            </Typography>
            <Divider sx={{ mt: 1 }} />
          </Box>
        ) : tempErr ? (
          <Box my={2}><Typography color="error">{tempErr}</Typography></Box>
        ) : null}

        {/* Toolbar */}
        <CosechaToolbar
          searchValue={search}
          onSearchChange={setSearch}
          onCreateClick={canCreate ? handleCreate : undefined}
          canCreate={canCreate}
          createTooltip={createTooltip}
          totalCount={meta.count}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={clearFilters}
        />

        {/* Pestañas */}
        <Tabs
          value={estado}
          onChange={(_, v) => setEstado(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab value="activas" label="Activas" />
          <Tab value="archivadas" label="Archivadas" />
          <Tab value="todas" label="Todas" />
        </Tabs>

        {/* Tabla o spinner */}
        {spin ? (
          <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
        ) : (
          <CosechaTable
            data={cosechas}
            page={page}
            pageSize={PAGE_SIZE}
            count={meta.count}
            onPageChange={setPage}
            onRename={openRename}
            onDelete={c => setDelId(c.id)}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onToggleFinalizada={handleToggleFinal}
            emptyMessage={emptyMessage}
            loading={loading}
          />
        )}

        {/* Modal renombrar */}
        <CosechaFormModal
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditTarget(null); }}
          cosecha={editTarget || undefined}
          onSubmit={submitRename}
        />

        {/* Confirmar eliminación */}
        <Dialog open={delId != null} onClose={() => setDelId(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta cosecha permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelId(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Cosechas;