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
  TextField,
  MenuItem,
} from '@mui/material';
import { m } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import TemporadaTable from '../components/temporada/TemporadaTable';
import TemporadaToolbar from '../components/temporada/TemporadaToolbar';
import TemporadaFormModal from '../components/temporada/TemporadaFormModal';
import { useTemporadas } from '../hooks/useTemporadas';
import { TemporadaCreateData, Temporada } from '../types/temporadaTypes';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import { huertaService } from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { temporadaService } from '../services/temporadaService';
import { joinDisplayParts } from '../../../global/utils/uiTransforms';
import { formatDateLongEs, getTodayLocalISO } from '../../../global/utils/date';
import { extractApiMessage } from '../../../global/api/errorUtils';

const currentYear = new Date().getFullYear();
const pageSize = 10;
const minAllowedDate = '2000-01-01';
const maxAllowedDate = `${currentYear + 1}-12-31`;

const formatFechaLarga = (iso?: string | null) => (iso ? formatDateLongEs(iso) : '—');

type HeaderInfo = {
  nombre: string;
  propietario: string;
  isActive: boolean;
};

const Temporadas: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [search] = useSearchParams();
  const huertaId = Number(search.get('huerta_id') || 0) || null;
  const tipo = (search.get('tipo') as 'propia' | 'rentada' | null) || null;
  const huertaNombreParam = search.get('huerta_nombre') || '';
  const propietarioParam = search.get('propietario') || '';

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
    activateOperationalTemporada,
  } = useTemporadas();

  useEffect(() => {
    if (!huertaId || !tipo) {
      if (selHuertaId !== null) setHuerta(null);
      if (selHuertaRentadaId !== null) setHuertaRentada(null);
      return;
    }
    if (tipo === 'propia') {
      if (selHuertaId !== huertaId) setHuerta(huertaId);
      if (selHuertaRentadaId !== null) setHuertaRentada(null);
    } else {
      if (selHuertaRentadaId !== huertaId) setHuertaRentada(huertaId);
      if (selHuertaId !== null) setHuerta(null);
    }
  }, [huertaId, tipo, selHuertaId, selHuertaRentadaId, setHuerta, setHuertaRentada]);

  const derivedHuertaNombre = temporadas[0]?.huerta_nombre || '';
  const [headerInfo, setHeaderInfo] = useState<HeaderInfo | null>(null);
  const [headerResolved, setHeaderResolved] = useState(false);
  const [spin, setSpin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftYear, setDraftYear] = useState<number>(currentYear);
  const [draftFechaInicio, setDraftFechaInicio] = useState<string>(getTodayLocalISO());
  const [draftEstadoOperativo, setDraftEstadoOperativo] = useState<'planificada' | 'operativa'>('operativa');
  const [selectedYearExists, setSelectedYearExists] = useState(false);
  const [checkingExists, setCheckingExists] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [delDialogId, setDelDialogId] = useState<number | null>(null);
  const [consultTarget, setConsultTarget] = useState<Temporada | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);

  const displayHuertaNombre =
    headerInfo?.nombre ||
    derivedHuertaNombre ||
    huertaNombreParam ||
    (huertaId ? `#${huertaId}` : '');

  const displayPropietario =
    headerInfo?.propietario ||
    propietarioParam ||
    '—';

  const huertaEstaArchivada = headerInfo ? !headerInfo.isActive : false;

  useEffect(() => {
    let cancelled = false;

    const fetchHeader = async () => {
      if (!huertaId || !tipo) {
        setHeaderInfo(null);
        setHeaderResolved(false);
        return;
      }

      setHeaderResolved(false);
      try {
        if (tipo === 'propia') {
          const huertaObj = await huertaService.getById(huertaId);
          if (cancelled) return;
          const propietario =
            (huertaObj.propietario_detalle
              ? joinDisplayParts([huertaObj.propietario_detalle.nombre, huertaObj.propietario_detalle.apellidos])
              : '') || propietarioParam || '—';

          setHeaderInfo({
            nombre: huertaObj.nombre || derivedHuertaNombre || huertaNombreParam || `#${huertaId}`,
            propietario,
            isActive: Boolean(huertaObj.is_active),
          });
          setHeaderResolved(true);
        } else {
          const hrObj = await huertaRentadaService.getById(huertaId);
          if (cancelled) return;
          const propietario =
            (hrObj.propietario_detalle
              ? joinDisplayParts([hrObj.propietario_detalle.nombre, hrObj.propietario_detalle.apellidos])
              : '') || propietarioParam || '—';

          setHeaderInfo({
            nombre: hrObj.nombre || derivedHuertaNombre || huertaNombreParam || `#${huertaId}`,
            propietario,
            isActive: Boolean(hrObj.is_active),
          });
          setHeaderResolved(true);
        }
      } catch {
        if (cancelled) return;
        setHeaderInfo(null);
        setHeaderResolved(true);
      }
    };

    fetchHeader();
    return () => {
      cancelled = true;
    };
  }, [huertaId, tipo, derivedHuertaNombre, huertaNombreParam, propietarioParam]);

  useEffect(() => {
    if (huertaId && displayHuertaNombre) {
      dispatch(
        setBreadcrumbs(
          breadcrumbRoutes.temporadasList(
            huertaId,
            displayHuertaNombre,
            tipo || undefined,
            displayPropietario !== '—' ? displayPropietario : undefined
          )
        )
      );
    } else {
      dispatch(clearBreadcrumbs());
    }
  }, [dispatch, huertaId, displayHuertaNombre, displayPropietario, tipo]);

  useEffect(() => {
    return () => {
      dispatch(clearBreadcrumbs());
      setHuerta(null);
      setHuertaRentada(null);
    };
  }, [dispatch, setHuerta, setHuertaRentada]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) timer = setTimeout(() => setSpin(true), 300);
    else setSpin(false);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!createOpen) return;
    setDraftYear(currentYear);
    setDraftFechaInicio(getTodayLocalISO());
    setDraftEstadoOperativo('operativa');
    setSelectedYearExists(false);
    setUiError(null);
  }, [createOpen]);

  useEffect(() => {
    if (!createOpen) return;
    if (draftYear > currentYear && draftEstadoOperativo !== 'planificada') {
      setDraftEstadoOperativo('planificada');
    }
  }, [createOpen, draftYear, draftEstadoOperativo]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!huertaId || !tipo || !createOpen) {
        setSelectedYearExists(false);
        return;
      }
      if (draftYear < 2000 || draftYear > currentYear + 1) {
        setSelectedYearExists(false);
        return;
      }

      setCheckingExists(true);
      try {
        const res = await temporadaService.list(
          1,
          draftYear,
          tipo === 'propia' ? huertaId : undefined,
          tipo === 'rentada' ? huertaId : undefined,
          'todas'
        );
        if (cancelled) return;
        const count = res?.data?.meta?.count ?? 0;
        setSelectedYearExists(count > 0);
      } catch {
        if (!cancelled) setSelectedYearExists(false);
      } finally {
        if (!cancelled) setCheckingExists(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [huertaId, tipo, draftYear, createOpen, temporadas.length]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchFilter) count++;
    if (yearFilter) count++;
    if (finalizadaFilter !== null) count++;
    return count;
  }, [searchFilter, yearFilter, finalizadaFilter]);

  const emptyMsg = useMemo(() => {
    switch (estadoFilter) {
      case 'operativas': return 'No hay temporadas operativas.';
      case 'planificadas': return 'No hay temporadas planificadas.';
      case 'archivadas': return 'No hay temporadas archivadas.';
      default: return 'No hay temporadas.';
    }
  }, [estadoFilter]);

  const canOpenCreateDialog =
    Boolean(huertaId) &&
    Boolean(tipo) &&
    headerResolved &&
    Boolean(headerInfo) &&
    !huertaEstaArchivada;
  const createTooltip = !huertaId
    ? 'Selecciona una huerta para crear una temporada.'
    : !tipo
      ? 'Contexto de huerta inválido.'
      : !headerResolved
        ? 'Validando la huerta seleccionada...'
        : !headerInfo
          ? 'No se pudo validar la huerta seleccionada.'
    : huertaEstaArchivada
      ? 'No se puede iniciar una temporada en una huerta archivada.'
      : '';

  const yearError =
    draftYear < 2000 || draftYear > currentYear + 1
      ? `El año debe estar entre 2000 y ${currentYear + 1}.`
      : '';

  const fechaError = !draftFechaInicio
    ? 'La fecha de inicio es requerida.'
    : draftFechaInicio < minAllowedDate || draftFechaInicio > maxAllowedDate
      ? `La fecha debe estar entre ${minAllowedDate} y ${maxAllowedDate}.`
      : '';

  const createDialogError = yearError || fechaError || (selectedYearExists ? 'Ya existe una temporada para ese año en esta huerta.' : '');
  const canSubmitCreate = canOpenCreateDialog && !checkingExists && !createDialogError;

  const handleCreate = async () => {
    if (!huertaId || !tipo || !canSubmitCreate) return;

    const payload: TemporadaCreateData = {
      año: draftYear,
      fecha_inicio: draftFechaInicio,
      estado_operativo: draftEstadoOperativo,
      huerta: tipo === 'propia' ? huertaId : undefined,
      huerta_rentada: tipo === 'rentada' ? huertaId : undefined,
    };

    Object.keys(payload).forEach((k) => {
      if ((payload as any)[k] == null) delete (payload as any)[k];
    });

    try {
      setUiError(null);
      await addTemporada(payload);
      setCreateOpen(false);
    } catch {
      setUiError('No se pudo crear la temporada.');
    }
  };

  const confirmDelete = async () => {
    if (delDialogId == null) return;
    try {
      await removeTemporada(delDialogId);
    } catch {
      setUiError('No se pudo eliminar la temporada.');
    } finally {
      setDelDialogId(null);
    }
  };

  const handleArchive = async (t: Temporada) => {
    try {
      await archiveTemporada(t.id);
    } catch {
      setUiError('No se pudo archivar la temporada.');
    }
  };

  const handleRestore = async (t: Temporada) => {
    try {
      await restoreTemporada(t.id);
    } catch {
      setUiError('No se pudo restaurar la temporada.');
    }
  };

  const handleFinalize = async (t: Temporada) => {
    try {
      await finalizeTemporada(t.id);
    } catch {
      setUiError('No se pudo finalizar la temporada.');
    }
  };

  const handleActivateOperational = async (t: Temporada) => {
    try {
      setUiError(null);
      await activateOperationalTemporada(t.id);
    } catch (err) {
      setUiError(extractApiMessage(err, 'No se pudo activar la operaci�n de la temporada.'));
    }
  };

  const handleCosechas = (t: Temporada) => {
    const params = new URLSearchParams();
    if (huertaId) params.set('huerta_id', String(huertaId));
    if (tipo) params.set('tipo', tipo);
    if (displayHuertaNombre) params.set('huerta_nombre', displayHuertaNombre);
    if (displayPropietario !== '—') params.set('propietario', displayPropietario);

    const qs = params.toString();
    navigate(`/cosechas/${t.id}${qs ? `?${qs}` : ''}`);
  };

  const handleReporteTemporada = (t: Temporada) => {
    const params = new URLSearchParams({ anio: String(t.año) });
    if (huertaId) params.set('huerta_id', String(huertaId));
    if (displayHuertaNombre) params.set('huerta_nombre', displayHuertaNombre);
    if (tipo) params.set('tipo', tipo);
    if (displayPropietario !== '—') params.set('propietario', displayPropietario);
    navigate(`/reportes/temporada/${t.id}?${params.toString()}`);
  };

  const handlePreCosecha = (t: Temporada) => {
    const params = new URLSearchParams({ anio: String(t.año) });
    if (huertaId) params.set('huerta_id', String(huertaId));
    if (displayHuertaNombre) params.set('huerta_nombre', displayHuertaNombre);
    if (tipo) params.set('tipo', tipo);
    if (displayPropietario !== '—') params.set('propietario', displayPropietario);
    navigate(`/precosechas/${t.id}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearch('');
    setYear(null);
    setFinalizada(null);
  };

  return (
    <m.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-2">
          Gestión de Temporadas
        </Typography>
        {uiError && (
          <Typography color="error" sx={{ mb: 2 }}>
            {uiError}
          </Typography>
        )}

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

        <TemporadaToolbar
          searchValue={searchFilter}
          onSearchChange={setSearch}
          yearFilter={yearFilter}
          onYearChange={setYear}
          finalizadaFilter={finalizadaFilter}
          onFinalizadaChange={setFinalizada}
          onCreateClick={() => setCreateOpen(true)}
          canCreate={canOpenCreateDialog}
          createTooltip={createTooltip}
          totalCount={meta.count}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
        />

        <Tabs
          value={estadoFilter}
          onChange={(_, v) => setEstado(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab value="operativas" label="Operativas" />
          <Tab value="planificadas" label="Planificadas" />
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
            pageSize={meta.page_size ?? pageSize}
            metaPageSize={meta.page_size}
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
            onActivateOperational={handleActivateOperational}
            onPreCosecha={handlePreCosecha}
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

        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Nueva temporada</DialogTitle>
          <DialogContent dividers>
            <Box display="flex" flexDirection="column" gap={2} mt={0.5}>
              <Typography variant="body2" color="text.secondary">
                Huerta: {displayHuertaNombre || `#${huertaId}`}
              </Typography>
              <TextField
                label="Año"
                type="number"
                value={draftYear}
                onChange={(event) => setDraftYear(Number(event.target.value) || 0)}
                inputProps={{ min: 2000, max: currentYear + 1 }}
                error={Boolean(yearError)}
                helperText={yearError || 'Puede ser el año actual o el siguiente.'}
                fullWidth
              />
              <TextField
                label="Fecha de inicio"
                type="date"
                value={draftFechaInicio}
                onChange={(event) => setDraftFechaInicio(event.target.value)}
                inputProps={{ min: minAllowedDate, max: maxAllowedDate }}
                error={Boolean(fechaError)}
                helperText={fechaError || `Fecha seleccionada: ${formatFechaLarga(draftFechaInicio)}`}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                label="Lifecycle"
                value={draftEstadoOperativo}
                onChange={(event) => setDraftEstadoOperativo(event.target.value as 'planificada' | 'operativa')}
                fullWidth
                disabled={draftYear > currentYear}
                helperText={
                  draftYear > currentYear
                    ? 'Las temporadas futuras solo pueden crearse como planificadas.'
                    : draftEstadoOperativo === 'planificada'
                      ? 'Quedará fuera del flujo operativo hasta activar la operación.'
                      : 'Entrará al flujo operativo normal.'
                }
              >
                <MenuItem value="operativa">Operativa</MenuItem>
                <MenuItem value="planificada">Planificada</MenuItem>
              </TextField>
              {selectedYearExists && (
                <Typography color="error">
                  Ya existe una temporada para el año {draftYear} en esta huerta.
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreate} disabled={!canSubmitCreate}>
              {checkingExists ? 'Validando…' : 'Iniciar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={delDialogId != null} onClose={() => setDelDialogId(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta temporada permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialogId(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </m.div>
  );
};

export default Temporadas;

