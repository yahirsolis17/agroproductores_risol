// src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx
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

const formatFechaLarga = (iso?: string | null) => {
  if (!iso) return '—';
  // Parse seguro para "YYYY-MM-DD" evitando desfases de zona horaria
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return '—';

  let s = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  // Último toque: "de 2025" → "del 2025"
  s = s.replace(/ de (\d{4})$/, ' del $1');
  return s;
};
interface TemporadaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: TemporadaCreateData) => Promise<void>;
  huertas: Huerta[];
  huertasRentadas: HuertaRentada[];
  initialValues?: Temporada;
  readOnly?: boolean; // ← NUEVO
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
      .min(2000, 'El año debe ser ≥ 2000')
      .max(currentYear + 1, `El año debe ser ≤ ${currentYear + 1}`)
      .required('Año requerido'),
    fecha_inicio: Yup.date()
      .min(new Date('2000-01-01'), 'Fecha inválida o muy antigua')
      .max(new Date(`${currentYear + 1}-12-31`), 'Fecha demasiado futura')
      .typeError('Fecha inválida')
      .required('Fecha de inicio requerida'),
  });

  const validate = (values: TemporadaCreateData) => {
    const errors: Record<string, string> = {};
    if (!initialValues && !readOnly) {
      if (!values.huerta && !values.huerta_rentada) {
        errors.huerta = 'Selecciona huerta (propia o rentada)';
      }
      if (values.huerta && values.huerta_rentada) {
        errors.huerta = 'Solo puedes seleccionar una';
      }
    }
    return errors;
  };

  const huertaNombre =
    initialValues?.huerta_nombre ||
    huertas.find((h) => h.id === initialValues?.huerta)?.nombre ||
    huertasRentadas.find((h) => h.id === initialValues?.huerta_rentada)?.nombre ||
    '';

  const handleSubmit = async (
    values: TemporadaCreateData,
    actions: FormikHelpers<TemporadaCreateData>
  ) => {
    if (readOnly || !onSubmit) return onClose(); // Evita submit si es solo lectura

    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      const backend = err.response?.data;
      if (backend) {
        if (Array.isArray(backend.non_field_errors)) {
          actions.setFieldError('año', backend.non_field_errors[0]);
        }
        Object.entries(backend).forEach(([field, msgs]) => {
          if (field !== 'non_field_errors' && Array.isArray(msgs)) {
            actions.setFieldError(field, msgs[0]);
          }
        });
      }
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {readOnly ? 'Detalles de la Temporada' : initialValues ? 'Editar Temporada' : 'Nueva Temporada'}
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
        enableReinitialize
      >
        {({
          values,
          errors,
          handleChange,
          isSubmitting,
        }) => (
          <Form>
            <DialogContent className="space-y-4">
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
                label="Fecha de Inicio"
                value={formatFechaLarga(values.fecha_inicio)}
                onChange={handleChange}
                error={Boolean(errors.fecha_inicio)}
                helperText={errors.fecha_inicio}
                InputProps={{ readOnly: true }}
              />

              <TextField
                fullWidth
                name="fecha_fin"
                label="Fecha de Fin"
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
