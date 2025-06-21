/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Paper, Typography, CircularProgress, Box,
  Tabs, Tab, Dialog, DialogTitle,
  DialogContent, DialogActions, Button,
} from '@mui/material';

import HuertaToolbar from '../components/huerta/HuertaToolBar';
import HuertaModalTabs from '../components/huerta/HuertaModalTabs';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';
import HuertaTable, { Registro } from '../components/huerta/HuertaTable';

import { useHuertasCombinadas } from '../hooks/useHuertasCombinadas';
import { usePropietarios } from '../hooks/usePropietarios';

import { HuertaCreateData } from '../types/huertaTypes';
import { HuertaRentadaCreateData } from '../types/huertaRentadaTypes';
import { PropietarioCreateData } from '../types/propietarioTypes';

import { huertaService } from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { isRentada } from '../utils/huertaTypeGuards';
import { FilterConfig } from '../../../components/common/TableLayout';
import { Estado } from '../../../global/store/huertaSlice';

/* ────────────────────────────────────────────────────────────── */
const pageSize = 10;
type VistaTab = Estado; // 'activos' | 'archivados' | 'todos'

/* ────────────────────────────────────────────────────────────── */
const Huertas: React.FC = () => {
  const navigate = useNavigate();
  /* —— Data hooks —— */
  const {
    huertas, meta, loading,
    page, setPage,
    estado, changeEstado,       // backend
    changeFilters,              // backend
    add, edit, fetchAll, // eliminamos toggleLocal y filters porque ya no se usan
    archive, restore, // <-- desestructuro archive y restore
    tipo, setTipo, // <-- NUEVO: control global del tipo
  } = useHuertasCombinadas();

  const {
    propietarios, loading: loadProps,
    addPropietario, refetch: refetchProps,
  } = usePropietarios();

  // —— Hooks de estado (deben ir primero) —__
  const [tipoFiltro, setTipoFiltro] = [tipo, setTipo]; // sincroniza con el global
  const [nombreFiltro, setNombreFiltro] = useState<string | null>(null);
  const [propietarioFiltro, setPropietarioFiltro] = useState<number | null>(null);
  const [tab, setTab] = useState<VistaTab>('activos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ tipo: 'propia' | 'rentada'; data: any } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: number; tipo: 'propia' | 'rentada' } | null>(null);
  const [propModal, setPropModal] = useState(false);
  const [spin, setSpin] = useState(false);
  const [defaultPropietarioId, setDefaultPropietarioId] = useState<number>();

  // —— Datos para la tabla —__
  // Elimino cualquier filtrado local, solo uso los datos del store (ya paginados y filtrados por backend)
  const rows: Registro[] = huertas.map(h =>
    isRentada(h)
      ? ({ ...h, tipo: 'rentada', monto_renta: (h as any).monto_renta ?? 0 } as Registro)
      : ({ ...h, tipo: 'propia' } as Registro)
  );

  // Sincronización bidireccional inteligente
  useEffect(() => {
    // Si selecciona un nombre único, ajustar tipo automáticamente
    if (nombreFiltro && !tipoFiltro) {
      const tipos = Array.from(new Set(
        huertas.filter(h => h.nombre === nombreFiltro).map(h => isRentada(h) ? 'rentada' : 'propia')
      ));
      if (tipos.length === 1) setTipoFiltro(tipos[0]);
    }
    // Si selecciona un propietario único, ajustar tipo automáticamente
    if (propietarioFiltro && !tipoFiltro) {
      const tipos = Array.from(new Set(
        huertas.filter(h => h.propietario === propietarioFiltro).map(h => isRentada(h) ? 'rentada' : 'propia')
      ));
      if (tipos.length === 1) setTipoFiltro(tipos[0]);
    }
  }, [nombreFiltro, propietarioFiltro, tipoFiltro, huertas]);

  // —— Botón de limpiar filtros —__
  const limpiarFiltros = () => {
    setTipoFiltro('');
    setNombreFiltro(null);
    setPropietarioFiltro(null);
    changeFilters({});
  };

  // —— Opciones contextuales —__
  // Las opciones de filtros se calculan solo a partir de los datos del backend
  const nombresDisponibles = useMemo(() => {
    let base = huertas;
    if (propietarioFiltro) base = base.filter(h => h.propietario === propietarioFiltro);
    return [...new Set(base.map(h => h.nombre))].map(n => ({ label: n, value: n }));
  }, [huertas, propietarioFiltro]);

  const propietariosDisponibles = useMemo(() => {
    let base = huertas;
    if (nombreFiltro) base = base.filter(h => h.nombre === nombreFiltro);
    return [...new Set(base.map(h => h.propietario))]
      .map(id => {
        const p = propietarios.find(p => p.id === id);
        return p ? { label: `${p.nombre} ${p.apellidos}`, value: p.id } : null;
      })
      .filter(Boolean);
  }, [huertas, nombreFiltro, propietarios]);

  // —— Mensajes detallados —__
  const noResultsMsg = useMemo(() => {
    if (rows.length === 0) return 'No hay huertas registradas.';
    // El backend ya filtra, así que si no hay resultados es por los filtros activos
    if (rows.length === 0) {
      if (tipoFiltro && nombreFiltro && propietarioFiltro) {
        return 'No hay huertas de ese tipo, nombre y propietario.';
      }
      if (tipoFiltro && nombreFiltro) {
        return 'No hay huertas de ese tipo con ese nombre.';
      }
      if (tipoFiltro && propietarioFiltro) {
        return 'No hay huertas de ese tipo para ese propietario.';
      }
      if (nombreFiltro && propietarioFiltro) {
        return 'No hay huertas con ese nombre para ese propietario.';
      }
      if (tipoFiltro) {
        return 'No hay huertas de ese tipo.';
      }
      if (nombreFiltro) {
        return 'No hay huertas con ese nombre.';
      }
      if (propietarioFiltro) {
        return 'No hay huertas para ese propietario.';
      }
      return 'No hay resultados que coincidan con tus filtros.';
    }
    return '';
  }, [rows, tipoFiltro, nombreFiltro, propietarioFiltro]);

  // —— Configuración de filtros —__
  const filterConfig: FilterConfig[] = [
    {
      key: 'tipo', label: 'Tipo', type: 'select',
      options: [
        { label: 'Todas', value: '' },
        { label: 'Propias', value: 'propia' },
        { label: 'Rentadas', value: 'rentada' },
      ],
    },
    {
      key: 'nombre', label: 'Nombre', type: 'autocomplete',
      options: nombresDisponibles,
    },
    {
      key: 'propietario', label: 'Propietario', type: 'autocomplete',
      options: propietariosDisponibles as any,
    },
  ];

  // —— Handler de cambio de filtros —__
  const handleFilterChange = (f: Record<string, any>) => {
    const { tipo = '', nombre = null, propietario = null, ...backend } = f;
    // Si cambia el tipo, limpiar nombre y propietario si ya no son válidos
    if (tipo !== tipoFiltro) {
      setTipo(tipo); // sincroniza global
      setNombreFiltro(null);
      setPropietarioFiltro(null);
      changeFilters({ tipo, nombre: undefined, propietario: undefined, ...backend });
    } else {
      setNombreFiltro(nombre);
      setPropietarioFiltro(propietario);
      changeFilters({ tipo, nombre, propietario, ...backend });
    }
  };

  /* —— Spinner diferido —— */
  useEffect(() => {
    let t: any;
    if (loading || loadProps) t = setTimeout(() => setSpin(true), 300);
    else setSpin(false);
    return () => clearTimeout(t);
  }, [loading, loadProps]);

  /* —— Tabs (estado ↔ backend) —— */
  useEffect(() => setTab(estado as VistaTab), [estado]);
  const handleTabChange = (_: any, v: VistaTab) => {
    setTab(v);
    changeEstado(v);
  };

  /* —— CRUD helpers —— */
  const savePropia = async (v: HuertaCreateData) => {
    await add(v, 'propia');
    await fetchAll();
  };
  const saveRentada = async (v: HuertaRentadaCreateData) => {
    await add(v, 'rentada');
    await fetchAll();
  };

  const launchEdit = (h: Registro) => {
    setEditTarget({ tipo: isRentada(h) ? 'rentada' : 'propia', data: h });
    setDefaultPropietarioId(undefined);
    setModalOpen(true);
  };
  const saveEdit = async (vals: any) => {
    if (!editTarget) return;
    await edit(editTarget.data.id, vals, editTarget.tipo);
    setModalOpen(false);
  };

  /* — Delete — */
  const askDelete = (h: Registro) => setDelDialog({ id: h.id, tipo: isRentada(h) ? 'rentada' : 'propia' });
  const confirmDelete = async () => {
    if (!delDialog) return;
    try {
      const res =
        delDialog.tipo === 'propia'
          ? await huertaService.delete(delDialog.id)
          : await huertaRentadaService.delete(delDialog.id);
      handleBackendNotification(res);
      await fetchAll();
    } finally {
      setDelDialog(null);
    }
  };

  /* — Alta rápida de propietario — */
  const saveNewProp = async (v: PropietarioCreateData) => {
    const created = await addPropietario(v);
    await refetchProps();
    setDefaultPropietarioId(created.id);
  };

  // Aseguro que handleArchiveOrRestore esté definido antes del render:
  const handleArchiveOrRestore = async (h: Registro, archivado: boolean) => {
    const tipo = isRentada(h) ? 'rentada' : 'propia';
    if (archivado) await Promise.resolve(await (tipo === 'propia' ? restore(h.id, 'propia') : restore(h.id, 'rentada')));
    else await Promise.resolve(await (tipo === 'propia' ? archive(h.id, 'propia') : archive(h.id, 'rentada')));
    await fetchAll();
  };

  // Aseguro que propietariosParaModal esté definido antes del render:
  const propietariosParaModal = useMemo(() => {
    if (editTarget?.data?.propietario &&
      !propietarios.find(p => p.id === editTarget.data.propietario)) {
      return [editTarget.data.propietario_detalle, ...propietarios];
    }
    return propietarios;
  }, [propietarios, editTarget]);

  /* ================= Render ================= */
  return (
    <motion.div className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">

        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Huertas
        </Typography>

        <HuertaToolbar onOpen={() => {
          setEditTarget(null);
          setDefaultPropietarioId(undefined);
          setModalOpen(true);
        }} />
        {/* —— Tabs de estado —— */}
        <Tabs value={tab} onChange={handleTabChange}
          textColor="primary" indicatorColor="primary" sx={{ mb: 2 }}>
          <Tab value="activos" label="Activas" />
          <Tab value="archivados" label="Archivadas" />
          <Tab value="todos" label="Todas" />
        </Tabs>
        {/* —— Tabla —— */}
        {spin ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <HuertaTable
            data={rows}
            page={page}
            pageSize={pageSize}
            count={meta.count}
            onPageChange={setPage}
            loading={loading || loadProps}
            emptyMessage={noResultsMsg}
            filterConfig={filterConfig}
            onFilterChange={handleFilterChange}
            onEdit={launchEdit}
            onDelete={askDelete}
            onArchive={h => handleArchiveOrRestore(h, false)}
            onRestore={h => handleArchiveOrRestore(h, true)}
            onTemporadas={h => navigate(`/temporadas?huerta_id=${h.id}`)}
            filterValues={{ tipo: tipoFiltro, nombre: nombreFiltro, propietario: propietarioFiltro }}
            limpiarFiltros={limpiarFiltros}
          />
        )}

        {/* —— Modales —— */}
        <HuertaModalTabs
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmitPropia={editTarget?.tipo === 'propia' ? saveEdit : savePropia}
          onSubmitRentada={editTarget?.tipo === 'rentada' ? saveEdit : saveRentada}
          propietarios={propietariosParaModal}
          loading={loadProps}
          onRegisterNewPropietario={() => setPropModal(true)}
          defaultPropietarioId={defaultPropietarioId}
          editTarget={editTarget || undefined}
        />

        <PropietarioFormModal
          open={propModal}
          onClose={() => setPropModal(false)}
          onSubmit={saveNewProp}
        />

        <Dialog open={Boolean(delDialog)} onClose={() => setDelDialog(null)}>
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
