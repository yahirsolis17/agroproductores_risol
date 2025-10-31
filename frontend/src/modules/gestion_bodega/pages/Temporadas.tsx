/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

import TemporadaBodegaToolbar from '../components/temporadas/TemporadaBodegaToolbar';
import TemporadaBodegaTable from '../components/temporadas/TemporadaBodegaTable';

import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  fetchTemporadasBodega,
  addTemporadaBodega,
  archiveTemporada,
  restoreTemporada,
  finalizeTemporada,
  setPage,
  setYearFilter,
  setBodegaFilter,
  setEstado,
  setFinalizadaFilter,
  deleteTemporada,
} from '../../../global/store/temporadabodegaSlice';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import { bodegaService } from '../services/bodegaService';
import temporadaBodegaService from '../services/temporadaBodegaService';

import type { TemporadaBodega } from '../types/temporadaBodegaTypes';

const sanitizeText = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

type VistaTab = 'activas' | 'archivadas' | 'todas';

// Helpers visuales para breadcrumb
const onlyName = (s?: string) => (s || '').split(',')[0].trim();
const toTitleCase = (value: string) =>
  value
    .toLocaleLowerCase('es-MX')
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toLocaleUpperCase('es-MX') + word.slice(1));

const BodegaTemporadasPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { bodegaId: urlBodegaId } = useParams<{ bodegaId?: string }>();
  const [searchParams] = useSearchParams();

  // --------- Resolver bodega/id/query ---------
  const parseNumericParam = (value?: string | null): number | undefined => {
    if (value === undefined || value === null || value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const bodegaIdFromUrl   = parseNumericParam(urlBodegaId);
  const bodegaIdFromQuery = parseNumericParam(searchParams.get('b'));
  const bodegaId          = bodegaIdFromUrl ?? bodegaIdFromQuery;

  const bodegaNombreParam    = sanitizeText(searchParams.get('bodega_nombre'));
  const bodegaUbicacionParam = sanitizeText(searchParams.get('bodega_ubicacion'));

  const [headerInfo, setHeaderInfo] = useState<{ nombre?: string; ubicacion?: string | null } | null>(null);
  const [hasFetchedDetalle, setHasFetchedDetalle] = useState(false);
  const [isBodegaActive, setIsBodegaActive] = useState<boolean | null>(null);
  const [createBlocked, setCreateBlocked] = useState<{ key: string | null; message?: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --------- Estado Redux (OJO: key correcta en store) ---------
  const { items, meta, ops, filters } = useAppSelector((state) => state.temporadasBodega);
  const finalizadaFilter = filters.finalizada ?? null;
  const estadoActual = (filters.estado ?? 'activas') as VistaTab;

  const [tab, setTab] = useState<VistaTab>(estadoActual);
  const [deleteTarget, setDeleteTarget] = useState<TemporadaBodega | null>(null);

  const emptyMessage = useMemo(() => {
    switch (tab) {
      case 'activas':
        return 'No hay temporadas activas para esta bodega.';
      case 'archivadas':
        return 'No hay temporadas archivadas para esta bodega.';
      default:
        return 'No hay temporadas registradas para esta bodega.';
    }
  }, [tab]);

  // Derivar nombre/ubicación de la lista
  const temporadaEnLista = useMemo(() => {
    if (typeof bodegaId !== 'number') return undefined;
    return (
      items.find((temporada: TemporadaBodega) => temporada.bodega_id === bodegaId) ??
      items.find((temporada: TemporadaBodega) => Boolean(sanitizeText(temporada.bodega_nombre)))
    );
  }, [items, bodegaId]);

  const derivedBodegaNombre = useMemo(
    () => sanitizeText(temporadaEnLista?.bodega_nombre ?? undefined),
    [temporadaEnLista]
  );
  const derivedBodegaUbicacion = useMemo(
    () => sanitizeText(temporadaEnLista?.bodega_ubicacion ?? undefined),
    [temporadaEnLista]
  );

  const headerNombre = useMemo(() => sanitizeText(headerInfo?.nombre), [headerInfo?.nombre]);
  const headerUbicacion = useMemo(() => sanitizeText(headerInfo?.ubicacion ?? undefined), [headerInfo?.ubicacion]);

  const displayNombre = headerNombre || derivedBodegaNombre || bodegaNombreParam;
  const displayUbicacion = headerUbicacion || derivedBodegaUbicacion || bodegaUbicacionParam;

  const bodegaDisplayName = useMemo(() => {
    if (typeof bodegaId !== 'number') return '';
    if (displayNombre && displayUbicacion) return `${displayNombre} - ${displayUbicacion}`;
    if (displayNombre) return displayNombre;
    if (displayUbicacion) return `Ubicación ${displayUbicacion}`;
    return `Bodega #${bodegaId}`;
  }, [bodegaId, displayNombre, displayUbicacion]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [existsThisYearAny, setExistsThisYearAny] = useState(false);
  const [checkingExists, setCheckingExists] = useState(false);

  // Tabs -> estado Redux
  useEffect(() => { setTab(estadoActual); }, [estadoActual]);
  useEffect(() => { if (tab !== estadoActual) dispatch(setEstado(tab)); }, [dispatch, tab, estadoActual]);
  useEffect(() => {
    if (createBlocked?.key === 'violacion_unicidad_año' && !existsThisYearAny) {
      setCreateBlocked(null);
    }
  }, [existsThisYearAny, createBlocked]);
  useEffect(() => {
    if (createBlocked?.key === 'bodega_archivada_no_permite_temporadas' && isBodegaActive) {
      setCreateBlocked(null);
    }
  }, [isBodegaActive, createBlocked]);

  // Limpia target al cambiar bodega
  useEffect(() => { setDeleteTarget(null); }, [bodegaId]);

  // Fija filtro bodega en slice
  useEffect(() => {
    const nextBodegaId = typeof bodegaId === 'number' ? bodegaId : undefined;
    if (filters.bodegaId !== nextBodegaId) dispatch(setBodegaFilter(nextBodegaId));
  }, [dispatch, bodegaId, filters.bodegaId]);

  // Header desde query y reset de finalizada
  useEffect(() => {
    if (typeof bodegaId !== 'number') {
      setHeaderInfo(null);
      setHasFetchedDetalle(false);
      setIsBodegaActive(null);
      setCreateBlocked(null);
      dispatch(setFinalizadaFilter(null));
      return;
    }

    if (bodegaNombreParam || bodegaUbicacionParam) {
      setHeaderInfo({
        nombre: bodegaNombreParam ?? undefined,
        ubicacion: bodegaUbicacionParam ?? null,
      });
    } else {
      setHeaderInfo(null);
    }

    setHasFetchedDetalle(false);
    setCreateBlocked(null);
    dispatch(setFinalizadaFilter(null));
  }, [dispatch, bodegaId, bodegaNombreParam, bodegaUbicacionParam]);

  // Reflejar en header lo que venga de la lista
  useEffect(() => {
    if (!derivedBodegaNombre && !derivedBodegaUbicacion) return;

    setHeaderInfo((prev) => {
      const nextNombre = derivedBodegaNombre ?? prev?.nombre;
      const nextUbicacion = derivedBodegaUbicacion ?? prev?.ubicacion ?? null;

      const prevNombre = sanitizeText(prev?.nombre);
      const prevUbicacion = sanitizeText(prev?.ubicacion ?? undefined);
      const nextNombreSanitized = sanitizeText(nextNombre);
      const nextUbicacionSanitized = sanitizeText(nextUbicacion ?? undefined);

      if (prevNombre === nextNombreSanitized && prevUbicacion === nextUbicacionSanitized) return prev;
      return { nombre: nextNombre, ubicacion: nextUbicacion };
    });
  }, [derivedBodegaNombre, derivedBodegaUbicacion]);

  // Estado activo de la bodega desde la lista (si viene incluido)
  useEffect(() => {
    if (typeof bodegaId !== 'number') return;
    const temporadaRelacionada = items.find(
      (temporada: TemporadaBodega) =>
        temporada.bodega_id === bodegaId && typeof temporada.bodega_is_active === 'boolean'
    );
    if (temporadaRelacionada) {
      const nextValue = Boolean(temporadaRelacionada.bodega_is_active);
      setIsBodegaActive((prev) => (prev === nextValue ? prev : nextValue));
    }
  }, [items, bodegaId]);

  // Cargar detalle si falta nombre/ubicación
  useEffect(() => {
    if (typeof bodegaId !== 'number') return;

    const hasNombre = Boolean(displayNombre);
    const hasUbicacion = Boolean(displayUbicacion);

    if (hasFetchedDetalle || (hasNombre && hasUbicacion)) {
      if (!hasFetchedDetalle && hasNombre && hasUbicacion) setHasFetchedDetalle(true);
      return;
    }

    let cancelled = false;
    setHasFetchedDetalle(true);

    (async () => {
      try {
        const detalle = await bodegaService.getById(bodegaId);
        if (cancelled) return;
        const activeFlag = typeof detalle?.is_active === 'boolean' ? detalle.is_active : null;
        setIsBodegaActive(activeFlag);
        if (activeFlag && createBlocked?.key === 'bodega_archivada_no_permite_temporadas') {
          setCreateBlocked(null);
        }
        setHeaderInfo({
          nombre: sanitizeText(detalle?.nombre) ?? displayNombre ?? `#${bodegaId}`,
          ubicacion: sanitizeText(detalle?.ubicacion) ?? displayUbicacion ?? null,
        });
      } catch {
        if (!cancelled) {
          setHeaderInfo((prev) => {
            if (prev) return prev;
            if (displayNombre || displayUbicacion) {
              return {
                nombre: displayNombre ?? `#${bodegaId}`,
                ubicacion: displayUbicacion ?? null,
              };
            }
            return prev;
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [bodegaId, hasFetchedDetalle, displayNombre, displayUbicacion, createBlocked?.key]);

  // Breadcrumbs
  useEffect(() => {
    if (typeof bodegaId !== 'number') {
      dispatch(clearBreadcrumbs());
      return;
    }

    const baseNombre = onlyName(displayNombre || '');
    const formattedNombre = baseNombre ? toTitleCase(baseNombre) : `#${bodegaId}`;

    dispatch(setBreadcrumbs(breadcrumbRoutes.bodegaTemporadas(bodegaId, formattedNombre)));
  }, [dispatch, bodegaId, displayNombre]);
  useEffect(() => () => { dispatch(clearBreadcrumbs()); }, [dispatch]);

  const refreshBodegaEstado = useCallback(async () => {
    if (typeof bodegaId !== 'number') return;
    try {
      const detalle = await bodegaService.getById(bodegaId);
      const activeFlag = typeof detalle?.is_active === 'boolean' ? detalle.is_active : null;
      setIsBodegaActive(activeFlag);
      if (activeFlag && createBlocked?.key === 'bodega_archivada_no_permite_temporadas') {
        setCreateBlocked(null);
      }
    } catch {
      /* noop */
    }
  }, [bodegaId, createBlocked?.key]);

  // Fetch listado
  useEffect(() => {
    if (typeof bodegaId !== 'number') return;
    const params: Record<string, any> = {
      page: filters.page,
      page_size: filters.page_size,
      ordering: filters.ordering,
      estado: filters.estado,
      bodegaId,
      year: filters.year,
    };
    if (finalizadaFilter !== null) params.finalizada = finalizadaFilter;
    void dispatch(fetchTemporadasBodega(params));
  }, [
    dispatch,
    bodegaId,
    filters.page,
    filters.page_size,
    filters.ordering,
    filters.estado,
    filters.year,
    finalizadaFilter,
  ]);

  // --------- Regla: sólo 1 temporada por AÑO (any estado) ---------

  useEffect(() => {
    let cancelled = false;
    if (typeof bodegaId !== 'number') { setExistsThisYearAny(false); return; }

    (async () => {
      setCheckingExists(true);
      try {
        const res = await temporadaBodegaService.list({
          page: 1,
          page_size: 1,
          estado: 'todas',
          bodegaId,
          año: currentYear,
        });
        if (!cancelled) {
          const count = res?.data?.meta?.count ?? 0;
          setExistsThisYearAny(count > 0);
        }
      } catch {
        if (!cancelled) setExistsThisYearAny(false);
      } finally {
        if (!cancelled) setCheckingExists(false);
      }
    })();

    return () => { cancelled = true; };
  }, [bodegaId, currentYear, items.length]);

  const bodegaInactiva = isBodegaActive === false;
  const canCreateTemporada = typeof bodegaId === 'number' && !existsThisYearAny && !bodegaInactiva;
  const createTooltip = useMemo(() => {
    if (bodegaInactiva) {
      return 'La bodega está archivada; no se pueden crear temporadas.';
    }
    if (createBlocked?.key === 'bodega_archivada_no_permite_temporadas') {
      return createBlocked.message ?? 'La bodega está archivada; no se pueden crear temporadas.';
    }
    if (existsThisYearAny) {
      return 'Ya existe una temporada para este año en esta bodega.';
    }
    if (createBlocked?.message) {
      return createBlocked.message;
    }
    return undefined;
  }, [bodegaInactiva, existsThisYearAny, createBlocked]);
  const canTriggerCreate = canCreateTemporada && !checkingExists;

  // Filtros UI
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.year) count += 1;
    if (finalizadaFilter !== null) count += 1;
    return count;
  }, [filters.year, finalizadaFilter]);

  const handleFinalizadaChange = (value: boolean | null) => {
    dispatch(setFinalizadaFilter(value ?? null));
  };

  const buildParams = () => {
    if (typeof bodegaId !== 'number') return null;
    const params: Record<string, any> = {
      page: filters.page,
      page_size: filters.page_size,
      ordering: filters.ordering,
      estado: filters.estado ?? tab,
      bodegaId,
      year: filters.year,
    };
    if (finalizadaFilter !== null) params.finalizada = finalizadaFilter;
    return params;
  };

  // Acciones
  const handleRequestCreate = () => {
    if (!canTriggerCreate) return;
    setConfirmOpen(true);
  };

  const handleCreate = async () => {
    if (!canTriggerCreate || typeof bodegaId !== 'number') return;
    let shouldReload = false;
    try {
      await dispatch(
        addTemporadaBodega({
          bodegaId,
          año: currentYear,
        })
      ).unwrap();
      setCreateBlocked(null);
      setConfirmOpen(false);
      shouldReload = true;
    } catch (err: any) {
      const errorKey = typeof err === 'object' && err ? err.key ?? err?.message : typeof err === 'string' ? err : null;
      const errorMessage = typeof err === 'object' && err ? err.message ?? err?.key : typeof err === 'string' ? err : undefined;
      if (errorKey === 'bodega_archivada_no_permite_temporadas') {
        setCreateBlocked({ key: errorKey, message: errorMessage });
      } else if (errorKey === 'violacion_unicidad_año') {
        setCreateBlocked({
          key: errorKey,
          message: errorMessage ?? 'Ya existe una temporada para este año en esta bodega.',
        });
        setExistsThisYearAny(true);
      } else if (errorMessage) {
        setCreateBlocked({ key: errorKey ?? null, message: errorMessage });
      }
      shouldReload = true;
    } finally {
      if (shouldReload) {
        const params = buildParams();
        if (params) void dispatch(fetchTemporadasBodega(params));
      }
      void refreshBodegaEstado();
    }
  };

  const handleArchive = async (temporada: TemporadaBodega) => {
    try {
      await dispatch(archiveTemporada(temporada.id)).unwrap();
    } catch (err) {
      // notificación ya gestionada en el thunk
    } finally {
      const params = buildParams();
      if (params) void dispatch(fetchTemporadasBodega(params));
      void refreshBodegaEstado();
    }
  };

  const handleRestore = async (temporada: TemporadaBodega) => {
    try {
      await dispatch(restoreTemporada(temporada.id)).unwrap();
    } catch (err: any) {
      const errorKey = typeof err === 'object' && err ? err.key ?? err?.message : typeof err === 'string' ? err : null;
      const errorMessage = typeof err === 'object' && err ? err.message ?? err?.key : typeof err === 'string' ? err : undefined;
      if (errorKey === 'bodega_archivada_no_permite_temporadas') {
        setCreateBlocked({ key: errorKey, message: errorMessage });
      }
    } finally {
      const params = buildParams();
      if (params) void dispatch(fetchTemporadasBodega(params));
      void refreshBodegaEstado();
    }
  };

  const handleFinalize = async (temporada: TemporadaBodega) => {
    try {
      await dispatch(finalizeTemporada(temporada.id)).unwrap();
    } catch (err) {
      // notificación ya mostrada
    } finally {
      const params = buildParams();
      if (params) void dispatch(fetchTemporadasBodega(params));
      void refreshBodegaEstado();
    }
  };

  const handleAdministrar = (temporada: TemporadaBodega) => {
    if (typeof bodegaId !== 'number') return;
    navigate(`/bodega/tablero?temporada=${temporada.id}&bodega=${bodegaId}`);
  };

  const handleDelete = (temporada: TemporadaBodega) => {
    setDeleteTarget(temporada);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    let shouldReload = false;
    try {
      await dispatch(deleteTemporada(deleteTarget.id)).unwrap();
      shouldReload = true;
    } catch (err) {
      shouldReload = true;
    } finally {
      if (shouldReload) {
        const params = buildParams();
        if (params) void dispatch(fetchTemporadasBodega(params));
      }
      void refreshBodegaEstado();
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => setDeleteTarget(null);

  // Render
  if (typeof bodegaId !== 'number') {
    return (
      <Box p={2}>
        <Paper className="p-6 rounded-2xl">
          <Typography variant="h5" gutterBottom>
            Temporadas de Bodega
          </Typography>
          <Typography color="text.secondary">
            Selecciona primero una bodega desde la lista de <strong>Bodegas</strong> para ver sus temporadas.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Paper elevation={3} className="p-6 sm:p-8 rounded-2xl bg-white">
        <Typography variant="h4" className="font-bold mb-1">
          Temporadas
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-4">
          {bodegaDisplayName}
        </Typography>
        <Divider className="mb-4" />

        <Tabs
          value={tab}
          onChange={(_, value: VistaTab) => setTab(value)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="activas" label="Activas" />
          <Tab value="archivadas" label="Archivadas" />
          <Tab value="todas" label="Todas" />
        </Tabs>

        <TemporadaBodegaToolbar
          yearFilter={filters.year ?? null}
          onYearChange={(year) => dispatch(setYearFilter(year ?? undefined))}
          finalizadaFilter={finalizadaFilter}
          onFinalizadaChange={handleFinalizadaChange}
          onCreate={handleRequestCreate}
          canCreate={canTriggerCreate}
          createTooltip={createTooltip}
          totalCount={meta.count}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={() => {
            dispatch(setYearFilter(undefined));
            dispatch(setFinalizadaFilter(null));
          }}
        />

        <TemporadaBodegaTable
          data={items}
          page={filters.page}
          pageSize={filters.page_size}
          count={meta.count}
          loading={ops.listing}
          emptyMessage={emptyMessage}
          onPageChange={(page) => dispatch(setPage(page))}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onFinalize={handleFinalize}
          onAdministrar={handleAdministrar}
        />

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar nueva temporada</DialogTitle>
          <DialogContent dividers>
            <Typography>Año: {currentYear}</Typography>
            <Typography>
              Bodega: {displayNombre ? displayNombre : `#${bodegaId}`}
            </Typography>
            {createTooltip ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {createTooltip}
              </Typography>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={!canTriggerCreate}
            >
              Iniciar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={Boolean(deleteTarget)} onClose={cancelDelete} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent dividers>
            <Typography>
              {deleteTarget ? `¿Eliminar la temporada ${deleteTarget.año} de esta bodega?` : ''}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete} disabled={ops.deleting}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default BodegaTemporadasPage;
