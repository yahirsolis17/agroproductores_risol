/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper, Typography, Box, CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Button
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

const pageSize = 10;

const Cosechas: React.FC = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const temporadaId = Number(searchParams.get('temporada_id') || 0) || null;

  // Estado de la temporada actual para encabezado/breadcrumb
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

  // Store de cosechas
  const {
    cosechas, loading, page, meta,
    search, finalizada, estado,
    setPage, setTemporadaId, setSearch, setFinalizada, setEstado,
    addCosecha, renameCosecha, removeCosecha,
    archiveCosecha, restoreCosecha, toggleFinalizada,
  } = useCosechas();

  // Cargar temporada para encabezado/breadcrumbs
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
      } catch (e: any) {
        setTempErr('No se pudo cargar la temporada.');
        dispatch(clearBreadcrumbs());
      } finally {
        setTempLoading(false);
      }
    })();
  }, [dispatch, temporadaId]);

  // Conectar la temporada en el slice
  useEffect(() => {
    setTemporadaId(temporadaId);
  }, [temporadaId]);

  // Spinner de listado
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    let t: any;
    if (loading) t = setTimeout(() => setSpin(true), 250);
    else setSpin(false);
    return () => clearTimeout(t);
  }, [loading]);

  // Reglas de creación (máximo 6 y bloqueo por estado de la temporada)
  const totalCosechas = meta.count || 0;
  const maxAlcanzado = totalCosechas >= 6;
  const puedeCrear = !!(temporadaId && tempInfo?.is_active && !tempInfo?.finalizada && !maxAlcanzado);

  const createTooltip = !temporadaId
    ? 'Debes seleccionar una temporada.'
    : tempInfo && !tempInfo.is_active
    ? 'No se pueden iniciar cosechas en una temporada archivada.'
    : tempInfo && tempInfo.finalizada
    ? 'No se pueden iniciar cosechas en una temporada finalizada.'
    : maxAlcanzado
    ? 'Límite de 6 cosechas alcanzado.'
    : '';

  // Filtros activos
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (search) c++;
    if (finalizada !== null) c++;
    if (estado !== 'activas') c++; // si no es default
    return c;
  }, [search, finalizada, estado]);

  const emptyMessage = useMemo(() => {
    if (!temporadaId) return 'Selecciona una temporada.';
    switch (estado) {
      case 'activas': return 'No hay cosechas activas.';
      case 'archivadas': return 'No hay cosechas archivadas.';
      default: return 'No hay cosechas registradas.';
    }
  }, [estado, temporadaId]);

  // Crear cosecha con nombre auto
  const handleCreate = async () => {
    if (!temporadaId) return;

    // Nombre incremental Cosecha N
    const existentes = cosechas
      .map(c => c.nombre)
      .filter(n => /^Cosecha\s+\d+$/i.test(n))
      .map(n => parseInt(n.replace(/[^0-9]/g, ''), 10))
      .filter(x => !Number.isNaN(x));

    const siguiente = existentes.length ? Math.max(...existentes) + 1 : (totalCosechas + 1);
    const nombre = `Cosecha ${siguiente}`;

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

  // Limpiar filtros
  const clearFilters = () => {
    setSearch('');
    setFinalizada(null);
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
          finalizadaFilter={finalizada}
          onFinalizadaChange={setFinalizada}
          estadoFilter={estado}
          onEstadoChange={setEstado}
          onCreateClick={temporadaId ? handleCreate : undefined}
          canCreate={puedeCrear}
          createTooltip={createTooltip}
          totalCount={meta.count}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={clearFilters}
        />

        {/* Tabla */}
        {spin ? (
          <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
        ) : (
          <CosechaTable
            data={cosechas}
            page={page}
            pageSize={pageSize}
            count={meta.count}
            onPageChange={setPage}
            onRename={openRename}
            onDelete={(c) => setDelId(c.id)}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onToggleFinalizada={handleToggleFinal}
            emptyMessage={emptyMessage}
            loading={loading}
          />
        )}

        {/* Renombrar */}
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
