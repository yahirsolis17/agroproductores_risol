/* eslint-disable react-hooks/exhaustive-deps */
// src/modules/gestion_huerta/pages/Huertas.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
} from '@mui/material';

import { TableLayout, Column } from '../../../components/common/TableLayout';
import ActionsMenu from '../components/common/ActionsMenu';
import HuertaToolbar from '../components/huerta/HuertaToolBar';
import HuertaModalTabs from '../components/huerta/HuertaModalTabs';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

import { useHuertasCombinadas } from '../hooks/useHuertasCombinadas';
import { usePropietarios } from '../hooks/usePropietarios';

import { HuertaCreateData } from '../types/huertaTypes';
import { HuertaRentadaCreateData } from '../types/huertaRentadaTypes';
import { PropietarioCreateData } from '../types/propietarioTypes';

import { huertaService } from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import { isRentada } from '../utils/huertaTypeGuards';

type ViewFilter = 'activas' | 'archivadas' | 'todas';
const pageSize = 10;

/* -------------------------------------------------------------------------- */
/*                                Columnas                                    */
/* -------------------------------------------------------------------------- */
type Registro = any;

const columns: Column<Registro>[] = [
  { label: 'Nombre', key: 'nombre' },
  { label: 'Ubicación', key: 'ubicacion' },
  { label: 'Variedades', key: 'variedades' },
  { label: 'Hectáreas', key: 'hectareas', align: 'center' },
  {
    label: 'Tipo',
    key: 'tipo',
    render: (h: Registro) =>
      h.tipo === 'rentada' ? (
        <Chip label="Rentada" size="small" color="info" />
      ) : (
        <Chip label="Propia" size="small" color="success" />
      ),
  },
  {
    label: 'Monto renta',
    key: 'monto_renta',
    align: 'right',
    render: (h: Registro) =>
      h.tipo === 'rentada'
        ? `$ ${h.monto_renta.toLocaleString('es-MX', {
            minimumFractionDigits: 2,
          })}`
        : '—',
  },
  {
    label: 'Estado',
    key: 'is_active',
    align: 'center',
    render: (h: Registro) =>
      h.is_active ? (
        <Chip label="Activa" size="small" color="success" />
      ) : (
        <Chip label="Archivada" size="small" color="warning" />
      ),
  },
];

/* -------------------------------------------------------------------------- */
/*                                  Página                                    */
/* -------------------------------------------------------------------------- */
const Huertas: React.FC = () => {
  const navigate = useNavigate();

  /* -------------------- Estado UI -------------------- */
  const [filter, setFilter] = useState<ViewFilter>('activas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    tipo: 'propia' | 'rentada';
    data: any;
  } | null>(null);
  const [delDialog, setDelDialog] = useState<{
    id: number;
    tipo: 'propia' | 'rentada';
  } | null>(null);
  const [propModal, setPropModal] = useState(false);
  const [spin, setSpin] = useState(false);

  /* ------------------ Hooks de datos ----------------- */
  const {
    huertas,
    loading,
    page,
    setPage,
    add,
    edit,
    toggleLocal,
    fetchAll,
  } = useHuertasCombinadas();

  const {
    propietarios,
    loading: loadProps,
    addPropietario,
    fetchPropietarios,
  } = usePropietarios();

  /* -------------- Spinner con retardo --------------- */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (loading || loadProps) t = setTimeout(() => setSpin(true), 300);
    else setSpin(false);
    return () => clearTimeout(t);
  }, [loading, loadProps]);

  /* ----------------- Alta de huerta ------------------ */
  const savePropia = async (v: HuertaCreateData) => {
    await add(v, 'propia');
    await fetchAll();
  };

  const saveRentada = async (v: HuertaRentadaCreateData) => {
    await add(v, 'rentada');
    await fetchAll();
  };

  /* ------------------ Edición ----------------------- */
  const launchEdit = (h: any) => {
    setEditTarget({ tipo: isRentada(h) ? 'rentada' : 'propia', data: h });
    setModalOpen(true);
  };

  const saveEdit = async (vals: any) => {
    if (!editTarget) return;
    await edit(editTarget.data.id, vals, editTarget.tipo);
    setModalOpen(false);
  };

  /* ------------- Archivar / Restaurar --------------- */
  const svc = (t: 'propia' | 'rentada') =>
    t === 'propia' ? huertaService : huertaRentadaService;

  const toggleArchivado = async (h: any, restaurar: boolean) => {
    const t = isRentada(h) ? 'rentada' : 'propia';
    toggleLocal(h.id, restaurar, t);
    try {
      const res = restaurar
        ? await svc(t).restaurar(h.id)
        : await svc(t).archivar(h.id);
      handleBackendNotification(res);
    } catch (e: any) {
      toggleLocal(h.id, !restaurar, t);
      handleBackendNotification(e.response?.data);
    }
  };

  /* ------------------- Delete ----------------------- */
  const askDelete = (h: any) =>
    setDelDialog({
      id: h.id,
      tipo: isRentada(h) ? 'rentada' : 'propia',
    });

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

  /* --------------- Alta propietario inline ---------- */
  const saveNewProp = async (v: PropietarioCreateData) => {
    await addPropietario(v);
    await fetchPropietarios();
  };

  /* ----------------- Filtros de pestaña ------------- */
  const rowsEstado = useMemo(
    () =>
      huertas.filter((h) =>
        filter === 'activas'
          ? h.is_active
          : filter === 'archivadas'
          ? !h.is_active
          : true
      ),
    [huertas, filter]
  );

  const rows = useMemo(
    () =>
      rowsEstado.map((h) => ({
        ...h,
        tipo: isRentada(h) ? 'rentada' : 'propia',
      })),
    [rowsEstado]
  );

  const empty =
    filter === 'activas'
      ? 'No hay huertas activas.'
      : filter === 'archivadas'
      ? 'No hay huertas archivadas.'
      : 'No hay huertas registradas.';

  /* ----------- Redirigir a Temporadas --------------- */
  const gotoTemporadas = (h: any) => {
    navigate(`/temporadas?huerta_id=${h.id}`);
  };

  /* ---------------- Render final -------------------- */
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

        <HuertaToolbar
          onOpen={() => {
            setEditTarget(null);
            setModalOpen(true);
          }}
        />

        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="activas" label="Activas" />
          <Tab value="archivadas" label="Archivadas" />
          <Tab value="todas" label="Todas" />
        </Tabs>

        {spin ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableLayout<Registro>
            data={rows}
            page={page}
            pageSize={pageSize}
            count={rows.length}
            onPageChange={(n) => setPage(n)}
            columns={columns}
            applyFiltersInternally
            filterConfig={[
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
                label: 'Nombre',
                type: 'autocomplete',
                options: [...new Set(rows.map((h) => h.nombre))].map(
                  (nombre) => ({ label: nombre, value: nombre })
                ),
              },
              {
                key: 'propietario',
                label: 'Propietario',
                type: 'autocomplete',
                options: propietarios
                  .filter((p) => !p.archivado_en)
                  .map((p) => ({
                    label: `${p.nombre} ${p.apellidos}`,
                    value: p.id,
                  })),
              },
            ]}
            emptyMessage={empty}
            renderActions={(h) => {
              const archivada = !h.is_active;
              return (
                <ActionsMenu
                  isArchived={archivada}
                  onEdit={!archivada ? () => launchEdit(h) : undefined}
                  onArchiveOrRestore={() =>
                    archivada
                      ? toggleArchivado(h, true)
                      : toggleArchivado(h, false)
                  }
                  onDelete={() => askDelete(h)}
                  onTemporadas={!archivada ? () => gotoTemporadas(h) : undefined}
                />
              );
            }}
          />
        )}

        {/* ---------- Modal Alta / Edición ---------- */}
        <HuertaModalTabs
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmitPropia={
            editTarget?.tipo === 'propia' ? saveEdit : savePropia
          }
          onSubmitRentada={
            editTarget?.tipo === 'rentada' ? saveEdit : saveRentada
          }
          propietarios={propietarios}
          onRegisterNewPropietario={() => setPropModal(true)}
          editTarget={editTarget || undefined}
        />

        {/* ---------- Modal Propietario inline ---------- */}
        <PropietarioFormModal
          open={propModal}
          onClose={() => setPropModal(false)}
          onSubmit={saveNewProp}
        />

        {/* ---------- Confirm Delete ---------- */}
        <Dialog open={Boolean(delDialog)} onClose={() => setDelDialog(null)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            ¿Eliminar esta huerta permanentemente?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialog(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Huertas;
