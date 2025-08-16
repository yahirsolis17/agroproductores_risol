/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState, useEffect } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

import { useInversiones } from '../hooks/useInversiones';
import { InversionHuerta, InversionCreateData, InversionUpdateData } from '../types/inversionTypes';

import InversionToolbar from '../components/finanzas/InversionToolbar';
import InversionTable   from '../components/finanzas/InversionTable';
import InversionFormModal from '../components/finanzas/InversionFormModal';
import { categoriaInversionService } from '../services/categoriaInversionService';
import { temporadaService } from '../services/temporadaService';
import { cosechaService } from '../services/cosechaService';

const PAGE_SIZE = 10;

const Inversion: React.FC = () => {
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
    temporadaId,
    cosechaId,
  } = useInversiones();

  /* ---------- Cargar TODAS las categorías (para nombres y filtro) ---------- */
  const [catsLoading, setCatsLoading] = useState(false);
  const [categorias, setCategorias] = useState<{ id:number; nombre:string; is_active:boolean }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCatsLoading(true);
        const { categorias } = await categoriaInversionService.listAll(1, 1000);
        if (!alive) return;
        setCategorias(categorias);
      } finally {
        setCatsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ---------- Estado de temporada y cosecha ---------- */
  const [tempState, setTempState] = useState<{ is_active: boolean; finalizada: boolean } | null>(null);
  const [cosechaState, setCosechaState] = useState<{ is_active: boolean; finalizada: boolean } | null>(null);

  useEffect(() => {
    if (!temporadaId || !cosechaId) return;
    let alive = true;
    (async () => {
      try {
        const [
          { data: { temporada } },
          { data: { cosecha } },
        ] = await Promise.all([
          temporadaService.getById(temporadaId),
          cosechaService.getById(cosechaId),
        ]);
        if (!alive) return;
        setTempState({
          is_active: temporada.is_active,
          finalizada: temporada.finalizada,
        });
        setCosechaState({
          is_active: cosecha.is_active,
          finalizada: cosecha.finalizada,
        });
      } catch {
        if (!alive) return;
        setTempState(null);
        setCosechaState(null);
      }
    })();
    return () => { alive = false; };
  }, [temporadaId, cosechaId]);

  const { canCreate, createTooltip } = useMemo(() => {
    if (!tempState || !cosechaState) {
      return { canCreate: false, createTooltip: '' };
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
  }, [tempState, cosechaState]);

  // 🔔 Escuchar creaciones/ediciones para actualizar el map sin recargar
  useEffect(() => {
    const upsert = (cat: { id:number; nombre:string; is_active:boolean; archivado_en?: string|null }) => {
      setCategorias(prev => {
        const exists = prev.some(c => c.id === cat.id);
        const next = exists
          ? prev.map(c => (c.id === cat.id ? { ...c, ...cat } : c))
          : [cat, ...prev];
        return next.sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
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

  const handleClearFilters = () => changeFilters({});

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
    // no cerramos/abrimos nada extra; el modal se cierra desde el propio form
  };

  // Confirm delete
  const [delId, setDelId] = useState<number | null>(null);
  const confirmDelete = async () => {
    if (delId == null) return;
    await removeInversion(delId);
    setDelId(null);
  };

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
          setCategorias(prev => [cat, ...prev].sort((a,b)=>a.nombre.localeCompare(b.nombre)))
        }
      />

      {/* Siempre montada → TableLayout maneja su propio skeleton con `loading` */}
      <InversionTable
        data={inversiones}
        page={page}
        pageSize={PAGE_SIZE}
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
