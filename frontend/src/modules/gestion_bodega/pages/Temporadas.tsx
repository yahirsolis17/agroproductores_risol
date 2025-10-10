/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
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

  // ───────── Resolver bodega/id/query ─────────
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

  // ───────── Estado Redux (OJO: key correcta en store) ─────────
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

  // Tabs ↔ estado Redux
  useEffect(() => { setTab(estadoActual); }, [estadoActual]);
  useEffect(() => { if (tab !== estadoActual) dispatch(setEstado(tab)); }, [dispatch, tab, estadoActual]);

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
  }, [bodegaId, hasFetchedDetalle, displayNombre, displayUbicacion]);

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

  // ───────── Regla: sólo 1 temporada por AÑO (any estado) ─────────
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [existsThisYearAny, setExistsThisYearAny] = useState(false);
  const [checkingExists, setCheckingExists] = useState(false);

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

  const canCreateTemporada = typeof bodegaId === 'number' && !existsThisYearAny;
  const createTooltip = !canCreateTemporada ? 'Ya existe una temporada para este año en esta bodega.' : undefined;

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
  const handleCreate = async () => {
    if (!canCreateTemporada || typeof bodegaId !== 'number') return;
    await dispatch(
      addTemporadaBodega({
        bodegaId,
        año: currentYear,
        // fecha_inicio: new Date().toISOString().slice(0, 10), // si te lo exige el backend
      })
    ).unwrap();

    const params = buildParams();
    if (params) void dispatch(fetchTemporadasBodega(params));
  };

  const handleArchive = async (temporada: TemporadaBodega) => {
    await dispatch(archiveTemporada(temporada.id)).unwrap();
    const params = buildParams();
    if (params) void dispatch(fetchTemporadasBodega(params));
  };

  const handleRestore = async (temporada: TemporadaBodega) => {
    await dispatch(restoreTemporada(temporada.id)).unwrap();
    const params = buildParams();
    if (params) void dispatch(fetchTemporadasBodega(params));
  };

  const handleFinalize = async (temporada: TemporadaBodega) => {
    await dispatch(finalizeTemporada(temporada.id)).unwrap();
    const params = buildParams();
    if (params) void dispatch(fetchTemporadasBodega(params));
  };

  const handleAdministrar = (temporada: TemporadaBodega) => {
    if (typeof bodegaId !== 'number') return;
    navigate(`/bodega/${bodegaId}/capturas?temporada=${temporada.id}`);
  };

  const handleDelete = (temporada: TemporadaBodega) => {
    setDeleteTarget(temporada);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteTemporada(deleteTarget.id)).unwrap();
      const params = buildParams();
      if (params) void dispatch(fetchTemporadasBodega(params));
    } finally {
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
          onCreate={handleCreate}
          canCreate={canCreateTemporada && !checkingExists}
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
