import React, { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

import CapturasTable from "../../../modules/gestion_bodega/components/capturas/CapturasTable";
import RecepcionFormModal from "../../..//modules/gestion_bodega/components/capturas/RecepcionFormModal";
import CapturasToolbar from "../../../modules/gestion_bodega/components/capturas/CapturasToolbar";
import RulesBanner from "../../../modules/gestion_bodega/components/capturas/RulesBanner";
import FastCaptureModal from "../../../modules/gestion_bodega/components/capturas/FastCaptureModal";

import useCapturas from "../../../modules/gestion_bodega/hooks/useCapturas";
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import { bodegaService } from '../services/bodegaService';
import temporadaBodegaService from '../services/temporadaBodegaService';
import type { Captura, CapturaCreateDTO, CapturaUpdateDTO } from "../../../modules/gestion_bodega/types/capturasTypes";

export default function CapturasPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { bodegaId: bodegaIdParam } = useParams();
  const {
    items,
    meta,
    filters,
    loading,
    create,
    update,
    archivar,
    restaurar,
    remove,
    setSearch,
    setTipoMango,
    setDateRange,
    setPage,
    setEstado,
    canOperate,
    reasonDisabled,
    setBodega,
    setTemporada,
    setPageSize,
  } = useCapturas();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Captura | null>(null);
  const [fastOpen, setFastOpen] = useState(false);

  // Hidratación de contexto desde ruta y querystring + breadcrumbs mínimos
  React.useEffect(() => {
    const bFromQuery = Number(searchParams.get('bodega') || '') || undefined;
    const bFromPath = bodegaIdParam ? Number(bodegaIdParam) : undefined;
    const b = bFromPath || bFromQuery;
    const t = Number(searchParams.get('temporada') || '') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const q = searchParams.get('search') || undefined;
    const estado = (searchParams.get('estado') as any) || undefined;
    const tipo = searchParams.get('tipo_mango') || undefined;
    const page = Number(searchParams.get('page') || '') || undefined;
    const pageSize = Number(searchParams.get('page_size') || '') || undefined;

    if (b && b !== filters.bodega) setBodega(b);
    if (t && t !== filters.temporada) setTemporada(t);
    if (from || to) setDateRange(from, to);
    if (q !== undefined) setSearch(q);
    if (estado) setEstado(estado);
    if (tipo !== undefined) setTipoMango(tipo);
    if (page) setPage(page);
    if (pageSize) setPageSize(pageSize);

    dispatch(setBreadcrumbs([
      { label: 'Bodegas', path: '/bodega' },
      { label: 'Capturas', path: '' },
    ]));
    return () => { dispatch(clearBreadcrumbs()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enriquecer breadcrumbs con nombres reales (fetch liviano)
  React.useEffect(() => {
    const bId = filters.bodega;
    const tId = filters.temporada;
    if (!bId || !tId) return;
    let cancelled = false;
    (async () => {
      try {
        const [bodega, temporada] = await Promise.all([
          bodegaService.getById(bId),
          temporadaBodegaService.getById(tId),
        ]);
        if (cancelled) return;
        const nombre = bodega?.nombre || `Bodega #${bId}`;
        const año = (temporada as any)?.['año'] || (temporada as any)?.['año'] || '';
        const crumbs = breadcrumbRoutes.bodegaCapturas(String(bId), nombre, String(tId), Number(año) || new Date().getFullYear());
        dispatch(setBreadcrumbs(crumbs));
      } catch (_) {
        // si falla, dejamos breadcrumb mínimo ya seteado
      }
    })();
    return () => { cancelled = true; };
  }, [dispatch, filters.bodega, filters.temporada]);

  // Sincronizar filtros a URL (persistencia)
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filters.bodega) params.set('bodega', String(filters.bodega));
    if (filters.temporada) params.set('temporada', String(filters.temporada));
    if (filters.search) params.set('search', String(filters.search));
    if (filters.estado) params.set('estado', String(filters.estado));
    if (filters.fecha_gte) params.set('from', String(filters.fecha_gte));
    if (filters.fecha_lte) params.set('to', String(filters.fecha_lte));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.page_size) params.set('page_size', String(filters.page_size));
    if (filters.tipo_mango) params.set('tipo_mango', String(filters.tipo_mango));
    setSearchParams(params, { replace: true });
  }, [filters.bodega, filters.temporada, filters.search, filters.estado, filters.fecha_gte, filters.fecha_lte, filters.page, filters.page_size, filters.tipo_mango, setSearchParams]);

  const handleCreate = async (payload: CapturaCreateDTO) => {
    await create(payload);
  };

  const handleUpdate = async (id: number, payload: CapturaUpdateDTO) => {
    await update(id, payload);
  };

  const handleArchive = async (row: Captura) => {
    await archivar(row.id);
  };

  const handleRestore = async (row: Captura) => {
    await restaurar(row.id);
  };

  const handleDelete = async (row: Captura) => {
    await remove(row.id);
  };

  const onClearFilters = () => {
    setSearch('');
    setTipoMango(undefined);
    setEstado('activas');
    setDateRange(undefined, undefined);
    setPage(1);
  };

  return (
    <Box>\n      <Stack spacing={2} sx={{ mt: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <RulesBanner
            blocked={!canOperate}
            reason={reasonDisabled}
            range={(meta as any)?.semana_rango ?? { from: filters.fecha_gte, to: filters.fecha_lte }}
          />
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Recepciones</Typography>
            <CapturasToolbar
              bodegaId={filters.bodega}
              temporadaId={filters.temporada}
              search={filters.search}
              tipo_mango={filters.tipo_mango}
              estado={filters.estado as any}
              fecha_gte={filters.fecha_gte}
              fecha_lte={filters.fecha_lte}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              onTipoMangoChange={(v) => { setTipoMango(v); setPage(1); }}
              onEstadoChange={(v) => { setEstado(v); setPage(1); }}
              onRangeChange={(from, to) => { setDateRange(from, to); setPage(1); }}
              onClear={onClearFilters}
              onNewRecepcion={() => { setEditing(null); setOpen(true); }}
              onFastCapture={() => setFastOpen(true)}
              busy={loading}
              disabledActions={!canOperate}
              disabledReason={reasonDisabled}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {canOperate
              ? `Bodega #${filters.bodega} Temporada #${filters.temporada}`
              : (reasonDisabled || "Selecciona bodega y temporada desde la barra superior del módulo para operar.")}
          </Typography>

          <CapturasTable
            items={items}
            meta={meta}
            loading={loading}
            onPageChange={setPage}
            onCreate={() => { setEditing(null); setOpen(true); }}
            onEdit={(row) => { setEditing(row); setOpen(true); }}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onDelete={handleDelete}
            blocked={!canOperate}
            onClassify={(row) => {
              const bId = filters.bodega ?? '';
              const params = new URLSearchParams();
              if (filters.temporada) params.set('temporada', String(filters.temporada));
              if (filters.fecha_gte) params.set('from', String(filters.fecha_gte));
              if (filters.fecha_lte) params.set('to', String(filters.fecha_lte));
              if (filters.search) params.set('search', String(filters.search));
              if (filters.estado) params.set('estado', String(filters.estado));
              if (filters.page) params.set('page', String(filters.page));
              if (filters.page_size) params.set('page_size', String(filters.page_size));
              if (filters.tipo_mango) params.set('tipo_mango', String(filters.tipo_mango));
              navigate(`/bodega/${bId}/capturas/${row.id}/clasificacion?${params.toString()}`);
            }}
          />
        </Paper>
      </Stack>

      <RecepcionFormModal
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        bodegaId={filters.bodega}
        temporadaId={filters.temporada}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <FastCaptureModal
        open={fastOpen}
        onClose={() => setFastOpen(false)}
        bodegaId={filters.bodega as any}
        temporadaId={filters.temporada as any}
        disabled={!canOperate}
        onCreate={async (payload) => {
          await create({
            bodega: filters.bodega as number,
            temporada: filters.temporada as number,
            fecha: payload.fecha,
            huertero_nombre: payload.huertero_nombre || '',
            tipo_mango: payload.tipo_mango,
            cantidad_cajas: payload.cantidad_cajas,
            observaciones: payload.observaciones || null,
          });
        }}
      />
    </Box>
  );
}






