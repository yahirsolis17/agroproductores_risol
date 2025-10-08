// src/modules/gestion_bodega/pages/Temporadas.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Paper, Typography, Divider, Tabs, Tab } from '@mui/material';

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
} from '../../../global/store/temporadabodegaSlice';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import { bodegaService } from '../services/bodegaService';

import type { TemporadaBodega } from '../types/temporadaBodegaTypes';

const sanitizeText = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

type VistaTab = 'activos' | 'archivados' | 'todos';

const BodegaTemporadasPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { bodegaId: urlBodegaId } = useParams<{ bodegaId?: string }>();
  const [searchParams] = useSearchParams();

  const parseNumericParam = (value?: string | null): number | undefined => {
    if (value === undefined || value === null || value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const bodegaIdFromUrl = parseNumericParam(urlBodegaId);
  const bodegaIdFromQuery = parseNumericParam(searchParams.get('b'));
  const bodegaId = bodegaIdFromUrl ?? bodegaIdFromQuery;

  const bodegaNombreParam = sanitizeText(searchParams.get('bodega_nombre'));
  const bodegaUbicacionParam = sanitizeText(searchParams.get('bodega_ubicacion'));

  const [headerInfo, setHeaderInfo] = useState<{ nombre?: string; ubicacion?: string | null } | null>(null);
  const [hasFetchedDetalle, setHasFetchedDetalle] = useState(false);

  const { items, meta, ops, filters } = useAppSelector((state) => state.temporadasBodega);
  const [finalizadaFilter, setFinalizadaFilter] = useState<boolean | null>(null);
  const estadoActual = (filters.estado ?? 'activos') as VistaTab;
  const [tab, setTab] = useState<VistaTab>(estadoActual);

  const temporadaEnLista = useMemo(() => {
    if (typeof bodegaId !== 'number') return undefined;
    return (
      items.find((temporada) => temporada.bodega_id === bodegaId) ??
      items.find((temporada) => sanitizeText(temporada.bodega_nombre))
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
  const headerUbicacion = useMemo(
    () => sanitizeText(headerInfo?.ubicacion ?? undefined),
    [headerInfo?.ubicacion]
  );

  const displayNombre = headerNombre || derivedBodegaNombre || bodegaNombreParam;
  const displayUbicacion = headerUbicacion || derivedBodegaUbicacion || bodegaUbicacionParam;

  const bodegaDisplayName = useMemo(() => {
    if (typeof bodegaId !== 'number') return '';
    if (displayNombre && displayUbicacion) return `${displayNombre} - ${displayUbicacion}`;
    if (displayNombre) return displayNombre;
    if (displayUbicacion) return `Ubicación ${displayUbicacion}`;
    return `Bodega #${bodegaId}`;
  }, [bodegaId, displayNombre, displayUbicacion]);

  const bodegaBreadcrumbLabel = useMemo(() => {
    if (typeof bodegaId !== 'number') return '';
    if (displayNombre && displayUbicacion) return `${displayNombre} - ${displayUbicacion}`;
    if (displayNombre) return displayNombre;
    if (displayUbicacion) return displayUbicacion;
    return `#${bodegaId}`;
  }, [bodegaId, displayNombre, displayUbicacion]);

  useEffect(() => {
    setTab(estadoActual);
  }, [estadoActual]);

  useEffect(() => {
    if (tab !== estadoActual) {
      dispatch(setEstado(tab));
    }
  }, [dispatch, tab, estadoActual]);

  useEffect(() => {
    const nextBodegaId = typeof bodegaId === 'number' ? bodegaId : undefined;
    if (filters.bodegaId !== nextBodegaId) {
      dispatch(setBodegaFilter(nextBodegaId));
    }
  }, [dispatch, bodegaId, filters.bodegaId]);

  useEffect(() => {
    if (typeof bodegaId !== 'number') {
      setHeaderInfo(null);
      setHasFetchedDetalle(false);
      setFinalizadaFilter(null);
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
    setFinalizadaFilter(null);
  }, [bodegaId, bodegaNombreParam, bodegaUbicacionParam]);

  useEffect(() => {
    if (!derivedBodegaNombre && !derivedBodegaUbicacion) return;

    setHeaderInfo((prev) => {
      const nextNombre = derivedBodegaNombre ?? prev?.nombre;
      const nextUbicacion = derivedBodegaUbicacion ?? prev?.ubicacion ?? null;

      const prevNombre = sanitizeText(prev?.nombre);
      const prevUbicacion = sanitizeText(prev?.ubicacion ?? undefined);
      const nextNombreSanitized = sanitizeText(nextNombre);
      const nextUbicacionSanitized = sanitizeText(nextUbicacion ?? undefined);

      if (prevNombre === nextNombreSanitized && prevUbicacion === nextUbicacionSanitized) {
        return prev;
      }

      return {
        nombre: nextNombre,
        ubicacion: nextUbicacion,
      };
    });
  }, [derivedBodegaNombre, derivedBodegaUbicacion]);

  useEffect(() => {
    if (typeof bodegaId !== 'number') return;

    const hasNombre = Boolean(displayNombre);
    const hasUbicacion = Boolean(displayUbicacion);

    if (hasFetchedDetalle || (hasNombre && hasUbicacion)) {
      if (!hasFetchedDetalle && hasNombre && hasUbicacion) {
        setHasFetchedDetalle(true);
      }
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

    return () => {
      cancelled = true;
    };
  }, [bodegaId, hasFetchedDetalle, displayNombre, displayUbicacion]);

  useEffect(() => {
    if (typeof bodegaId !== 'number') {
      dispatch(setBreadcrumbs([
        { label: 'Bodegas', path: '/bodega' },
        { label: 'Temporadas', path: '' },
      ]));
      return;
    }

    dispatch(setBreadcrumbs(breadcrumbRoutes.bodegaTemporadas(bodegaId, bodegaBreadcrumbLabel)));
  }, [dispatch, bodegaId, bodegaBreadcrumbLabel]);

  useEffect(() => {
    return () => {
      dispatch(clearBreadcrumbs());
    };
  }, [dispatch]);

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
    if (finalizadaFilter !== null) {
      params.finalizada = finalizadaFilter;
    }

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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.year) count += 1;
    if (finalizadaFilter !== null) count += 1;
    return count;
  }, [filters.year, finalizadaFilter]);

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
    if (finalizadaFilter !== null) {
      params.finalizada = finalizadaFilter;
    }
    return params;
  };

  const handleCreate = async () => {
    if (typeof bodegaId !== 'number') return;
    const currentYear = new Date().getFullYear();

    await dispatch(addTemporadaBodega({
      bodegaId,
      ['a\u00f1o']: currentYear,
      fecha_inicio: null,
      fecha_fin: null,
      finalizada: false,
      is_active: true,
    } as any));

    const params = buildParams();
    if (params) {
      void dispatch(fetchTemporadasBodega(params));
    }
  };

  const handleArchive = async (temporada: TemporadaBodega) => {
    await dispatch(archiveTemporada(temporada.id));
    const params = buildParams();
    if (params) {
      void dispatch(fetchTemporadasBodega(params));
    }
  };

  const handleRestore = async (temporada: TemporadaBodega) => {
    await dispatch(restoreTemporada(temporada.id));
    const params = buildParams();
    if (params) {
      void dispatch(fetchTemporadasBodega(params));
    }
  };

  const handleFinalize = async (temporada: TemporadaBodega) => {
    await dispatch(finalizeTemporada(temporada.id));
    const params = buildParams();
    if (params) {
      void dispatch(fetchTemporadasBodega(params));
    }
  };

  const handleAdministrar = (temporada: TemporadaBodega) => {
    if (typeof bodegaId !== 'number') return;
    navigate(`/bodega/${bodegaId}/capturas?temporada=${temporada.id}`);
  };

  const handleDelete = (_temporada: TemporadaBodega) => {
    /* Eliminar definitivo pendiente */
  };

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
          <Tab value="activos" label="Activas" />
          <Tab value="archivados" label="Archivadas" />
          <Tab value="todos" label="Todas" />
        </Tabs>

        <TemporadaBodegaToolbar
          yearFilter={filters.year ?? null}
          onYearChange={(year) => dispatch(setYearFilter(year ?? undefined))}
          finalizadaFilter={finalizadaFilter}
          onFinalizadaChange={setFinalizadaFilter}
          onCreate={handleCreate}
          canCreate
          totalCount={meta.count}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={() => {
            dispatch(setYearFilter(undefined));
            setFinalizadaFilter(null);
          }}
        />

        <TemporadaBodegaTable
          data={items}
          page={filters.page}
          pageSize={filters.page_size}
          count={meta.count}
          loading={ops.listing}
          emptyMessage="No hay temporadas registradas para esta bodega."
          onPageChange={(page) => dispatch(setPage(page))}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onFinalize={handleFinalize}
          onAdministrar={handleAdministrar}
        />
      </Paper>
    </motion.div>
  );
};

export default BodegaTemporadasPage;
