/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState, useEffect } from 'react';
import { Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

import { useInversiones } from '../hooks/useInversiones';
import { InversionHuerta, InversionCreateData, InversionUpdateData } from '../types/inversionTypes';

import InversionToolbar from '../components/finanzas/InversionToolbar';
import InversionTable   from '../components/finanzas/InversionTable';
import InversionFormModal from '../components/finanzas/InversionFormModal';
import { categoriaInversionService } from '../services/categoriaInversionService';

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

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (inv: InversionHuerta) => { setEditTarget(inv); setModalOpen(true); };

  // onSubmit
  const handleSubmit = async (vals: InversionCreateData | InversionUpdateData) => {
    if (editTarget) {
      await editInversion(editTarget.id, vals as InversionUpdateData);
    } else {
      await addInversion(vals as InversionCreateData);
    }
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
        totalCount={meta.count}
        // opciones para el filtro de categoría (orden alfabético y agrupado se hacen en el propio toolbar)
        categoriesOptions={categorias}
        categoriesLoading={catsLoading}
        // callback opcional: cuando se crea una categoría desde el filtro, actualizamos lista local
        onCategoryCreated={(cat) => setCategorias(prev => [cat, ...prev].sort((a,b)=>a.nombre.localeCompare(b.nombre)))}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : (
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
          categoriesMap={categoriesMap} // ⬅️ ahora sí, nombre en la tabla
        />
      )}

      <InversionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editTarget ?? undefined}
      />

      <Dialog open={delId != null} onClose={() => setDelId(null)}>
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
