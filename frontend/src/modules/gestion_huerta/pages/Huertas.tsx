// src/modules/gestion_huerta/pages/Huertas.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Paper, Typography, CircularProgress, Box,
  Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, Button,
} from '@mui/material';

import HuertaToolbar           from '../components/huerta/HuertaToolBar';
import HuertaModalTabs         from '../components/huerta/HuertaModalTabs';
import PropietarioFormModal    from '../components/propietario/PropietarioFormModal';
import HuertaTable, { Registro } from '../components/huerta/HuertaTable';

import { useHuertasCombinadas }  from '../hooks/useHuertasCombinadas';
import { usePropietarios       } from '../hooks/usePropietarios';

import { huertaService         } from '../services/huertaService';
import { huertaRentadaService  } from '../services/huertaRentadaService';
import { propietarioService    } from '../services/propietarioService';
import { huertasCombinadasService } from '../services/huertasCombinadasService';

import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import { FilterConfig } from '../../../components/common/TableLayout';
import { isRentada } from '../utils/huertaTypeGuards';

/* ------------------------------------------------------------------ */
const pageSize = 10;                         // tamaño de página
type VistaTab  = 'activos' | 'archivados' | 'todos';
/*let abortNombreController: AbortController | null = null;*/

/* ------------------------------------------------------------------ */

const Huertas: React.FC = () => {
  const navigate = useNavigate();
  const hComb    = useHuertasCombinadas();

  /* ───── Propietarios (autocomplete + modal) ───── */
  const {
    propietarios, loading: propsLoading,
    addPropietario, refetch: refetchProps,
  } = usePropietarios();

  /* ───── Filtros locales (UI) ───── */
  const [tipoFiltro,        setTipoFiltro]        = useState<'' | 'propia' | 'rentada'>('');
  const [nombreFiltro,      setNombreFiltro]      = useState<string | null>(null);
  const [propietarioFiltro, setPropietarioFiltro] = useState<number | null>(null);

  /* ───── Control de UI ───── */
  const [tab, setTab] = useState<VistaTab>('activos');

  const [modalOpen, setModalOpen] = useState(false);
  const [propModal, setPropModal] = useState(false);
  const [defaultPropietarioId, setDefaultPropietarioId] = useState<number>();

  const [editTarget, setEditTarget] =
    useState<{ tipo: 'propia' | 'rentada'; data: Registro } | null>(null);

  const [delDialog, setDelDialog] =
    useState<{ id: number; tipo: 'propia' | 'rentada' } | null>(null);

  /* ───── Sincronizar pestaña con slice combinado ───── */
  useEffect(() => { hComb.setEstado(tab); }, [tab]);

  /* ───── Filtros ⇄ slice combinado ───── */
  const handleFilterChange = (f: Record<string, any>) => {
    const { tipo = '', nombre = null, propietario = null } = f;

    setTipoFiltro(tipo);
    setNombreFiltro(nombre);
    setPropietarioFiltro(propietario);

    hComb.setFilters({
      tipo:        tipo        || undefined,
      nombre:      nombre      || undefined,
      propietario: propietario || undefined,
    });
  };

  const limpiarFiltros = () => {
    setTipoFiltro('');
    setNombreFiltro(null);
    setPropietarioFiltro(null);
    hComb.setFilters({});
  };

  /* ───── Loaders async para los filtros ───── */
let abortControllerNombre: AbortController | null = null;

  const loadNombreOptions = async (q: string) => {
    if (!q.trim()) return [];

    // Cancelar la solicitud anterior
    if (abortControllerNombre) abortControllerNombre.abort();

    abortControllerNombre = new AbortController();
    const signal = abortControllerNombre.signal;

    try {
      const { huertas } = await huertasCombinadasService.list(
        1,
        'todos',
        { nombre: q },
        { signal } // <- pasamos signal
      );

      const nombresUnicos = [...new Set(huertas.map(h => h.nombre))];
      return nombresUnicos.map(n => ({ label: n, value: n }));
    } catch (error) {
      if ((error as any).name === 'CanceledError') return []; // si se abortó, ignora
      console.error('Error en loadNombreOptions:', error);
      return [];
    }
  };


let abortControllerProp: AbortController | null = null;

  const loadPropietarioOptions = async (q: string) => {
    if (q.trim().length < 2) return [];

    if (abortControllerProp) abortControllerProp.abort();
    abortControllerProp = new AbortController();
    const signal = abortControllerProp.signal;

    try {
      const { propietarios } = await propietarioService.getConHuertas(q, { signal });
      return propietarios.map(p => ({
        label: `${p.nombre} ${p.apellidos}`,
        value: p.id,
      }));
    } catch (error) {
      if ((error as any).name === 'CanceledError') return [];
      console.error('Error en loadPropietarioOptions:', error);
      return [];
    }
  };


  const filterConfig: FilterConfig[] = [
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { label: 'Todas',    value: ''       },
        { label: 'Propias',  value: 'propia' },
        { label: 'Rentadas', value: 'rentada'},
      ],
    },
    {
      key: 'nombre',
      label: 'Nombre',
      type: 'autocomplete-async',
      width: 320,
      loadOptions: loadNombreOptions,
    },
    {
      key: 'propietario',
      label: 'Propietario',
      type: 'autocomplete-async',
      width: 320,
      loadOptions: loadPropietarioOptions,
    },
  ];

  /* ───── Spinner diferido ───── */
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    let t: any;
    if (hComb.loading || propsLoading) t = setTimeout(() => setSpin(true), 300);
    else                               setSpin(false);
    return () => clearTimeout(t);
  }, [hComb.loading, propsLoading]);

  /* ───── CRUD helpers ───── */
  const refetchAll = () => hComb.refetch();

  const savePropia = async (v: any) => {
    const res = await huertaService.create(v);
    handleBackendNotification(res);
    refetchAll();
  };

  const saveRentada = async (v: any) => {
    const res = await huertaRentadaService.create(v);
    handleBackendNotification(res);
    refetchAll();
  };

  const saveEdit = async (vals: any) => {
    if (!editTarget) return;

    let res;
    if (editTarget.tipo === 'propia') {
      res = await huertaService.update(editTarget.data.id, vals);
    } else {
      res = await huertaRentadaService.update(editTarget.data.id, vals);
    }

    handleBackendNotification(res);
    refetchAll();
    setModalOpen(false);
  };

  const askDelete = (h: Registro) =>
    setDelDialog({ id: h.id, tipo: isRentada(h) ? 'rentada' : 'propia' });

  const confirmDelete = async () => {
    if (!delDialog) return;
    const res = delDialog.tipo === 'propia'
      ? await huertaService.delete(delDialog.id)
      : await huertaRentadaService.delete(delDialog.id);
    handleBackendNotification(res);
    refetchAll();
    setDelDialog(null);
  };

  const handleArchiveOrRestore = async (h: Registro, archivado: boolean) => {
    let res;
    if (isRentada(h)) {
      res = archivado
        ? await huertaRentadaService.restaurar(h.id)
        : await huertaRentadaService.archivar(h.id);
    } else {
      res = archivado
        ? await huertaService.restaurar(h.id)
        : await huertaService.archivar(h.id);
    }

    handleBackendNotification(res);
    refetchAll();
  };

  /* ───── Propietarios para el modal de edición ───── */
  const propietariosParaModal = useMemo(() => {
    const extra = editTarget?.data?.propietario_detalle;
    return extra && !propietarios.some(p => p.id === extra.id)
      ? [extra, ...propietarios]
      : propietarios;
  }, [propietarios, editTarget]);

  /* ───── Render ───── */
  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Huertas
        </Typography>

        <HuertaToolbar onOpen={() => { setEditTarget(null); setModalOpen(true); }} />

        {/* Tabs de estado */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as VistaTab)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="activos"    label="Activas"    />
          <Tab value="archivados" label="Archivadas" />
          <Tab value="todos"      label="Todas"      />
        </Tabs>

        {/* Tabla */}
        {spin ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <HuertaTable
            data={hComb.huertas}
            page={hComb.page}
            pageSize={pageSize}
            count={hComb.meta.count}
            onPageChange={hComb.setPage}
            loading={hComb.loading || propsLoading}
            emptyMessage={
              hComb.huertas.length ? '' : 'No hay huertas que coincidan.'
            }
            filterConfig={filterConfig}
            filterValues={{
              tipo:        tipoFiltro,
              nombre:      nombreFiltro,
              propietario: propietarioFiltro,
            }}
            onFilterChange={handleFilterChange}
            limpiarFiltros={limpiarFiltros}
            onEdit={h => {
              setEditTarget({ tipo: isRentada(h) ? 'rentada' : 'propia', data: h });
              setModalOpen(true);
            }}
            onDelete={askDelete}
            onArchive={h => handleArchiveOrRestore(h, false)}
            onRestore={h => handleArchiveOrRestore(h, true)}
            onTemporadas={h => navigate(`/temporadas?huerta_id=${h.id}`)}
          />
        )}

        {/* Modal huerta propia / rentada */}
        <HuertaModalTabs
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmitPropia ={editTarget?.tipo === 'propia'  ? saveEdit : savePropia }
          onSubmitRentada={editTarget?.tipo === 'rentada' ? saveEdit : saveRentada}
          propietarios={propietariosParaModal}
          loading={propsLoading}
          onRegisterNewPropietario={() => setPropModal(true)}
          defaultPropietarioId={defaultPropietarioId}
          editTarget={editTarget || undefined}
        />

        {/* Modal crear propietario */}
        <PropietarioFormModal
          open={propModal}
          onClose={() => setPropModal(false)}
          onSubmit={async v => {
            const p = await addPropietario(v);
            await refetchProps();
            setDefaultPropietarioId(p.id);
          }}
        />

        {/* Diálogo de confirmación delete */}
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
