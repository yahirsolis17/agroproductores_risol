// src/modules/gestion_huerta/pages/Cosechas.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper, Typography, Box, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Tabs, Tab, Skeleton, // 👈 añadimos Skeleton
} from '@mui/material';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
    cosechas, loading, page, meta, extra,
    search, estado,
    setPage, setTemporadaId, setSearch, setEstado,
    addCosecha, renameCosecha, removeCosecha,
    archiveCosecha, restoreCosecha, toggleFinalizada,
  } = useCosechas();

  // Carga de temporada
useEffect(() => {
  let cancelled = false;

  if (!temporadaId) {
    setTempInfo(null);
    dispatch(clearBreadcrumbs());
    return;
  }

  (async () => {
    try {
      setTempLoading(true);
      const resp = await temporadaService.getById(temporadaId);
      if (cancelled) return;

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

      // Lee tipo/propietario de la URL si vienen (prioridad),
      // si no, infiere el tipo por is_rentada y deja propietario indefinido.
      const sp = new URLSearchParams(window.location.search);
      const tipoInUrl = sp.get('tipo');
      const tipo = (tipoInUrl === 'propia' || tipoInUrl === 'rentada')
        ? tipoInUrl
        : (t.is_rentada ? 'rentada' : 'propia');
      const propietario = sp.get('propietario') || undefined;

      if (t.huerta_id && (t.huerta_nombre ?? '')) {
        dispatch(
          setBreadcrumbs(
            breadcrumbRoutes.cosechasList(
              t.huerta_id,
              t.huerta_nombre ?? `Huerta #${t.huerta_id}`,
              t.año,
              t.id,
              { tipo, propietario }
            )
          )
        );
      } else {
        dispatch(clearBreadcrumbs());
      }
    } catch {
      if (!cancelled) {
        setTempErr('No se pudo cargar la temporada.');
        dispatch(clearBreadcrumbs());
      }
    } finally {
      if (!cancelled) setTempLoading(false);
    }
  })();


  return () => {
    cancelled = true;
    dispatch(clearBreadcrumbs());
  };
}, [temporadaId, dispatch]);


  // Comunicar temporada al slice
  useEffect(() => {
    setTemporadaId(temporadaId);
  }, [temporadaId]);

  // Lógica de creación
  const totalRegistradas = (extra.total_registradas as number | undefined) ?? meta.count;
  const maxReached = totalRegistradas >= 6;                                  // 👈 CAMBIA base
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

    const visibles = cosechas
      .map(c => c.nombre.match(/Cosecha\s+(\d+)/i)?.[1])
      .filter(Boolean)
      .map(Number);

    // Base sobre el total real en BD (activas + archivadas)
    const base = Math.max(totalRegistradas, ...(visibles.length ? visibles : [0])); // 👈 NUEVO
    const nombre = `Cosecha ${base + 1}`;

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

  // Navegar a Finanzas por Cosecha
  const handleVerFinanzas = (c: Cosecha) => {
    navigate(`/finanzas/${temporadaId}/${c.id}`);
  };

  // Navegar a Reporte de Cosecha
  const handleReporteCosecha = (c: Cosecha) => {
    if (!tempInfo) return;
    const params = new URLSearchParams({
      temporada_id: String(temporadaId),
      huerta_id: String(tempInfo.huerta_id),
      año: String(tempInfo.año),
    });
    if (tempInfo.huerta_nombre) params.set('huerta_nombre', tempInfo.huerta_nombre);
    // Propagar tipo y propietario desde la URL para conservar el contexto al volver
    const tipoFromUrl = searchParams.get('tipo');
    if (tipoFromUrl) params.set('tipo', tipoFromUrl);
    const propietarioFromUrl = searchParams.get('propietario');
    if (propietarioFromUrl) params.set('propietario', propietarioFromUrl);
    if (c.nombre) params.set('cosecha_nombre', c.nombre);
    navigate(`/reportes/cosecha/${c.id}?${params.toString()}`);
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

        {/* Encabezado de temporada: usar Skeletons para evitar saltos */}
        {tempLoading ? (
          <Box mb={2}>
            <Skeleton variant="text" width={320} height={28} />
            <Skeleton variant="text" width={260} height={20} />
            <Divider sx={{ mt: 1 }} />
          </Box>
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
          onCreateClick={handleCreate}            // 👈 SIEMPRE pasamos el handler
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

        {/* Tabla SIEMPRE montada; el overlay de carga lo maneja TableLayout */}
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
          onVerFinanzas={handleVerFinanzas}
          onReporteCosecha={handleReporteCosecha}
          emptyMessage={emptyMessage}
          loading={loading}   // 👈 deja que la tabla muestre el overlay; sin pantallazos
        />

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
