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
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import TemporadaTable from '../components/temporada/TemporadaTable';
import TemporadaToolbar from '../components/temporada/TemporadaToolbar';
import TemporadaFormModal from '../components/temporada/TemporadaFormModal';
import { useTemporadas } from '../hooks/useTemporadas';
import { useHuertas } from '../hooks/useHuertas';
import { useHuertasRentadas } from '../hooks/useHuertaRentada';
import { TemporadaCreateData, Temporada } from '../types/temporadaTypes';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

const currentYear = new Date().getFullYear();
const pageSize = 10;

const Temporadas: React.FC = () => {
  const dispatch = useDispatch();
  const [search] = useSearchParams();
  const huertaId = Number(search.get('huerta_id') || 0) || null;

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
    setHuerta,
    setHuertaRentada,
    addTemporada,
    removeTemporada,
    finalizeTemporada,
    archiveTemporada,
    restoreTemporada,
  } = useTemporadas();

  const { huertas } = useHuertas();
  const { huertas: rentadas } = useHuertasRentadas();

  // Detectar huerta seleccionada y sincronizar filtro global
  const huertaSel = useMemo(() => {
    if (!huertaId) return null;
    return (
      huertas.find((h) => h.id === huertaId) ||
      rentadas.find((h) => h.id === huertaId) ||
      null
    );
  }, [huertaId, huertas, rentadas]);

  useEffect(() => {
    if (huertaSel) {
      if ('monto_renta' in huertaSel) {
        setHuerta(null);
        setHuertaRentada(huertaSel.id);
      } else {
        setHuerta(huertaSel.id);
        setHuertaRentada(null);
      }
    } else {
      setHuerta(null);
      setHuertaRentada(null);
    }
  }, [huertaSel, setHuerta, setHuertaRentada]);

  /* ──────────────────── Breadcrumbs ──────────────────── */
  useEffect(() => {
    if (huertaSel) {
      dispatch(setBreadcrumbs(
        breadcrumbRoutes.temporadasList(huertaSel.id, huertaSel.nombre)
      ));
    } else {
      dispatch(clearBreadcrumbs());
    }

    return () => {
      dispatch(clearBreadcrumbs());
    };
  }, [dispatch, huertaSel]);

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
      case 'activas':
        return 'No hay temporadas activas.';
      case 'archivadas':
        return 'No hay temporadas archivadas.';
      default:
        return 'No hay temporadas.';
    }
  }, [estadoFilter]);

  /* ──────────────────── Acciones CRUD / toggle ──────────────────── */
  const handleCreate = async () => {
    if (!huertaSel) {
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
      huerta: 'monto_renta' in huertaSel ? undefined : huertaSel.id,
      huerta_rentada: 'monto_renta' in huertaSel ? huertaSel.id : undefined,
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

  useEffect(() => {
    if (!confirmOpen || !huertaSel) return;
    const yaExiste = temporadas.some(
      (t) =>
        t.año === currentYear &&
        t.is_active &&
        (t.huerta_id === huertaSel.id || t.huerta_rentada === huertaSel.id)
    );
    if (yaExiste) setConfirmOpen(false);
  }, [temporadas, confirmOpen, huertaSel]);

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
    try { 
      await archiveTemporada(t.id); 
    } catch (e: any) { 
      handleBackendNotification(e?.response?.data?.notification || e);
    } 
  };
  
  const handleRestore = async (t: Temporada) => { 
    try { 
      await restoreTemporada(t.id); 
    } catch (e: any) { 
      handleBackendNotification(e?.response?.data?.notification || e);
    } 
  };
  
  const handleFinalize = async (t: Temporada) => { 
    try { 
      await finalizeTemporada(t.id); 
    } catch (e: any) { 
      handleBackendNotification(e?.response?.data?.notification || e);
    } 
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setSearch('');
    setYear(null);
    setFinalizada(null);
  };

  /* ──────────────────── Flags auxiliares ──────────────────── */
  const huertaEstaArchivada = huertaSel ? !huertaSel.is_active : false;
  const temporadaYaExiste = temporadas.some(
    (t) =>
      t.año === currentYear &&
      t.is_active &&
      (t.huerta_id === huertaSel?.id || t.huerta_rentada === huertaSel?.id)
  );

  const canCreateTemporada = !!(huertaSel && !huertaEstaArchivada && !temporadaYaExiste);
  const createTooltip = huertaEstaArchivada
    ? 'No se puede iniciar una temporada en una huerta archivada.'
    : temporadaYaExiste
    ? `Ya existe una temporada activa en el año ${currentYear} para esta huerta.`
    : !huertaSel
    ? 'Selecciona una huerta para crear una temporada.'
    : '';

  /* ──────────────────── Render ──────────────────── */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-2">
          Gestión de Temporadas
        </Typography>

        {huertaSel && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Huerta seleccionada: {huertaSel.nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Propietario:{' '}
              {huertaSel.propietario_detalle
                ? `${huertaSel.propietario_detalle.nombre} ${huertaSel.propietario_detalle.apellidos}`
                : '—'}
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
          onCreateClick={huertaSel ? () => setConfirmOpen(true) : undefined}
          canCreate={canCreateTemporada}
          createTooltip={createTooltip}
          totalCount={meta.count}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
        />

        {/* Tabs para filtrar por estado */}
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
          />
        )}

        <TemporadaFormModal
          open={consultOpen}
          onClose={() => {
            setConsultTarget(null);
            setConsultOpen(false);
          }}
          initialValues={consultTarget || undefined}
          huertas={huertas}
          huertasRentadas={rentadas}
          readOnly
        />

        {/* Confirmar nueva temporada */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar nueva temporada</DialogTitle>
          <DialogContent dividers>
            <Typography>Año: {currentYear}</Typography>
            <Typography>Huerta: {huertaSel?.nombre}</Typography>
            <Typography>Fecha inicio: {new Date().toISOString().slice(0, 10)}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreate}>
              Iniciar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmar eliminación */}
        <Dialog open={delDialogId != null} onClose={() => setDelDialogId(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta temporada permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialogId(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Temporadas;
