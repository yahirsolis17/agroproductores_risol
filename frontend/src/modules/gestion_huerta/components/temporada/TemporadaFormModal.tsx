import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';

import { Huerta } from '../../types/huertaTypes';
import { HuertaRentada } from '../../types/huertaRentadaTypes';
import { Temporada, TemporadaCreateData } from '../../types/temporadaTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';

const formatFechaLarga = (iso?: string | null) => {
  if (!iso) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';

  let value = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  value = value.replace(/ de (\d{4})$/, ' del $1');
  return value;
};

interface TemporadaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: TemporadaCreateData) => Promise<void>;
  huertas: Huerta[];
  huertasRentadas: HuertaRentada[];
  initialValues?: Temporada;
  readOnly?: boolean;
}

const currentYear = new Date().getFullYear();

const TemporadaFormModal: React.FC<TemporadaFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  huertas,
  huertasRentadas,
  initialValues,
  readOnly = false,
}) => {
  const defaults: TemporadaCreateData = {
    año: currentYear,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    huerta: undefined,
    huerta_rentada: undefined,
  };

  const validationSchema = Yup.object().shape({
    año: Yup.number()
      .min(2000, 'El año debe ser >= 2000')
      .max(currentYear + 1, `El año debe ser <= ${currentYear + 1}`)
      .required('Año requerido'),
    fecha_inicio: Yup.date()
      .min(new Date('2000-01-01'), 'Fecha invalida o muy antigua')
      .max(new Date(`${currentYear + 1}-12-31`), 'Fecha demasiado futura')
      .typeError('Fecha invalida')
      .required('Fecha de inicio requerida'),
  });

  const validate = (values: TemporadaCreateData) => {
    const errors: Record<string, string> = {};
    if (!initialValues && !readOnly) {
      if (!values.huerta && !values.huerta_rentada) {
        errors.huerta = 'Selecciona huerta propia o rentada';
      }
      if (values.huerta && values.huerta_rentada) {
        errors.huerta = 'Solo puedes seleccionar una';
      }
    }
    return errors;
  };

  const huertaNombre =
    initialValues?.huerta_nombre ||
    huertas.find((item) => item.id === initialValues?.huerta)?.nombre ||
    huertasRentadas.find((item) => item.id === initialValues?.huerta_rentada)?.nombre ||
    '';

  const handleSubmit = async (
    values: TemporadaCreateData,
    actions: FormikHelpers<TemporadaCreateData>,
  ) => {
    if (readOnly || !onSubmit) {
      onClose();
      return;
    }

    try {
      await onSubmit(values);
      onClose();
    } catch (err: unknown) {
      applyBackendErrorsToFormik(err, actions, {
        fieldNames: ['año', 'fecha_inicio', 'huerta', 'huerta_rentada'],
        spreadNonFieldToFields: ['año'],
        alsoSetFormikErrors: true,
      });
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {readOnly ? 'Detalles de la temporada' : initialValues ? 'Editar temporada' : 'Nueva temporada'}
      </DialogTitle>
      <Formik
        initialValues={
          initialValues
            ? {
                año: initialValues.año,
                fecha_inicio: initialValues.fecha_inicio,
                huerta: initialValues.huerta ?? undefined,
                huerta_rentada: initialValues.huerta_rentada ?? undefined,
              }
            : defaults
        }
        validationSchema={validationSchema}
        validate={validate}
        onSubmit={handleSubmit}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        enableReinitialize
      >
        {({ values, errors, handleChange, isSubmitting, status, validateForm, setTouched, submitForm }) => (
          <Form
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              const validationErrors = await validateForm();
              if (Object.keys(validationErrors).length) {
                const touched = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                  (acc, key) => ({ ...acc, [key]: true }),
                  {},
                );
                setTouched(touched, false);
                focusFirstError(validationErrors, event.currentTarget);
                return;
              }
              submitForm();
            }}
          >
            <DialogContent className="space-y-4">
              <FormAlertBanner
                open={Boolean((status as any)?.serverFormErrors?.length)}
                severity="error"
                title="Revisa la informacion"
                messages={(status as any)?.serverFormErrors ?? []}
              />

              <TextField
                fullWidth
                name="año"
                label="Año"
                type="number"
                value={values.año}
                onChange={handleChange}
                error={Boolean(errors.año)}
                helperText={errors.año}
                InputProps={{ readOnly: true }}
              />

              <TextField
                fullWidth
                name="fecha_inicio"
                label="Fecha de inicio"
                value={formatFechaLarga(values.fecha_inicio)}
                onChange={handleChange}
                error={Boolean(errors.fecha_inicio)}
                helperText={errors.fecha_inicio}
                InputProps={{ readOnly: true }}
              />

              <TextField
                fullWidth
                name="fecha_fin"
                label="Fecha de fin"
                value={formatFechaLarga((initialValues as any)?.fecha_fin)}
                InputProps={{ readOnly: true }}
              />

              <TextField
                fullWidth
                label="Huerta"
                value={huertaNombre}
                InputProps={{ readOnly: true }}
              />
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} variant="outlined">
                Cerrar
              </Button>
              {!readOnly && (
                <PermissionButton
                  perm={initialValues ? 'change_temporada' : 'add_temporada'}
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
                </PermissionButton>
              )}
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default TemporadaFormModal;
