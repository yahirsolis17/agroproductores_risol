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

// ⬇️ Consistencia de breadcrumbs
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

// 👉 servicios para obtener nombre/propietario de la huerta seleccionada
import { huertaService } from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { temporadaService } from '../services/temporadaService';

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

  // si algún router previo lo pasa por URL, úsalo de base
  const huertaNombreParam = search.get('huerta_nombre') || '';
  const propietarioParam  = search.get('propietario') || '';

  // hook de temporadas (sin catálogos, el backend manda auxiliares)
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

  // Al montar/cambiar URL, fija el filtro correcto según `tipo`
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

  /* ──────────────────── Encabezado robusto (nombre/propietario) ──────────────────── */
  const derivedHuertaNombre = temporadas[0]?.huerta_nombre || '';
  const [headerInfo, setHeaderInfo] = useState<{ nombre: string; propietario?: string } | null>(null);

  const displayHuertaNombre =
    headerInfo?.nombre ||
    derivedHuertaNombre ||
    huertaNombreParam ||
    (huertaId ? `#${huertaId}` : '');

  const displayPropietario =
    headerInfo?.propietario ||
    propietarioParam ||
    '—';

  // Fetch de detalle para obtener propietario/nombre si hace falta
  useEffect(() => {
    let cancelled = false;

    const needFetch =
      !!huertaId &&
      !!tipo &&
      (
        (!derivedHuertaNombre && !huertaNombreParam) || // falta nombre
        !propietarioParam                              // falta propietario
      );

    const fetchHeader = async () => {
      try {
        if (!huertaId || !tipo) return;

        if (tipo === 'propia') {
          const h = await huertaService.getById(huertaId); // debe retornar { data: { huerta: ... } } o un objeto compatible
          if (cancelled) return;

          // Compat: soporta ambos formatos (objeto plano o envuelto)
          const huertaObj: any = (h as any).data?.huerta ?? h;
          const propietario =
            (huertaObj?.propietario_detalle
              ? [huertaObj.propietario_detalle.nombre, huertaObj.propietario_detalle.apellidos].filter(Boolean).join(' ')
              : '') || '—';

          setHeaderInfo({ nombre: huertaObj?.nombre ?? `#${huertaId}`, propietario });
        } else {
          const hr = await huertaRentadaService.getById(huertaId);
          if (cancelled) return;

          const hrObj: any = (hr as any).data?.huerta_rentada ?? hr;
          const propietario =
            (hrObj?.propietario_detalle
              ? [hrObj.propietario_detalle.nombre, hrObj.propietario_detalle.apellidos].filter(Boolean).join(' ')
              : '') || '—';

          setHeaderInfo({ nombre: hrObj?.nombre ?? `#${huertaId}`, propietario });
        }
      } catch {
        // silencioso
      }
    };

    if (needFetch) {
      fetchHeader();
    } else if (huertaNombreParam || derivedHuertaNombre || propietarioParam) {
      // refleja lo que ya viene de temporadas o la URL
      setHeaderInfo((prev) => ({
        nombre: derivedHuertaNombre || huertaNombreParam || prev?.nombre || (huertaId ? `#${huertaId}` : ''),
        propietario: propietarioParam || prev?.propietario || '—',
      }));
    }

    return () => { cancelled = true; };
  }, [huertaId, tipo, derivedHuertaNombre, huertaNombreParam, propietarioParam]);

  /* ──────────────────── Breadcrumbs (consistente con el resto) ──────────────────── */
  useEffect(() => {
    if (huertaId && displayHuertaNombre) {
      dispatch(
        setBreadcrumbs(
          breadcrumbRoutes.temporadasList(
            huertaId,
            displayHuertaNombre,
            tipo || undefined,
            displayPropietario && displayPropietario !== '—' ? displayPropietario : undefined
          )
        )
      );
    } else {
      dispatch(clearBreadcrumbs());
    }

    return () => {
      dispatch(clearBreadcrumbs());
      setHuerta(null);
      setHuertaRentada(null);
    };
  }, [dispatch, huertaId, displayHuertaNombre, displayPropietario, tipo, setHuerta, setHuertaRentada]);

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

  /* ──────────────────── EXISTE TEMPORADA ESTE AÑO (cualquier estado) ──────────────────── */
  const [existsThisYearAny, setExistsThisYearAny] = useState(false);
  const [checkingExists, setCheckingExists] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!huertaId || !tipo) { setExistsThisYearAny(false); return; }

      setCheckingExists(true);
      try {
        const res = await temporadaService.list(
          1,                                   // page
          currentYear,                         // año
          tipo === 'propia'  ? huertaId : undefined,
          tipo === 'rentada' ? huertaId : undefined,
          'todas'                              // 👈 incluye activas y archivadas
        );
        if (cancelled) return;
        const count = res?.data?.meta?.count ?? 0;
        setExistsThisYearAny(count > 0);
      } catch {
        if (!cancelled) setExistsThisYearAny(false);
      } finally {
        if (!cancelled) setCheckingExists(false);
      }
    };

    check();
    // Re-evaluar si cambia la lista (p.ej., archivar/restaurar) o el contexto
  }, [huertaId, tipo, temporadas.length]);

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
      handleBackendNotification(err?.notification || err?.response?.data?.notification || err);
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
    const params = new URLSearchParams({ temporada_id: String(t.id) });
    if (huertaId) params.set('huerta_id', String(huertaId));
    if (tipo) params.set('tipo', tipo);
    if (displayHuertaNombre) params.set('huerta_nombre', displayHuertaNombre);
    if (displayPropietario && displayPropietario !== '—') params.set('propietario', displayPropietario);

    navigate(`/cosechas?${params.toString()}`);
  };

  const handleReporteTemporada = (t: Temporada) => {
    const params = new URLSearchParams({ año: String(t.año) });
    if (huertaId) params.set('huerta_id', String(huertaId));
    if (displayHuertaNombre) params.set('huerta_nombre', displayHuertaNombre);
    if (tipo) params.set('tipo', tipo);
    if (displayPropietario) params.set('propietario', displayPropietario);
    navigate(`/reportes/temporada/${t.id}?${params.toString()}`);
  };

  // Limpiar todos los filtros (excepto estado)
  const handleClearFilters = () => {
    setSearch('');
    setYear(null);
    setFinalizada(null);
  };

  /* ──────────────────── Flags auxiliares ──────────────────── */
  const huertaEstaArchivada = false; // el backend lo valida igualmente

  // 👇 ahora nos basamos en existsThisYearAny (activa o archivada)
  const canCreateTemporada = !!huertaId && !huertaEstaArchivada && !existsThisYearAny;
  const createTooltip =
    !huertaId
      ? 'Selecciona una huerta para crear una temporada.'
      : huertaEstaArchivada
      ? 'No se puede iniciar una temporada en una huerta archivada.'
      : existsThisYearAny
      ? `Ya existe una temporada para este año en esta huerta.`
      : '';

  /* ──────────────────── Render ──────────────────── */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-2">
          Gestión de Temporadas
        </Typography>

        {/* Encabezado con nombre/propietario resuelto */}
        {huertaId && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Huerta seleccionada: {displayHuertaNombre || `#${huertaId} (${tipo || '—'})`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Propietario: {displayPropietario}
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
          onCreateClick={() => setConfirmOpen(true)} 
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
            onReporteTemporada={handleReporteTemporada}
          />
        )}

        <TemporadaFormModal
          open={consultOpen}
          onClose={() => {
            setConsultTarget(null);
            setConsultOpen(false);
          }}
          initialValues={consultTarget || undefined}
          huertas={[]}
          huertasRentadas={[]}
          readOnly
        />

        {/* Confirmar nueva temporada */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar nueva temporada</DialogTitle>
          <DialogContent dividers>
            <Typography>Año: {currentYear}</Typography>
            <Typography>Huerta: {displayHuertaNombre || `#${huertaId}`}</Typography>
            <Typography>Fecha inicio: {formatFechaLarga(new Date().toISOString())}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreate} disabled={!canCreateTemporada || checkingExists}>
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
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Temporadas;
