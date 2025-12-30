import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { Add } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { Formik, Form } from 'formik';

// Campos manuales: tipo (texto) y cantidad (nÃºmero)
import { formatDateISO, parseLocalDateStrict } from '../../../../global/utils/date';
import { applyBackendErrorsToFormik, isValidationError } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikDateField from '../../../../components/common/form/FormikDateField';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import FormikTextField from '../../../../components/common/form/FormikTextField';

type CreatePayload = {
  fecha: string;
  tipo_mango: string;
  cantidad_cajas: number;
  huertero_nombre?: string;
  observaciones?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreatePayload) => Promise<void> | void;
  disabled?: boolean;
  bodegaId?: number;
  temporadaId?: number;
};

export default function FastCaptureModal({ open, onClose, onCreate, disabled, bodegaId, temporadaId }: Props) {
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setFormErrors([]);
  }, [open]);

  const initialValues = useMemo(() => ({
    fecha: formatDateISO(new Date()),
    tipo_mango: '',
    cantidad_cajas: '1',
    huertero_nombre: '',
    observaciones: '',
  }), []);

  const validate = (values: typeof initialValues) => {
    const errors: Partial<Record<keyof typeof initialValues, string>> = {};
    const parsed = parseLocalDateStrict(values.fecha);
    if (isNaN(parsed.getTime())) {
      errors.fecha = 'Fecha inválida.';
    }
    if (!values.tipo_mango.trim()) {
      errors.tipo_mango = 'El tipo es requerido.';
    }
    const n = Number(values.cantidad_cajas);
    if (!Number.isFinite(n) || Math.trunc(n) <= 0) {
      errors.cantidad_cajas = 'Debe ser un entero mayor a 0.';
    }
    return errors;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Captura rapida</DialogTitle>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validate={validate}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (values, helpers) => {
          try {
            const payload: CreatePayload = {
              fecha: values.fecha,
              tipo_mango: values.tipo_mango,
              cantidad_cajas: Math.trunc(Number(values.cantidad_cajas)),
              huertero_nombre: values.huertero_nombre || undefined,
              observaciones: values.observaciones || undefined,
            };
            await onCreate(payload);
            setFormErrors([]);
            onClose();
          } catch (err: unknown) {
            const normalized = applyBackendErrorsToFormik(err, helpers);
            if (isValidationError(err)) {
              setFormErrors(normalized.formErrors);
            } else {
              setFormErrors([]);
              const backend = (err as any)?.data || (err as any)?.response?.data || {};
              handleBackendNotification(backend);
            }
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, setFieldValue, values, setTouched, validateForm, submitForm }) => {
          const disabledSubmit = disabled || !bodegaId || !temporadaId;
          const pickHoy = () => setFieldValue('fecha', formatDateISO(new Date()));
          const pickAyer = () => {
            const d = parseLocalDateStrict(new Date());
            d.setDate(d.getDate() - 1);
            setFieldValue('fecha', formatDateISO(d));
          };

          return (
            <Form
              onSubmit={async (event) => {
                event.preventDefault();
                const validationErrors = await validateForm();
                if (Object.keys(validationErrors).length) {
                  const touchedFields = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {}
                  );
                  setTouched(touchedFields, false);
                  focusFirstError(validationErrors, event.currentTarget);
                  return;
                }
                submitForm();
              }}
            >
              <DialogContent dividers>
                <FormAlertBanner
                  open={formErrors.length > 0}
                  severity="error"
                  title="Revisa la información"
                  messages={formErrors}
                />
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" size="small" onClick={pickHoy}>Hoy</Button>
                    <Button variant="outlined" size="small" onClick={pickAyer}>Ayer</Button>
                    <FormikDateField
                      label="Fecha"
                      name="fecha"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={values.fecha}
                    />
                  </Stack>

                  <FormikTextField
                    label="Tipo de mango"
                    name="tipo_mango"
                    size="small"
                  />

                  <FormikNumberField
                    label="Cantidad de cajas"
                    name="cantidad_cajas"
                    type="number"
                    size="small"
                    inputProps={{ min: 1 }}
                  />

                  <FormikTextField
                    label="Huertero (opcional)"
                    name="huertero_nombre"
                    size="small"
                  />

                  <FormikTextField
                    label="Observaciones (opcional)"
                    name="observaciones"
                    size="small"
                    multiline
                    minRows={2}
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Tooltip title={disabled ? 'Operación no disponible' : ''} disableHoverListener={!disabled}>
                  <span>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={disabledSubmit || isSubmitting}
                      startIcon={<Add />}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
                    >
                      Crear
                    </Button>
                  </span>
                </Tooltip>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}

