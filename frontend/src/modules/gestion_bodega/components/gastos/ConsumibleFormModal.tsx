// frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Alert, AlertTitle, Typography, Box,
  alpha, useTheme, Divider,
} from '@mui/material';
import { Save, Add, ShoppingCart } from '@mui/icons-material';
import { Formik, Form } from 'formik';

import { formatDateISO } from '../../../../global/utils/date';
import { parseDecimalInput, parseIntegerInput } from '../../../../global/utils/numericInput';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../../components/common/form/FormikTextField';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import FormikDateField from '../../../../components/common/form/FormikDateField';

export interface ConsumibleEditData {
  id: number;
  concepto: string;
  cantidad: number;
  costo_unitario: number;
  fecha: string;
  observaciones?: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  bodegaId?: number;
  temporadaId?: number;
  editData?: ConsumibleEditData | null;
  onCreate: (payload: any) => Promise<any> | void;
  onUpdate: (id: number, payload: any) => Promise<any> | void;
  busy?: boolean;
};

export default function ConsumibleFormModal({
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
    concepto: editData?.concepto ?? '',
    cantidad: editData?.cantidad != null ? String(editData.cantidad) : '1',
    costo_unitario: editData?.costo_unitario != null ? String(editData.costo_unitario) : '',
    fecha: editData?.fecha ?? formatDateISO(new Date()),
    observaciones: editData?.observaciones ?? '',
  }), [editData]);

  const validate = (values: typeof initialValues) => {
    const errors: Partial<Record<keyof typeof initialValues, string>> = {};
    if (!values.concepto.trim()) errors.concepto = 'El concepto es requerido.';
    const cant = parseIntegerInput(values.cantidad);
    if (!Number.isFinite(cant) || cant <= 0 || !Number.isInteger(cant))
      errors.cantidad = 'Debe ser un entero mayor a 0.';
    const costo = parseDecimalInput(values.costo_unitario);
    if (!Number.isFinite(costo) || costo < 0)
      errors.costo_unitario = 'Debe ser mayor o igual a 0.';
    if (!values.fecha) errors.fecha = 'La fecha es requerida.';
    return errors;
  };

  const calcTotal = (cantidad: string, costo: string) => {
    const c = parseIntegerInput(cantidad);
    const p = parseDecimalInput(costo);
    if (Number.isFinite(c) && Number.isFinite(p) && c > 0 && p >= 0) {
      return (c * p).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    }
    return '$0.00';
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="consumible-form-title">
      <DialogTitle id="consumible-form-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShoppingCart fontSize="small" sx={{ color: theme.palette.primary.main }} />
        {isEdit ? 'Editar consumible' : 'Nuevo consumible'}
      </DialogTitle>

      <Formik
        initialValues={initialValues}
        enableReinitialize
        validate={validate}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (values, helpers) => {
          const payload = {
            bodega_id: bodegaId,
            temporada_id: temporadaId,
            concepto: values.concepto.trim(),
            cantidad: parseIntegerInput(values.cantidad),
            costo_unitario: parseDecimalInput(values.costo_unitario),
            fecha: values.fecha,
            observaciones: values.observaciones?.trim() || '',
          };
          try {
            if (isEdit && editData) {
              await onUpdate(editData.id, payload);
            } else {
              await onCreate(payload);
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
        {({ isSubmitting, values, setTouched, validateForm, submitForm }) => {
          const total = calcTotal(values.cantidad, values.costo_unitario);
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
                    Selecciona una bodega y temporada antes de registrar consumibles.
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
                    label="Concepto"
                    name="concepto"
                    size="small"
                    placeholder="Ej: Rafia, Gises, Pegamento..."
                    disabled={busy}
                    autoFocus
                  />

                  <FormikDateField
                    label="Fecha"
                    name="fecha"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    disabled={busy}
                  />

                  <Stack direction="row" spacing={2}>
                    <FormikNumberField
                      label="Cantidad"
                      name="cantidad"
                      type="text"
                      size="small"
                      inputProps={{ min: 1, step: 1 }}
                      thousandSeparator
                      allowDecimal={false}
                      disabled={busy}
                      fullWidth
                    />
                    <FormikNumberField
                      label="Costo unitario ($)"
                      name="costo_unitario"
                      type="text"
                      size="small"
                      inputProps={{ min: 0, step: "any" }}
                      thousandSeparator
                      allowDecimal
                      maxDecimals={2}
                      disabled={busy}
                      fullWidth
                    />
                  </Stack>

                  {/* Total */}
                  <Box
                    sx={{
                      p: 2, borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      TOTAL (auto-calculado)
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="primary.dark">
                      {total}
                    </Typography>
                  </Box>

                  <Divider sx={{ opacity: 0.5 }} />

                  <FormikTextField
                    label="Observaciones"
                    name="observaciones"
                    size="small"
                    multiline
                    minRows={2}
                    placeholder="Notas sobre el gasto..."
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
                  {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar consumible'}
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
