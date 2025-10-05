// src/modules/gestion_bodega/pages/Temporadas.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Paper, Typography, Divider } from '@mui/material';

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
} from '../../../global/store/temporadabodegaSlice';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import { bodegaService } from '../services/bodegaService';

import type { TemporadaBodega } from '../types/temporadaBodegaTypes';

const BodegaTemporadasPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { bodegaId: urlBodegaId } = useParams<{ bodegaId?: string }>();
  const [searchParams] = useSearchParams();

  const bodegaIdFromUrl = urlBodegaId ? Number(urlBodegaId) : undefined;
  const bodegaIdFromQuery = searchParams.get('b') ? Number(searchParams.get('b')) : undefined;
  const bodegaId = bodegaIdFromUrl ?? bodegaIdFromQuery;

  const [bodegaNombre, setBodegaNombre] = useState<string | undefined>(undefined);
  const [hasFetchedNombre, setHasFetchedNombre] = useState(false);

  const { items, meta, ops, filters } = useAppSelector((state) => state.temporadasBodega);
  const [finalizadaFilter, setFinalizadaFilter] = useState<boolean | null>(null);

  useEffect(() => {
    setBodegaNombre(undefined);
    setHasFetchedNombre(false);
  }, [bodegaId]);

  useEffect(() => {
    if (!bodegaId) return;

    const itemWithNombre = items.find((temporada) => temporada.bodega_nombre);
    const nombreDesdeListado = itemWithNombre?.bodega_nombre ?? undefined;
    if (nombreDesdeListado) {
      setBodegaNombre(nombreDesdeListado);
      if (!hasFetchedNombre) {
        setHasFetchedNombre(true);
      }
      return;
    }

    if (hasFetchedNombre) return;

    let cancelled = false;
    setHasFetchedNombre(true);

    (async () => {
      try {
        const detalle = await bodegaService.getById(bodegaId);
        if (!cancelled) {
          setBodegaNombre(detalle?.nombre ?? undefined);
        }
      } catch {
        if (!cancelled) {
          setBodegaNombre(undefined);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bodegaId, items, hasFetchedNombre]);

  useEffect(() => {
    if (!bodegaId) {
      dispatch(setBreadcrumbs([
        { label: 'Bodegas', path: '/bodega' },
        { label: 'Temporadas', path: '' },
      ]));
      return;
    }

    dispatch(setBreadcrumbs(breadcrumbRoutes.bodegaTemporadas(bodegaId, bodegaNombre)));
  }, [dispatch, bodegaId, bodegaNombre]);

  useEffect(() => {
    return () => {
      dispatch(clearBreadcrumbs());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!bodegaId) return;

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
    if (!bodegaId) return null;
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
    return params;
  };

  const handleCreate = async () => {
    if (!bodegaId) return;
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
    if (!bodegaId) return;
    navigate(`/bodega/${bodegaId}/capturas?temporada=${temporada.id}`);
  };

  const handleDelete = (_temporada: TemporadaBodega) => {
    /* Eliminar definitivo pendiente */
  };

  if (!bodegaId) {
    return (
      <Box p={2}>        <Paper className="p-6 rounded-2xl">
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
          {bodegaNombre ?? `Bodega #${bodegaId}`}
        </Typography>
        <Divider className="mb-4" />

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
