/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';

import TemporadaTable from '../components/temporada/TemporadaTable';
import TemporadaFormModal from '../components/temporada/TemporadaFormModal';
import { PermissionButton } from '../../../components/common/PermissionButton';
import { useTemporadas } from '../hooks/useTemporadas';
import { useHuertas } from '../hooks/useHuertas';
import { useHuertasRentadas } from '../hooks/useHuertaRentada';
import { TemporadaCreateData, Temporada } from '../types/temporadaTypes';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

const currentYear = new Date().getFullYear();
type ViewFilter = 'activas' | 'archivadas' | 'todas';
const pageSize = 10;

const Temporadas: React.FC = () => {
  const [search] = useSearchParams();
  const huertaId = Number(search.get('huerta_id') || 0) || null;

  const {
    temporadas,
    loading,
    page,
    setPage,
    addTemporada,
    removeTemporada,
    finalizeTemporada,
    archiveTemporada,
    restoreTemporada,
  } = useTemporadas();

  const { huertas } = useHuertas();
  const { huertas: rentadas } = useHuertasRentadas();

  // Obtener objeto huerta o huerta_rentada seleccionado (pasado como query param)
  const huertaSel = useMemo(() => {
    if (!huertaId) return null;
    return (
      huertas.find((h) => h.id === huertaId) ||
      rentadas.find((h) => h.id === huertaId) ||
      null
    );
  }, [huertaId, huertas, rentadas]);

  const [filter, setFilter] = useState<ViewFilter>('activas');
  const [spin, setSpin] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delDialogId, setDelDialogId] = useState<number | null>(null);
  const [consultTarget, setConsultTarget] = useState<Temporada | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);

  // Mostrar spinner con retardo
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) timer = setTimeout(() => setSpin(true), 300);
    else setSpin(false);
    return () => clearTimeout(timer);
  }, [loading]);

  // Filtrar las temporadas según huertaId y estado (activas/archivadas/todas)
  const rows = useMemo(
    () =>
      temporadas
        .filter((t) => (huertaId ? t.huerta_id === huertaId : true))
        .filter((t) =>
          filter === 'activas'
            ? t.is_active
            : filter === 'archivadas'
              ? !t.is_active
              : true
        ),
    [temporadas, filter, huertaId]
  );

  const emptyMsg =
    filter === 'activas'
      ? 'No hay temporadas activas.'
      : filter === 'archivadas'
      ? 'No hay temporadas archivadas.'
      : 'No hay temporadas.';

  // Acción “Iniciar nueva temporada”
  const handleCreate = async () => {
    if (!huertaSel) {
      handleBackendNotification({
        key: 'validation_error',
        message: 'Debes seleccionar una huerta primero.',
        type: 'warning',
      });
      return;
    }

    const payload: TemporadaCreateData = {
      año: currentYear,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      huerta: 'monto_renta' in huertaSel ? undefined : huertaSel.id,
      huerta_rentada: 'monto_renta' in huertaSel ? huertaSel.id : undefined,
    };

    // Eliminar fields undefined
    Object.keys(payload).forEach((k) => {
      if (payload[k as keyof TemporadaCreateData] == null) {
        delete payload[k as keyof TemporadaCreateData];
      }
    });

    try {
      await addTemporada(payload);
      handleBackendNotification({
        key: 'temporada_create_success',
        message: 'Temporada creada exitosamente.',
        type: 'success',
      });
    } catch (err: any) {
      const noti = err?.response?.data?.notification || err;
      handleBackendNotification(noti);
    }
  };

  // Si, al abrir el diálogo, ya existe una temporada activa para este año + huerta → cerramos diálogo
  useEffect(() => {
    if (!confirmOpen || !huertaSel) return;
    const yaExiste = temporadas.some(
      (t) =>
        t.año === currentYear &&
        t.is_active &&
        (t.huerta_id === huertaSel.id || t.huerta_rentada === huertaSel.id)
    );
    if (yaExiste) {
      setConfirmOpen(false);
    }
  }, [temporadas, confirmOpen, huertaSel]);

  // Confirmar eliminación (hard delete)
  const confirmDelete = async () => {
    if (delDialogId == null) return;
    try {
      await removeTemporada(delDialogId);
      handleBackendNotification({
        key: 'temporada_delete_success',
        message: 'Temporada eliminada correctamente.',
        type: 'success',
      });
    } catch (err: any) {
      const noti = err?.response?.data?.notification || err;
      handleBackendNotification(noti);
    } finally {
      setDelDialogId(null);
    }
  };

  // Archivar temporada
  const handleArchive = async (t: Temporada) => {
    try {
      await archiveTemporada(t.id);
      handleBackendNotification({
        key: 'temporada_archivada',
        message: 'Temporada archivada correctamente.',
        type: 'success',
      });
    } catch (err: any) {
      const noti = err?.response?.data?.notification || err;
      handleBackendNotification(noti);
    }
  };

  // Restaurar temporada (soft-undelete)
  const handleRestore = async (t: Temporada) => {
    try {
      await restoreTemporada(t.id);
      handleBackendNotification({
        key: 'temporada_restaurada',
        message: 'Temporada restaurada correctamente.',
        type: 'success',
      });
    } catch (err: any) {
      const noti = err?.response?.data?.notification || err;
      handleBackendNotification(noti);
    }
  };

  // Finalizar o reactivar (se delega al backend para alternar el flag `finalizada`)
  const handleFinalize = async (t: Temporada) => {
    try {
      await finalizeTemporada(t.id);
      // El backend devolverá la clave "temporada_finalizada" o "temporada_reactivada"
      // y el mensaje correspondiente. `handleBackendNotification` los mostrará.
    } catch (err: any) {
      const noti = err?.response?.data?.notification || err;
      handleBackendNotification(noti);
    }
  };

  const huertaEstaArchivada = useMemo(() => {
    return huertaSel && !huertaSel.is_active;
  }, [huertaSel]);

  const temporadaYaExiste = useMemo(() => {
    return temporadas.some(
      (t) =>
        t.año === currentYear &&
        t.is_active &&
        (t.huerta_id === huertaSel?.id || t.huerta_rentada === huertaSel?.id)
    );
  }, [temporadas, huertaSel]);

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-2">
          Gestión de Temporadas
        </Typography>

        {/** Información de la huerta seleccionada */}
        {huertaSel && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Huerta seleccionada: {huertaSel.nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Propietario:{" "}
              {huertaSel.propietario_detalle
                ? `${huertaSel.propietario_detalle.nombre} ${huertaSel.propietario_detalle.apellidos}`
                : '—'}
            </Typography>
            <Divider sx={{ mt: 1 }} />
          </Box>
        )}

        {/** Botón para “Iniciar temporada” */}
        {huertaSel && (
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Tooltip
              title={
                huertaEstaArchivada
                  ? 'No se puede iniciar una temporada en una huerta archivada.'
                  : temporadaYaExiste
                    ? `Ya existe una temporada activa en el año ${currentYear} para esta huerta.`
                    : ''
              }
            >
              <span>
                <PermissionButton
                  perm="add_temporada"
                  variant="contained"
                  disabled={huertaEstaArchivada || temporadaYaExiste}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (huertaEstaArchivada) {
                      handleBackendNotification({
                        key: 'huerta_archivada_temporada',
                        message: 'No se puede iniciar una temporada en una huerta archivada.',
                        type: 'warning',
                      });
                      return;
                    }
                    if (temporadaYaExiste) {
                      handleBackendNotification({
                        key: 'temporada_duplicada',
                        message: `Ya existe una temporada activa en el año ${currentYear} para esta huerta.`,
                        type: 'warning',
                      });
                      return;
                    }
                    setConfirmOpen(true);
                  }}
                >
                  Iniciar temporada {currentYear}
                </PermissionButton>
              </span>
            </Tooltip>
          </Box>
        )}

        {/** Filtros de pestañas */}
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
          <TemporadaTable
            data={rows}
            page={page}
            pageSize={pageSize}
            count={rows.length}
            onPageChange={setPage}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onDelete={(t) => setDelDialogId(t.id)}
            onConsult={(t) => {
              setConsultTarget(t);
              setConsultOpen(true);
            }}
            onFinalize={(t) => handleFinalize(t)} 
            emptyMessage={emptyMsg}
          />
        )}

        {/** Modal “Consultar Temporada” (solo lectura) */}
        <TemporadaFormModal
          open={consultOpen}
          onClose={() => {
            setConsultTarget(null);
            setConsultOpen(false);
          }}
          initialValues={consultTarget || undefined}
          huertas={huertas}
          huertasRentadas={rentadas}
          readOnly={true}
        />

        {/** Diálogo “Confirmar nueva temporada” */}
        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
          disableEnforceFocus
          disableAutoFocus
        >
          <DialogTitle>Confirmar nueva temporada</DialogTitle>
          <DialogContent dividers>
            <Typography>Año: {currentYear}</Typography>
            <Typography>Huerta: {huertaSel?.nombre}</Typography>
            <Typography>Fecha inicio: {new Date().toISOString().slice(0, 10)}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreate}>
              Iniciar
            </Button>
          </DialogActions>
        </Dialog>

        {/** Diálogo “Confirmar eliminación” */}
        <Dialog open={delDialogId != null} onClose={() => setDelDialogId(null)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta temporada permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDelDialogId(null)}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default Temporadas;
