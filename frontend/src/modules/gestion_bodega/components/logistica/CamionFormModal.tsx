
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
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';

interface CamionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bodegaId: number;
  temporadaId: number;
  semanaId?: number | null;
  camion?: any; // Si es ediciÃ³n
}

const validationSchema = yup.object({
  placas: yup.string().required('Requerido'),
  chofer: yup.string().required('Requerido'),
  destino: yup.string().required('Requerido'),
  receptor: yup.string().required('Requerido'),
});

const CamionFormModal: React.FC<CamionFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  bodegaId,
  temporadaId,
  semanaId,
  camion,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorVal, setErrorVal] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [currentCamion, setCurrentCamion] = useState<any>(camion);

  useEffect(() => {
    if (open) {
      if (camion?.id) {
        setLoading(true);
        camionesService.get(camion.id)
          .then((res: any) => {
            // DRF retrieve returns the single object directly in res.data
            setCurrentCamion(res.data || camion);
          })
          .catch(() => {
            setCurrentCamion(camion);
          })
          .finally(() => setLoading(false));
      } else {
        setCurrentCamion(null);
      }
      setErrorVal(null);
      setFormErrors([]);
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

    // P2 FIX (R3): Tipos desde cargas (FEFO consume clasificaciones reales con tipo_mango)
    const tiposFromCargas = (Array.from(
      new Set(
        cargas
          .map((c: any) => String(c?.tipo_mango || "").trim())
          .filter((v: string) => v)
      )
    ) as string[]).sort((a, b) => a.localeCompare(b));

    // Fallback a items solo si cargas no tiene tipos
    const tiposFromItems = (Array.from(
      new Set(
        items
          .map((i: any) => String(i?.tipo_mango || "").trim())
          .filter((v: string) => v)
      )
    ) as string[]).sort((a, b) => a.localeCompare(b));

    const tipos = tiposFromCargas.length ? tiposFromCargas : tiposFromItems;

    return { totalCajas, tipos };
  }, [currentCamion]);

  const formik = useFormik({
    initialValues: {
      placas: currentCamion?.placas || '',
      chofer: currentCamion?.chofer || '',
      destino: currentCamion?.destino || '',
      receptor: currentCamion?.receptor || '',
      observaciones: currentCamion?.observaciones || '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setErrorVal(null);
      setFormErrors([]);
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

        // Si es creaciÃ³n, NO cerramos para permitir agregar cargas
        // Si es ediciÃ³n, cerramos.
        // Always refresh parent list
        onSuccess();
        if (isEdit) {
          onClose();
        }
      } catch (err: unknown) {
        const normalized = applyBackendErrorsToFormik(err, formik as any, {
          fieldNames: ['placas', 'chofer', 'destino', 'receptor', 'observaciones'],
          alsoSetFormikErrors: true,
        });
        setFormErrors(normalized.formErrors);
        if (!normalized.formErrors.length && !Object.keys(normalized.fieldErrors).length) {
          const msg = (err as any)?.response?.data?.message || 'Error al guardar camion';
          setErrorVal(msg);
        }
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
      const res = await camionesService.confirmar(currentCamion.id);

      // Si backend retorna el camiÃ³n confirmado en res.data.camion, Ãºsalo.
      const maybeCamion = res?.data?.camion ?? res?.data ?? null;
      if (maybeCamion?.id) {
        setCurrentCamion(maybeCamion);
      } else {
        // Si no retorna, refetch para traer numero (folio) y cargas finales
        await camionesService.get(currentCamion.id)
          .then((r: any) => {
            setCurrentCamion(r.data || currentCamion);
          });
      }
      setConfirmDialogOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorVal("Error al confirmar camiÃ³n: " + (err.response?.data?.message || err.message));
      setConfirmDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshTruck = () => {
    if (!currentCamion?.id) return;
    // Re-fetch truck details to update loads
    camionesService.get(currentCamion.id)
      .then((res: any) => {
        setCurrentCamion(res.data || currentCamion);
      })
      .catch(console.error);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? (isConfirmado ? `CamiÃ³n Confirmado #${currentCamion.numero || ''}` : 'Editar CamiÃ³n') : 'Nuevo CamiÃ³n'}</DialogTitle>
        <DialogContent dividers>
          {errorVal && <Alert severity="error" sx={{ mb: 2 }}>{errorVal}</Alert>}
          <FormAlertBanner
            open={formErrors.length > 0}
            severity="error"
            title="Revisa la informacion"
            messages={formErrors}
          />

          {/* P2: Folio Display */}
          {isEdit && currentCamion?.folio && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Folio: <strong>{currentCamion.folio}</strong>
              </Typography>
            </Box>
          )}

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const validationErrors = await formik.validateForm();
              if (Object.keys(validationErrors).length) {
                const touched = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                  (acc, key) => ({ ...acc, [key]: true }),
                  {},
                );
                formik.setTouched(touched, false);
                focusFirstError(validationErrors, event.currentTarget);
                return;
              }
              formik.handleSubmit(event as any);
            }}
            id="camion-form">
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
                semanaId={semanaId}
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
                {isEdit ? 'Guardar Cambios' : 'Crear CamiÃ³n'}
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
            Â¿EstÃ¡ seguro de confirmar este camiÃ³n? Esta acciÃ³n:
          </Typography>
          <ul>
            <li>AsignarÃ¡ un <strong>Folio Consecutivo</strong> permanente.</li>
            <li>DescontarÃ¡ definitivamente el stock del inventario.</li>
            <li><strong>BloquearÃ¡</strong> cualquier ediciÃ³n posterior.</li>
          </ul>
          <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="subtitle2">Resumen:</Typography>
            <Typography variant="body2">
              <strong>Folio:</strong> {currentCamion?.numero ? `#${String(currentCamion.numero).padStart(5, "0")}` : "â€” (se asignarÃ¡ al confirmar)"}
            </Typography>
            <Typography variant="body2"><strong>Destino:</strong> {currentCamion?.destino}</Typography>
            <Typography variant="body2"><strong>Chofer:</strong> {currentCamion?.chofer}</Typography>
            <Typography variant="body2"><strong>Total Cargas:</strong> {currentCamion?.cargas?.length || 0} registros</Typography>
            <Typography variant="body2"><strong>Total cajas:</strong> {summary.totalCajas || 0}</Typography>
            <Typography variant="body2">
              <strong>Tipos de mango:</strong> {summary.tipos.length ? summary.tipos.join(", ") : "â€”"}
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

