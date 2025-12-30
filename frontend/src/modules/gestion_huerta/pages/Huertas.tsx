// src/modules/gestion_huerta/pages/Huertas.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Paper,
  Typography,
  CircularProgress,
  Box,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

import HuertaToolbar from '../components/huerta/HuertaToolBar';
import HuertaModalTabs from '../components/huerta/HuertaModalTabs';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';
import HuertaTable, { Registro } from '../components/huerta/HuertaTable';

import { useHuertasCombinadas } from '../hooks/useHuertasCombinadas';
import { useHuertas } from '../hooks/useHuertas';
import { useHuertasRentadas } from '../hooks/useHuertaRentada';
import { usePropietarios } from '../hooks/usePropietarios';

import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchHuertaNombreOptions } from '../../../global/store/huertasCombinadasSlice';
import { fetchPropietarioOptions } from '../../../global/store/propietariosSlice';
import { FilterConfig } from '../../../components/common/TableLayout';
import { isRentada } from '../utils/huertaTypeGuards';

import type { HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';
import type { HuertaRentadaCreateData, HuertaRentadaUpdateData } from '../types/huertaRentadaTypes';

const pageSize = 10;
type VistaTab = 'activos' | 'archivados' | 'todos';

const Huertas: React.FC = () => {
  const navigate = useNavigate();

  const hComb = useHuertasCombinadas();
  const huertas = useHuertas();
  const huertasRentadas = useHuertasRentadas();
  const { propietarios, loading: propsLoading, addPropietario, refetch: refetchProps } = usePropietarios();
  const dispatch = useAppDispatch();
  const nombreOptions = useAppSelector((s) => s.huertasCombinadas.nombreOptions);
  const propietarioOptions = useAppSelector((s) => s.propietarios.options);

  const [tipoFiltro, setTipoFiltro] = useState<'' | 'propia' | 'rentada'>('');
  const [nombreFiltro, setNombreFiltro] = useState<string | null>(null);
  const [propietarioFiltro, setPropietarioFiltro] = useState<number | null>(null);

  // Tab local sincronizado con el store SOLO cuando cambia realmente
  const [tab, setTab] = useState<VistaTab>(hComb.estado as VistaTab);
  useEffect(() => {
    if (tab !== (hComb.estado as VistaTab)) {
      setTab(hComb.estado as VistaTab);
    }
  }, [hComb.estado]);

  useEffect(() => {
    if (tab !== hComb.estado) {
      hComb.setEstado(tab);
    }
  }, [tab]);

  // 🔧 Estados de UI
  const [modalOpen, setModalOpen] = useState(false);
  const [propModal, setPropModal] = useState(false);
  const [defaultPropietarioId, setDefaultPropietarioId] = useState<number>();
  const [editTarget, setEditTarget] = useState<{ tipo: 'propia' | 'rentada'; data: Registro } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: number; tipo: 'propia' | 'rentada' } | null>(null);

  // para distinguir la primera carga
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (!hComb.loading && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
    }
  }, [hComb.loading]);

  // ✅ Fuente única para tabla (canon: items)
  const dataForTable = useMemo<Registro[]>(() => {
    return (hComb.huertas ?? []) as Registro[];
  }, [hComb.huertas]);

  // ✅ Refetch “central” seguro (sin asumir API interna del hook)
  const refetchAll = async (): Promise<void> => {
    const tasks: Promise<unknown>[] = [];

    const anyComb = hComb as any;
    if (typeof anyComb.refetch === 'function') tasks.push(anyComb.refetch());
    else if (typeof anyComb.fetch === 'function') tasks.push(anyComb.fetch());

    if (typeof refetchProps === 'function') tasks.push(refetchProps());

    if (tasks.length) await Promise.all(tasks);
  };

  interface Filters {
    tipo?: '' | 'propia' | 'rentada';
    nombre?: string | null;
    propietario?: number | null;
  }

  const handleFilterChange = (f: Filters) => {
    const { tipo = '', nombre = null, propietario = null } = f;
    setTipoFiltro(tipo);
    setNombreFiltro(nombre);
    setPropietarioFiltro(propietario);
    hComb.setFilters({
      tipo: tipo || undefined,
      nombre: nombre || undefined,
      propietario: propietario || undefined,
    });
  };

  const limpiarFiltros = () => {
    setTipoFiltro('');
    setNombreFiltro(null);
    setPropietarioFiltro(null);
    hComb.setFilters({});
  };

  // ✅ AbortControllers estables (no reinician en cada render)
  const abortNombreRef = useRef<{ abort?: () => void } | null>(null);
  const abortPropRef = useRef<{ abort?: () => void } | null>(null);

  useEffect(() => {
    return () => {
      abortNombreRef.current?.abort?.();
      abortPropRef.current?.abort?.();
    };
  }, []);

  const loadNombreOptions = async (q: string) => {
    if (!q.trim()) return [];
    abortNombreRef.current?.abort?.();
    const thunk = dispatch(fetchHuertaNombreOptions({ query: q, pageSize }));
    abortNombreRef.current = thunk;
    try {
      return await thunk.unwrap();
    } catch {
      return nombreOptions;
    }
  };

  const loadPropietarioOptions = async (q: string) => {
    if (q.trim().length < 2) return [];
    abortPropRef.current?.abort?.();
    const thunk = dispatch(fetchPropietarioOptions({ query: q }));
    abortPropRef.current = thunk;
    try {
      return await thunk.unwrap();
    } catch {
      return propietarioOptions;
    }
  };

  const filterConfig: FilterConfig[] = [
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { label: 'Todas', value: '' },
        { label: 'Propias', value: 'propia' },
        { label: 'Rentadas', value: 'rentada' },
      ],
    },
    {
      key: 'nombre',
      label: 'Buscar por Nombre',
      // ✅ TableLayout usa 'autocomplete-async'
      type: 'autocomplete-async',
      loadOptions: loadNombreOptions,
    },
    {
      key: 'propietario',
      label: 'Buscar por Propietario',
      // ✅ TableLayout usa 'autocomplete-async'
      type: 'autocomplete-async',
      loadOptions: loadPropietarioOptions,
    },
  ];

  const savePropia = async (v: HuertaCreateData): Promise<void> => {
    await huertas.addHuerta(v);
    await refetchAll();
  };

  const saveRentada = async (v: HuertaRentadaCreateData): Promise<void> => {
    await huertasRentadas.addHuerta(v);
    await refetchAll();
  };

  const saveEdit = async (vals: HuertaUpdateData | HuertaRentadaUpdateData): Promise<void> => {
    if (!editTarget) return;

    if (editTarget.tipo === 'propia') {
      await huertas.editHuerta(editTarget.data.id, vals as HuertaUpdateData);
    } else {
      await huertasRentadas.editHuerta(editTarget.data.id, vals as HuertaRentadaUpdateData);
    }

    await refetchAll();
    setModalOpen(false);
  };

  const askDelete = (h: Registro) => setDelDialog({ id: h.id, tipo: isRentada(h) ? 'rentada' : 'propia' });

  const confirmDelete = async (): Promise<void> => {
    if (!delDialog) return;
    try {
      if (delDialog.tipo === 'propia') {
        await huertas.removeHuerta(delDialog.id);
      } else {
        await huertasRentadas.removeHuerta(delDialog.id);
      }
      await refetchAll();
    } catch (e: any) {
    } finally {
      setDelDialog(null);
    }
  };

  const handleArchiveOrRestore = async (h: Registro, arc: boolean): Promise<void> => {
    if (isRentada(h)) {
      if (arc) {
        await huertasRentadas.restore(h.id);
      } else {
        await huertasRentadas.archive(h.id);
      }
    } else {
      if (arc) {
        await huertas.restore(h.id);
      } else {
        await huertas.archive(h.id);
      }
    }

    await refetchAll();
  };

  const propietariosParaModal = useMemo(() => {
    const extra = editTarget?.data.propietario_detalle;
    return extra && !propietarios.some((p) => p.id === extra.id) ? [extra, ...propietarios] : propietarios;
  }, [propietarios, editTarget]);

  // Primera carga
  if (!hasLoadedOnce.current) {
    return (
      <Box className="flex justify-center p-12">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:px-10 sm:pb-8 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Huertas
        </Typography>

        <HuertaToolbar onOpen={() => { setEditTarget(null); setModalOpen(true); }} />

        <Tabs
          value={tab}
          onChange={(_, v: VistaTab) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="activos" label="Activas" />
          <Tab value="archivados" label="Archivadas" />
          <Tab value="todos" label="Todas" />
        </Tabs>

        <Box sx={{ position: 'relative', width: '100%' }}>
          {hComb.loading && (
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          <HuertaTable
            data={dataForTable}
            page={hComb.page}
            pageSize={hComb.meta.page_size ?? pageSize}
            metaPageSize={hComb.meta.page_size}
            count={hComb.meta.count}
            onPageChange={hComb.setPage}
            loading={hComb.loading}
            emptyMessage={
              dataForTable.length
                ? ''
                : tab === 'activos'
                  ? 'No hay huertas activas.'
                  : tab === 'archivados'
                    ? 'No hay huertas archivadas.'
                    : 'No hay huertas registradas.'
            }
            filterConfig={filterConfig}
            filterValues={{ tipo: tipoFiltro, nombre: nombreFiltro, propietario: propietarioFiltro }}
            onFilterChange={handleFilterChange}
            limpiarFiltros={limpiarFiltros}
            onEdit={(h) => { setEditTarget({ tipo: isRentada(h) ? 'rentada' : 'propia', data: h }); setModalOpen(true); }}
            onDelete={askDelete}
            onArchive={(h) => handleArchiveOrRestore(h, false)}
            onRestore={(h) => handleArchiveOrRestore(h, true)}
            onTemporadas={(h) => {
              const params = new URLSearchParams({
                huerta_id: String(h.id),
                tipo: isRentada(h) ? 'rentada' : 'propia',
              });
              if ((h as any).nombre) params.set('huerta_nombre', (h as any).nombre);
              const p = (h as any).propietario_detalle;
              if (p && (p.nombre || p.apellidos)) {
                params.set('propietario', `${p.nombre || ''} ${p.apellidos || ''}`.trim());
              }
              navigate(`/temporadas?${params.toString()}`);
            }}
            onReporteHuerta={(h) => {
              const params = new URLSearchParams({
                tipo: isRentada(h) ? 'rentada' : 'propia',
              });
              if (h.nombre) params.set('huerta_nombre', h.nombre);
              navigate(`/reportes/huerta/${h.id}/perfil?${params.toString()}`);
            }}
          />
        </Box>

        <HuertaModalTabs
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmitPropia={editTarget?.tipo === 'propia' ? saveEdit : savePropia}
          onSubmitRentada={editTarget?.tipo === 'rentada' ? saveEdit : saveRentada}
          propietarios={propietariosParaModal}
          loading={propsLoading}
          onRegisterNewPropietario={() => setPropModal(true)}
          defaultPropietarioId={defaultPropietarioId}
          editTarget={editTarget || undefined}
        />

        <PropietarioFormModal
          open={propModal}
          onClose={() => setPropModal(false)}
          onSubmit={async (v: Parameters<typeof addPropietario>[0]) => {
            const p = await addPropietario(v);
            await refetchProps();
            setDefaultPropietarioId(p.id);
          }}
        />

        <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta huerta permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialog(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Huertas;
