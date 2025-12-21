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
import { usePropietarios } from '../hooks/usePropietarios';

import { huertaService } from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { propietarioService } from '../services/propietarioService';
import { huertasCombinadasService } from '../services/huertasCombinadasService';

import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import { FilterConfig } from '../../../components/common/TableLayout';
import { isRentada } from '../utils/huertaTypeGuards';

import type { HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';
import type { HuertaRentadaCreateData, HuertaRentadaUpdateData } from '../types/huertaRentadaTypes';

const pageSize = 10;
type VistaTab = 'activos' | 'archivados' | 'todos';

const Huertas: React.FC = () => {
  const navigate = useNavigate();
  const hComb = useHuertasCombinadas();
  const { propietarios, loading: propsLoading, addPropietario, refetch: refetchProps } = usePropietarios();

  const [tipoFiltro, setTipoFiltro] = useState<'' | 'propia' | 'rentada'>('');
  const [nombreFiltro, setNombreFiltro] = useState<string | null>(null);
  const [propietarioFiltro, setPropietarioFiltro] = useState<number | null>(null);

  // Tab local sincronizado con el store SOLO cuando cambia realmente
  const [tab, setTab] = useState<VistaTab>(hComb.estado as VistaTab);
  useEffect(() => {
    // si el store cambia (p.ej. por navegación), reflejarlo en el tab local
    if (tab !== (hComb.estado as VistaTab)) {
      setTab(hComb.estado as VistaTab);
    }
  }, [hComb.estado]);

  useEffect(() => {
    // evita resetear page=1 en cada montaje si ya coincide
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

  let abortNombre: AbortController | null = null;
  const loadNombreOptions = async (q: string) => {
    if (!q.trim()) return [];
    abortNombre?.abort();
    abortNombre = new AbortController();
    try {
      const { huertas } = await huertasCombinadasService.list(
        1,
        'todos',
        { nombre: q },
        { signal: abortNombre.signal, pageSize }
      );
      return Array.from(new Set(huertas.map(h => h.nombre))).map(n => ({ label: n, value: n }));
    } catch {
      return [];
    }
  };

  let abortProp: AbortController | null = null;
  const loadPropietarioOptions = async (q: string) => {
    if (q.trim().length < 2) return [];
    abortProp?.abort();
    abortProp = new AbortController();
    try {
      const { propietarios } = await propietarioService.getConHuertas(q, { signal: abortProp.signal });
      return propietarios.map(p => ({ label: `${p.nombre} ${p.apellidos}`, value: p.id }));
    } catch {
      return [];
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
  const savePropia = async (v: HuertaCreateData): Promise<void> => {
        const res = await huertaService.create(v);
        handleBackendNotification(res);
        refetchAll();
      };
      const saveRentada = async (v: HuertaRentadaCreateData): Promise<void> => {
        const res = await huertaRentadaService.create(v);
        handleBackendNotification(res);
        refetchAll();
      };
      const saveEdit = async (
        vals: HuertaUpdateData | HuertaRentadaUpdateData
      ): Promise<void> => {
        if (!editTarget) return;
        let res;
        if (editTarget.tipo === 'propia') {
          res = await huertaService.update(editTarget.data.id, vals as HuertaUpdateData);
        } else {
          res = await huertaRentadaService.update(editTarget.data.id, vals as HuertaRentadaUpdateData);
        }
        handleBackendNotification(res);
        refetchAll();
        setModalOpen(false);
      };

      const askDelete = (h: Registro) => setDelDialog({ id: h.id, tipo: isRentada(h) ? 'rentada' : 'propia' });
      const confirmDelete = async (): Promise<void> => {
        if (!delDialog) return;
        try {
          const res = delDialog.tipo === 'propia'
            ? await huertaService.delete(delDialog.id)
            : await huertaRentadaService.delete(delDialog.id);
          handleBackendNotification(res);
          refetchAll();
        } catch (e: any) {
          handleBackendNotification(e?.response?.data);
        } finally {
          setDelDialog(null);
        }
      };

      const handleArchiveOrRestore = async (h: Registro, arc: boolean): Promise<void> => {
        let res;
        if (isRentada(h)) {
          res = arc
            ? await huertaRentadaService.restaurar(h.id)
            : await huertaRentadaService.archivar(h.id);
        } else {
          res = arc ? await huertaService.restaurar(h.id) : await huertaService.archivar(h.id);
        }
        handleBackendNotification(res);
        refetchAll();
      };

      const propietariosParaModal = useMemo(() => {
        const extra = editTarget?.data.propietario_detalle;
        return extra && !propietarios.some(p => p.id === extra.id)
          ? [extra, ...propietarios]
          : propietarios;
      }, [propietarios, editTarget]);

      // Primera carga
      if(!hasLoadedOnce.current) {
      return(
      <Box className = "flex justify-center p-12" >
          <CircularProgress size={48} />
      </Box >
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
          pageSize={pageSize}
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
          onEdit={h => { setEditTarget({ tipo: isRentada(h) ? 'rentada' : 'propia', data: h }); setModalOpen(true); }}
          onDelete={askDelete}
          onArchive={h => handleArchiveOrRestore(h, false)}
          onRestore={h => handleArchiveOrRestore(h, true)}
          onTemporadas={h => {
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
          onReporteHuerta={h => {
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
