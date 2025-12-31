
import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';

import camionesService from '../../services/camionesService';
import CamionCargasEditor from './CamionCargasEditor';

interface CamionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bodegaId: number;
  temporadaId: number;
  camion?: any; // Si es edición
}

const validationSchema = yup.object({
  placas: yup.string().required('Requerido'),
  chofer: yup.string().required('Requerido'),
  destino: yup.string().required('Requerido'),
  receptor: yup.string().required('Requerido'),
  fecha_salida: yup.string().required('Requerido'),
});

const CamionFormModal: React.FC<CamionFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  bodegaId,
  temporadaId,
  camion,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorVal, setErrorVal] = useState<string | null>(null);
  const [currentCamion, setCurrentCamion] = useState<any>(camion);

  useEffect(() => {
    if (open) {
      if (camion?.id) {
        setLoading(true);
        camionesService.list({ id: camion.id })
          .then((res: any) => {
            const found = Array.isArray(res.data) ? res.data.find((c: any) => c.id === camion.id) : (res.data?.results?.find((c: any) => c.id === camion.id) || camion);
            setCurrentCamion(found);
          })
          .catch(() => {
            // console.error("Error loading truck details");
            setCurrentCamion(camion);
          })
          .finally(() => setLoading(false));
      } else {
        setCurrentCamion(null);
      }
      setErrorVal(null);
    }
  }, [open, camion]);

  const isEdit = Boolean(currentCamion?.id);
  const isConfirmado = currentCamion?.estado === 'CONFIRMADO';
  const summary = useMemo(() => {
    const cargas = Array.isArray(currentCamion?.cargas) ? currentCamion.cargas : [];
    const items = Array.isArray(currentCamion?.items) ? currentCamion.items : [];
    const totalFromCargas = cargas.reduce((acc: number, c: any) => acc + (Number(c?.cantidad) || 0), 0);
    const totalFromItems = items.reduce((acc: number, i: any) => acc + (Number(i?.cantidad_cajas) || 0), 0);
    const totalCajas = totalFromCargas || totalFromItems;
    const tipos = Array.from(
      new Set(
        [
          ...items.map((i: any) => String(i?.tipo_mango || "").trim()),
          ...cargas.map((c: any) => String(c?.tipo_mango || "").trim()),
        ].filter((v: string) => v)
      )
    );
    return { totalCajas, tipos };
  }, [currentCamion]);

  const formik = useFormik({
    initialValues: {
      placas: currentCamion?.placas || '',
      chofer: currentCamion?.chofer || '',
      destino: currentCamion?.destino || '',
      receptor: currentCamion?.receptor || '',
      fecha_salida: currentCamion?.fecha_salida || new Date().toISOString().split('T')[0],
      observaciones: currentCamion?.observaciones || '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setErrorVal(null);
      try {
        const payload = {
          ...values,
          bodega_id: bodegaId,
          temporada_id: temporadaId,
        };

        let res;
        if (isEdit) {
          res = await camionesService.update(currentCamion.id, payload);
          // Actualizamos el estado interno para reflejar cambios
          setCurrentCamion(res.data?.camion || res);
        } else {
          res = await camionesService.create(payload);
          setCurrentCamion(res.data?.camion || res);
        }

        // Si es creación, NO cerramos para permitir agregar cargas
        // Si es edición, cerramos.
        // Always refresh parent list
        onSuccess();
        if (isEdit) {
          onClose();
        }
      } catch (err: any) {
        console.error(err);
        const msg = err.response?.data?.message || 'Error al guardar camión';
        setErrorVal(msg);
      } finally {
        setLoading(false);
      }
    },
  });

  // Confirmation Dialog State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleConfirmarClick = () => {
    if (!currentCamion?.id) return;
    setConfirmDialogOpen(true);
  };

  const executeConfirmar = async () => {
    if (!currentCamion?.id) return;
    setLoading(true);
    try {
      await camionesService.confirmar(currentCamion.id);
      setConfirmDialogOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorVal("Error al confirmar camión: " + (err.response?.data?.message || err.message));
      setConfirmDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshTruck = () => {
    if (!currentCamion?.id) return;
    // Re-fetch truck details to update loads
    camionesService.list({ id: currentCamion.id })
      .then((res: any) => {
        const found = Array.isArray(res.data) ? res.data.find((c: any) => c.id === currentCamion.id) : (res.data?.results?.find((c: any) => c.id === currentCamion.id) || currentCamion);
        setCurrentCamion(found);
      })
      .catch(console.error);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? (isConfirmado ? `Camión Confirmado #${currentCamion.numero || ''}` : 'Editar Camión') : 'Nuevo Camión'}</DialogTitle>
        <DialogContent dividers>
          {errorVal && <Alert severity="error" sx={{ mb: 2 }}>{errorVal}</Alert>}

          <form onSubmit={formik.handleSubmit} id="camion-form">
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <Box>
                <TextField
                  fullWidth
                  label="Placas"
                  name="placas"
                  value={formik.values.placas}
                  onChange={formik.handleChange}
                  error={formik.touched.placas && Boolean(formik.errors.placas)}
                  helperText={(formik.touched.placas && formik.errors.placas) as string}
                  disabled={isConfirmado || loading}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Chofer"
                  name="chofer"
                  value={formik.values.chofer}
                  onChange={formik.handleChange}
                  error={formik.touched.chofer && Boolean(formik.errors.chofer)}
                  helperText={(formik.touched.chofer && formik.errors.chofer) as string}
                  disabled={isConfirmado || loading}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Destino"
                  name="destino"
                  value={formik.values.destino}
                  onChange={formik.handleChange}
                  error={formik.touched.destino && Boolean(formik.errors.destino)}
                  helperText={(formik.touched.destino && formik.errors.destino) as string}
                  disabled={isConfirmado || loading}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Receptor"
                  name="receptor"
                  value={formik.values.receptor}
                  onChange={formik.handleChange}
                  error={formik.touched.receptor && Boolean(formik.errors.receptor)}
                  helperText={(formik.touched.receptor && formik.errors.receptor) as string}
                  disabled={isConfirmado || loading}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha Llegada"
                  name="fecha_salida"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.fecha_salida}
                  onChange={formik.handleChange}
                  error={formik.touched.fecha_salida && Boolean(formik.errors.fecha_salida)}
                  helperText={(formik.touched.fecha_salida && formik.errors.fecha_salida) as string}
                  disabled={isConfirmado || loading}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observaciones"
                  name="observaciones"
                  value={formik.values.observaciones}
                  onChange={formik.handleChange}
                  disabled={isConfirmado || loading}
                />
              </Box>
            </Box>
          </form>

          {/* Section Cargas */}
          {isEdit && currentCamion && (
            <Box mt={3} pt={2} borderTop={1} borderColor="divider">
              <CamionCargasEditor
                camionId={currentCamion.id}
                bodegaId={bodegaId}
                temporadaId={temporadaId}
                initialCargas={currentCamion.cargas || []}
                onCargasChange={() => {
                  onSuccess(); // Refresh parent table
                  refreshTruck(); // Refresh local loads
                }}
                readOnly={isConfirmado}
              />
            </Box>
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
          {!isConfirmado && (
            <>
              <Button
                type="submit"
                form="camion-form"
                variant="contained"
                disabled={loading}
              >
                {isEdit ? 'Guardar Cambios' : 'Crear Camión'}
              </Button>

              {isEdit && (
                <Button
                  onClick={handleConfirmarClick}
                  variant="contained"
                  color="warning"
                  disabled={loading || (currentCamion.cargas?.length === 0)}
                >
                  Confirmar Salida
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Summary Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          Confirmar Salida Definitiva
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            ¿Está seguro de confirmar este camión? Esta acción:
          </Typography>
          <ul>
            <li>Asignará un <strong>Folio Consecutivo</strong> permanente.</li>
            <li>Descontará definitivamente el stock del inventario.</li>
            <li><strong>Bloqueará</strong> cualquier edición posterior.</li>
          </ul>
          <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="subtitle2">Resumen:</Typography>
            <Typography variant="body2"><strong>Destino:</strong> {currentCamion?.destino}</Typography>
            <Typography variant="body2"><strong>Chofer:</strong> {currentCamion?.chofer}</Typography>
            <Typography variant="body2"><strong>Total Cargas:</strong> {currentCamion?.cargas?.length || 0} registros</Typography>
            <Typography variant="body2"><strong>Total cajas:</strong> {summary.totalCajas || 0}</Typography>
            <Typography variant="body2">
              <strong>Tipos de mango:</strong> {summary.tipos.length ? summary.tipos.join(", ") : "—"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={executeConfirmar} variant="contained" color="warning" disabled={loading} autoFocus>
            {loading ? 'Confirmando...' : 'Confirmar y Salir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CamionFormModal;
