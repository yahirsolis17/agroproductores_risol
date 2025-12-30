// src/modules/gestion_huerta/pages/Inversion.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState, useEffect } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useInversiones } from '../hooks/useInversiones';
import { InversionHuerta, InversionCreateData, InversionUpdateData } from '../types/inversionTypes';

import InversionToolbar from '../components/finanzas/InversionToolbar';
import InversionTable   from '../components/finanzas/InversionTable';
import InversionFormModal from '../components/finanzas/InversionFormModal';
import { categoriaInversionService } from '../services/categoriaInversionService';
import { sortForDisplay } from '../../../global/utils/uiTransforms';

const PAGE_SIZE = 10;

type EstadoData = { is_active: boolean; finalizada: boolean };

type InversionProps = {
  temporadaState: EstadoData | null;
  cosechaState: EstadoData | null;
  hasContext: boolean;
};

const Inversion: React.FC<InversionProps> = ({ temporadaState, cosechaState, hasContext }) => {
  const navigate = useNavigate();

  const {
    inversiones,
    loading,
    page,
    meta,
    filters,
    changePage,
    changeFilters,
    addInversion,
    editInversion,
    archive,
    restore,
    removeInversion,
  } = useInversiones();

  /* ---------- Cargar TODAS las categorías (para nombres y filtro) ---------- */
  const [catsLoading, setCatsLoading] = useState(false);
  const [categorias, setCategorias] = useState<{ id:number; nombre:string; is_active:boolean }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCatsLoading(true);
        const res = await categoriaInversionService.listAll(1, 1000);
        if (!alive) return;
        setCategorias(res.data.results);
      } finally {
        setCatsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const tempState = temporadaState;

  const { canCreate, createTooltip } = useMemo(() => {
    if (!hasContext) {
      return { canCreate: false, createTooltip: 'No hay contexto. Regresa a Cosechas.' };
    }
    if (!tempState || !cosechaState) {
      return { canCreate: false, createTooltip: 'Cargando estado de temporada y cosecha…' };
    }
    if (!tempState.is_active) {
      return { canCreate: false, createTooltip: 'No se pueden registrar inversiones en una temporada archivada.' };
    }
    if (tempState.finalizada) {
      return { canCreate: false, createTooltip: 'No se pueden registrar inversiones en una temporada finalizada.' };
    }
    if (!cosechaState.is_active) {
      return { canCreate: false, createTooltip: 'No se pueden registrar inversiones en una cosecha archivada.' };
    }
    if (cosechaState.finalizada) {
      return { canCreate: false, createTooltip: 'No se pueden registrar inversiones en una cosecha finalizada.' };
    }
    return { canCreate: true, createTooltip: '' };
  }, [hasContext, tempState, cosechaState]);

  // 🔔 Escuchar creaciones/ediciones para actualizar el map sin recargar
  useEffect(() => {
    const upsert = (cat: { id:number; nombre:string; is_active:boolean; archivado_en?: string|null }) => {
      setCategorias(prev => {
        const exists = prev.some(c => c.id === cat.id);
        const next = exists
          ? prev.map(c => (c.id === cat.id ? { ...c, ...cat } : c))
          : [cat, ...prev];
        return sortForDisplay(next, (a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      });
    };
    const onCreated = (e: any) => e?.detail && upsert(e.detail);
    const onUpdated = (e: any) => e?.detail && upsert(e.detail);

    window.addEventListener('categoria-created', onCreated as any);
    window.addEventListener('categoria-updated', onUpdated as any);
    return () => {
      window.removeEventListener('categoria-created', onCreated as any);
      window.removeEventListener('categoria-updated', onUpdated as any);
    };
  }, []);

  const categoriesMap = useMemo<Record<number,string>>(
    () => Object.fromEntries(categorias.map(c => [c.id, c.nombre])),
    [categorias]
  );

  // Conteo de filtros activos
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.estado && filters.estado !== 'activas') c++;
    if (filters.categoria)  c++;
    if (filters.fechaDesde) c++;
    if (filters.fechaHasta) c++;
    return c;
  }, [filters]);

  const handleClearFilters = () => changeFilters({ estado: 'activas' });


  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InversionHuerta | null>(null);

  const openCreate = () => {
    if (!canCreate) return;
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit   = (inv: InversionHuerta) => { setEditTarget(inv); setModalOpen(true); };

  // onSubmit
  const handleSubmit = async (vals: InversionCreateData | InversionUpdateData) => {
    if (editTarget) {
      await editInversion(editTarget.id, vals as InversionUpdateData);
    } else {
      await addInversion(vals as InversionCreateData);
    }
    // el modal se cierra desde el propio form
  };

  // Confirm delete
  const [delId, setDelId] = useState<number | null>(null);
  const confirmDelete = async () => {
    if (delId == null) return;
    await removeInversion(delId);
    setDelId(null);
  };

  if (!hasContext) {
    return (
      <Box p={2}>
        <InversionToolbar
          filters={filters}
          onFiltersChange={changeFilters}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
          onCreateClick={openCreate}
          canCreate={false}
          createTooltip="No hay contexto. Regresa a Cosechas."
          totalCount={meta.count}
          categoriesOptions={categorias}
          categoriesLoading={catsLoading}
        />
        <Box mt={2}>
          <Button variant="contained" onClick={() => navigate('/cosechas')}>
            Volver a Cosechas
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <InversionToolbar
        filters={filters}
        onFiltersChange={changeFilters}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        onCreateClick={openCreate}
        canCreate={canCreate}
        createTooltip={createTooltip}
        totalCount={meta.count}
        // opciones para el filtro de categoría
        categoriesOptions={categorias}
        categoriesLoading={catsLoading}
        onCategoryCreated={(cat) =>
          setCategorias(prev => sortForDisplay([cat, ...prev], (a, b) => a.nombre.localeCompare(b.nombre, 'es')))
        }
      />

      {/* Siempre montada → TableLayout maneja su propio skeleton con `loading` */}
      <InversionTable
        data={inversiones}
        page={page}
        pageSize={meta.page_size ?? PAGE_SIZE}
        metaPageSize={meta.page_size}
        count={meta.count}
        onPageChange={changePage}
        onEdit={openEdit}
        onArchive={(id) => archive(id)}
        onRestore={(id) => restore(id)}
        onDelete={(id) => setDelId(id)}
        categoriesMap={categoriesMap}
        loading={loading}
      />

      <InversionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editTarget ?? undefined}
      />

      <Dialog open={delId != null} onClose={() => setDelId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Eliminar esta inversión permanentemente?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDelId(null)}>Cancelar</Button>
          <Button color="error" onClick={confirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inversion;
