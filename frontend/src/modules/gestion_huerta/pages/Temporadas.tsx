/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import TemporadaTable from '../components/temporada/TemporadaTable';
import TemporadaToolbar from '../components/temporada/TemporadaToolbar';
import TemporadaFormModal from '../components/temporada/TemporadaFormModal';
import { useTemporadas } from '../hooks/useTemporadas';
import { TemporadaCreateData, Temporada } from '../types/temporadaTypes';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

const currentYear = new Date().getFullYear();
const pageSize = 10;

const formatFechaLarga = (iso?: string | null) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return '—';
  let s = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  s = s.replace(/ de (\d{4})$/, ' del $1');
  return s;
};

const Temporadas: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [search] = useSearchParams();
  const huertaId = Number(search.get('huerta_id') || 0) || null;
  const tipo = (search.get('tipo') as 'propia' | 'rentada' | null) || null;

  // usamos el hook sin depender de catálogos de huertas
  const {
    temporadas,
    loading,
    page,
    meta,
    setPage,
    yearFilter,
    estadoFilter,
    finalizadaFilter,
    searchFilter,
    setYear,
    setEstado,
    setFinalizada,
    setSearch,
    huertaId: selHuertaId,
    setHuerta,
    huertaRentadaId: selHuertaRentadaId,
    setHuertaRentada,
    addTemporada,
    removeTemporada,
    finalizeTemporada,
    archiveTemporada,
    restoreTemporada,
  } = useTemporadas({ enabled: !!huertaId });

  // al montar/cambiar URL, fija el filtro correcto según `tipo`
  useEffect(() => {
    if (!huertaId || !tipo) {
      if (selHuertaId !== null) setHuerta(null);
      if (selHuertaRentadaId !== null) setHuertaRentada(null);
      return;
    }
    if (tipo === 'propia') {
      if (selHuertaId !== huertaId) setHuerta(huertaId);
      if (selHuertaRentadaId !== null) setHuertaRentada(null);
    } else if (tipo === 'rentada') {
      if (selHuertaRentadaId !== huertaId) setHuertaRentada(huertaId);
      if (selHuertaId !== null) setHuerta(null);
    }
  }, [huertaId, tipo, selHuertaId, selHuertaRentadaId, setHuerta, setHuertaRentada]);

  /* ──────────────────── Breadcrumbs ──────────────────── */
  // Deriva nombre de huerta desde la primera fila (el backend ya lo da en cada temporada)
  const derivedHuertaNombre = temporadas[0]?.huerta_nombre || '';
  useEffect(() => {
    if (huertaId && derivedHuertaNombre) {
      dispatch(setBreadcrumbs(breadcrumbRoutes.temporadasList(huertaId, derivedHuertaNombre)));
    } else {
      dispatch(clearBreadcrumbs());
    }
    return () => { dispatch(clearBreadcrumbs()); };
  }, [dispatch, huertaId, derivedHuertaNombre]);

  /* ──────────────────── Estados locales ──────────────────── */
  const [spin, setSpin] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delDialogId, setDelDialogId] = useState<number | null>(null);
  const [consultTarget, setConsultTarget] = useState<Temporada | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);

  /* Spinner con retardo */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) timer = setTimeout(() => setSpin(true), 300);
    else setSpin(false);
    return () => clearTimeout(timer);
  }, [loading]);

  // Calcular filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchFilter) count++;
    if (yearFilter) count++;
    if (finalizadaFilter !== null) count++;
    return count;
  }, [searchFilter, yearFilter, finalizadaFilter]);

  const emptyMsg = useMemo(() => {
    switch (estadoFilter) {
      case 'activas': return 'No hay temporadas activas.';
      case 'archivadas': return 'No hay temporadas archivadas.';
      default: return 'No hay temporadas.';
    }
  }, [estadoFilter]);

  /* ──────────────────── Acciones CRUD / toggle ──────────────────── */
  const handleCreate = async () => {
    if (!huertaId || !tipo) {
      handleBackendNotification({
        key: 'validation_error',
        message: 'Debes seleccionar una huerta primero.',
        type: 'warning',
      });
      return;
    }

    const payload: TemporadaCreateData = {
      año: currentYear,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      huerta: tipo === 'propia' ? huertaId : undefined,
      huerta_rentada: tipo === 'rentada' ? huertaId : undefined,
    };

    Object.keys(payload).forEach((k) => {
      if ((payload as any)[k] == null) delete (payload as any)[k];
    });

    try {
      await addTemporada(payload);
      handleBackendNotification({ key: 'temporada_create_success', message: 'Temporada creada.', type: 'success' });
    } catch (err: any) {
      handleBackendNotification(err?.response?.data?.notification || err);
    }
  };

  const confirmDelete = async () => {
    if (delDialogId == null) return;
    try {
      await removeTemporada(delDialogId);
      handleBackendNotification({ key: 'temporada_delete_success', message: 'Temporada eliminada.', type: 'success' });
    } catch (err: any) {
      handleBackendNotification(err?.response?.data?.notification || err);
    } finally {
      setDelDialogId(null);
    }
  };

  const handleArchive = async (t: Temporada) => {
    try { await archiveTemporada(t.id); }
    catch (e: any) { handleBackendNotification(e?.response?.data?.notification || e); }
  };

  const handleRestore = async (t: Temporada) => {
    try { await restoreTemporada(t.id); }
    catch (e: any) { handleBackendNotification(e?.response?.data?.notification || e); }
  };

  const handleFinalize = async (t: Temporada) => {
    try { await finalizeTemporada(t.id); }
    catch (e: any) { handleBackendNotification(e?.response?.data?.notification || e); }
  };

  const handleCosechas = (t: Temporada) => {
    navigate(`/cosechas?temporada_id=${t.id}`);
  };

  // Limpiar todos los filtros (excepto estado)
  const handleClearFilters = () => {
    setSearch('');
    setYear(null);
    setFinalizada(null);
  };

  /* ──────────────────── Flags auxiliares ──────────────────── */
  // Sin catálogos, no conocemos el estado de la huerta; lo decide el backend al crear.
  const huertaEstaArchivada = false;
  const temporadaYaExiste = temporadas.some(
    (t) =>
      t.año === currentYear &&
      t.is_active &&
      (t.huerta_id === huertaId || t.huerta_rentada === huertaId)
  );

  const canCreateTemporada = !!(huertaId && !huertaEstaArchivada && !temporadaYaExiste);
  const createTooltip = huertaEstaArchivada
    ? 'No se puede iniciar una temporada en una huerta archivada.'
    : temporadaYaExiste
    ? `Ya existe una temporada activa en el año ${currentYear} para esta huerta.`
    : !huertaId
    ? 'Selecciona una huerta para crear una temporada.'
    : '';

  /* ──────────────────── Render ──────────────────── */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-2">
          Gestión de Temporadas
        </Typography>

        {/* Encabezado con nombre derivado de la data */}
        {huertaId && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Huerta seleccionada: {derivedHuertaNombre || `#${huertaId} (${tipo || '—'})`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Propietario: {/* sin catálogos: desconocido aquí */} —
            </Typography>
            <Divider sx={{ mt: 1 }} />
          </Box>
        )}

        {/* Toolbar con filtros */}
        <TemporadaToolbar
          searchValue={searchFilter}
          onSearchChange={setSearch}
          yearFilter={yearFilter}
          onYearChange={setYear}
          finalizadaFilter={finalizadaFilter}
          onFinalizadaChange={setFinalizada}
          onCreateClick={huertaId ? () => setConfirmOpen(true) : undefined}
          canCreate={canCreateTemporada}
          createTooltip={createTooltip}
          totalCount={meta.count}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
        />

        {/* Tabs por estado */}
        <Tabs
          value={estadoFilter}
          onChange={(_, v) => setEstado(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab value="activas" label="Activas" />
          <Tab value="archivadas" label="Archivadas" />
          <Tab value="todas" label="Todas" />
        </Tabs>

        {spin ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TemporadaTable
            data={temporadas}
            page={page}
            pageSize={pageSize}
            count={meta.count}
            onPageChange={setPage}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onDelete={(t) => setDelDialogId(t.id)}
            onConsult={(t) => {
              setConsultTarget(t);
              setConsultOpen(true);
            }}
            onFinalize={handleFinalize}
            emptyMessage={emptyMsg}
            loading={loading}
            onCosechas={handleCosechas}
          />
        )}

        <TemporadaFormModal
          open={consultOpen}
          onClose={() => {
            setConsultTarget(null);
            setConsultOpen(false);
          }}
          initialValues={consultTarget || undefined}
          huertas={[]}             // no usamos catálogos aquí
          huertasRentadas={[]}     // (modal de solo lectura)
          readOnly
        />

        {/* Confirmar nueva temporada */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar nueva temporada</DialogTitle>
          <DialogContent dividers>
            <Typography>Año: {currentYear}</Typography>
            <Typography>Huerta: {derivedHuertaNombre || `#${huertaId}`}</Typography>
            <Typography>Fecha inicio: {formatFechaLarga(new Date().toISOString())}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreate}>Iniciar</Button>
          </DialogActions>
        </Dialog>

        {/* Confirmar eliminación */}
        <Dialog open={delDialogId != null} onClose={() => setDelDialogId(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta temporada permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialogId(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Temporadas;
