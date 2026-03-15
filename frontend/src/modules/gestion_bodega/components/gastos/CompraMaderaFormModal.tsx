// frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Alert, AlertTitle, Typography, Box,
  alpha, useTheme, Divider,
} from '@mui/material';
import { Save, Add, Forest } from '@mui/icons-material';
import { Formik, Form } from 'formik';

import { formatDateISO } from '../../../../global/utils/date';
import { parseDecimalInput, parseIntegerInput } from '../../../../global/utils/numericInput';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../../components/common/form/FormikTextField';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { gastosService } from '../../services/gastosService';

// Tipo de la compra para edición
export interface CompraMaderaEditData {
  id: number;
  proveedor_nombre: string;
  cantidad_cajas: number;
  precio_unitario: number;
  observaciones?: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  bodegaId?: number;
  temporadaId?: number;
  editData?: CompraMaderaEditData | null;
  onCreate: (payload: any) => Promise<any> | void;
  onUpdate: (id: number, payload: any) => Promise<any> | void;
  busy?: boolean;
};

export default function CompraMaderaFormModal({
  open, onClose, bodegaId, temporadaId, editData = null,
  onCreate, onUpdate, busy = false,
}: Props) {
  const theme = useTheme();
  const isEdit = !!editData;
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setFormErrors([]);
  }, [open, editData]);

  const hasContext = useMemo(() => !!bodegaId && !!temporadaId, [bodegaId, temporadaId]);

  const initialValues = useMemo(() => ({
    proveedor_nombre: editData?.proveedor_nombre ?? '',
    cantidad_cajas: editData?.cantidad_cajas != null ? String(editData.cantidad_cajas) : '',
    precio_unitario: editData?.precio_unitario != null ? String(editData.precio_unitario) : '',
    observaciones: editData?.observaciones ?? '',
    tipo_pago: 'CREDITO', // Solo aplica para creación
  }), [editData]);

  const validate = (values: typeof initialValues) => {
    const errors: Partial<Record<keyof typeof initialValues, string>> = {};
    if (!values.proveedor_nombre.trim()) errors.proveedor_nombre = 'El proveedor es requerido.';
    const cajas = parseIntegerInput(values.cantidad_cajas);
    if (!Number.isFinite(cajas) || cajas <= 0)
      errors.cantidad_cajas = 'Debe ser mayor a 0.';
    const precio = parseDecimalInput(values.precio_unitario);
    if (!Number.isFinite(precio) || precio <= 0)
      errors.precio_unitario = 'Debe ser mayor a 0.';
    return errors;
  };

  // Calcular total en tiempo real
  const calcTotal = (cajas: string, precio: string) => {
    const c = parseIntegerInput(cajas);
    const p = parseDecimalInput(precio);
    if (Number.isFinite(c) && Number.isFinite(p) && c > 0 && p > 0) {
      return (c * p).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    }
    return '$0.00';
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="compra-form-title">
      <DialogTitle id="compra-form-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Forest fontSize="small" sx={{ color: theme.palette.success.main }} />
        {isEdit ? 'Editar compra de madera' : 'Nueva compra de madera'}
      </DialogTitle>

      <Formik
        initialValues={initialValues}
        enableReinitialize
        validate={validate}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (values, helpers) => {
          const mCajas = parseIntegerInput(values.cantidad_cajas);
          const mPrecio = parseDecimalInput(values.precio_unitario);
          const payload = {
            bodega_id: bodegaId,
            temporada_id: temporadaId,
            proveedor_nombre: values.proveedor_nombre.trim(),
            cantidad_cajas: mCajas,
            precio_unitario: mPrecio,
            observaciones: values.observaciones?.trim() || '',
          };
          try {
            if (isEdit && editData) {
              await onUpdate(editData.id, payload);
            } else {
              const res = await onCreate(payload);
              // Si es creación y pago de contado, aplicar abono automático por el total
              if (values.tipo_pago === 'CONTADO' && res?.data?.compra?.id) {
                const totalCalculado = mCajas * mPrecio;
                await gastosService.compras.abonos(res.data.compra.id, {
                  monto: totalCalculado,
                  fecha: formatDateISO(new Date()),
                  metodo: 'Pago de Contado'
                });
              }
            }
            setFormErrors([]);
            onClose();
          } catch (err: unknown) {
            const normalized = applyBackendErrorsToFormik(err, helpers);
            setFormErrors(normalized.formErrors);
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, values, setTouched, validateForm, submitForm, setFieldValue }) => {
          const total = calcTotal(values.cantidad_cajas, values.precio_unitario);
          return (
            <Form
              onSubmit={async (event) => {
                event.preventDefault();
                const validationErrors = await validateForm();
                if (Object.keys(validationErrors).length) {
                  const touched = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                    (acc, key) => ({ ...acc, [key]: true }), {},
                  );
                  setTouched(touched, false);
                  focusFirstError(validationErrors, event.currentTarget);
                  return;
                }
                submitForm();
              }}
            >
              <DialogContent dividers>
                {!hasContext && (
                  <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                    <AlertTitle>Sin contexto</AlertTitle>
                    Selecciona una bodega y temporada antes de registrar compras.
                  </Alert>
                )}
                <FormAlertBanner
                  open={formErrors.length > 0}
                  severity="error"
                  title="Revisa la información"
                  messages={formErrors}
                />

                <Stack spacing={2.5}>
                  <FormikTextField
                    label="Proveedor"
                    name="proveedor_nombre"
                    size="small"
                    placeholder="Ej: Cajas Michoacán S.A."
                    disabled={busy}
                    autoFocus
                  />

                  <Stack direction="row" spacing={2}>
                    <FormikNumberField
                      label="Cantidad de cajas"
                      name="cantidad_cajas"
                      type="text"
                      size="small"
                      inputProps={{ min: 1, step: 1 }}
                      thousandSeparator
                      allowDecimal={false}
                      disabled={busy}
                      fullWidth
                    />
                    <FormikNumberField
                      label="Precio unitario ($)"
                      name="precio_unitario"
                      type="text"
                      size="small"
                      inputProps={{ min: 0.01, step: "any" }}
                      thousandSeparator
                      allowDecimal
                      maxDecimals={2}
                      disabled={busy}
                      fullWidth
                    />
                  </Stack>

                  {/* Total calculado */}
                  <Box
                    sx={{
                      p: 2, borderRadius: 2,
                      bgcolor: alpha(theme.palette.success.main, 0.06),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      MONTO TOTAL (auto-calculado)
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="success.dark">
                      {total}
                    </Typography>
                  </Box>

                  {!isEdit && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        TIPO DE PAGO INICIAL
                      </Typography>
                      <ToggleButtonGroup
                        color="primary"
                        value={values.tipo_pago}
                        exclusive
                        onChange={(_, nv) => { if (nv) setFieldValue('tipo_pago', nv); }}
                        fullWidth
                        size="small"
                        disabled={busy}
                      >
                        <ToggleButton value="CREDITO" sx={{ fontWeight: 600 }}>A Crédito</ToggleButton>
                        <ToggleButton value="CONTADO" sx={{ fontWeight: 600 }}>De Contado</ToggleButton>
                      </ToggleButtonGroup>
                      {values.tipo_pago === 'CONTADO' && (
                        <Typography variant="caption" color="text.secondary">
                          * Se registrará automáticamente un abono por el total ({total}) mediante Pago de Contado.
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ opacity: 0.5 }} />

                  <FormikTextField
                    label="Observaciones"
                    name="observaciones"
                    size="small"
                    multiline
                    minRows={2}
                    placeholder="Notas adicionales sobre la compra..."
                    disabled={busy}
                  />
                </Stack>
              </DialogContent>

              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!hasContext || busy || isSubmitting}
                  startIcon={isEdit ? <Save /> : <Add />}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
                >
                  {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar compra'}
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
