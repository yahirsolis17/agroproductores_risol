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
import Autocomplete from '@mui/material/Autocomplete';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Huerta } from '../../types/huertaTypes';
import { HuertaRentada } from '../../types/huertaRentadaTypes';
import { Temporada, TemporadaCreateData } from '../../types/temporadaTypes';

interface TemporadaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TemporadaCreateData) => Promise<void>;
  huertas: Huerta[];
  huertasRentadas: HuertaRentada[];
  initialValues?: Temporada; // solo para edición
}

const currentYear = new Date().getFullYear();

const TemporadaFormModal: React.FC<TemporadaFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  huertas,
  huertasRentadas,
  initialValues,
}) => {
  // valores por defecto para creación
  const defaults: TemporadaCreateData = {
    año: currentYear,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    huerta: undefined,
    huerta_rentada: undefined,
  };

  // esquema de validación Yup
  const validationSchema = Yup.object().shape({
    año: Yup.number()
      .min(2000, 'El año debe ser ≥ 2000')
      .max(currentYear + 1, `El año debe ser ≤ ${currentYear + 1}`)
      .required('Año requerido'),
    fecha_inicio: Yup.date()
      .min(new Date('2000-01-01'), 'Fecha inválida o muy antigua')
      .max(new Date(`${currentYear + 1}-12-31`), 'Fecha demasiado futura')
      .typeError('Fecha inválida (YYYY-MM-DD)')
      .required('Fecha de inicio requerida'),
  });

  // validación manual para creación (huerta)
  const validate = (values: TemporadaCreateData) => {
    const errors: Record<string, string> = {};
    if (!initialValues) {
      if (!values.huerta && !values.huerta_rentada) {
        errors.huerta = 'Selecciona huerta (propia o rentada)';
      }
      if (values.huerta && values.huerta_rentada) {
        errors.huerta = 'Solo puedes seleccionar una';
      }
    }
    return errors;
  };

  // captura nombre de huerta para edición
  const huertaNombre =
    initialValues?.huerta_nombre ||
    huertas.find((h) => h.id === initialValues?.huerta)?.nombre ||
    huertasRentadas.find((h) => h.id === initialValues?.huerta_rentada)?.nombre ||
    '';

  // submit handler con mapeo de errores del backend
  const handleSubmit = async (
    values: TemporadaCreateData,
    actions: FormikHelpers<TemporadaCreateData>
  ) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      const backend = err.response?.data;
      if (backend) {
        // non_field_errors a campo específico (año)
        if (Array.isArray(backend.non_field_errors)) {
          actions.setFieldError('año', backend.non_field_errors[0]);
        }
        // resto de errores por campo
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
        {initialValues ? 'Editar Temporada' : 'Nueva Temporada'}
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
          setFieldValue,
          isSubmitting,
        }) => (
          <Form>
            <DialogContent className="space-y-4">
              {/* Año */}
              <TextField
                fullWidth
                name="año"
                label="Año"
                type="number"
                value={values.año}
                onChange={handleChange}
                error={Boolean(errors.año)}
                helperText={errors.año}
                InputProps={initialValues ? { readOnly: true } : undefined}
              />

              {/* Fecha de inicio */}
              <TextField
                fullWidth
                name="fecha_inicio"
                label="Fecha de Inicio"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={values.fecha_inicio}
                onChange={handleChange}
                error={Boolean(errors.fecha_inicio)}
                helperText={errors.fecha_inicio}
                InputProps={initialValues ? { readOnly: true } : undefined}
              />

              {/* Huerta: solo lectura en edición, selects en creación */}
              {initialValues ? (
                <TextField
                  fullWidth
                  label="Huerta"
                  value={huertaNombre}
                  InputProps={{ readOnly: true }}
                />
              ) : (
                <>
                  <Autocomplete
                    options={huertas}
                    getOptionLabel={(h) => h.nombre}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={
                      values.huerta
                        ? huertas.find((h) => h.id === values.huerta) || null
                        : null
                    }
                    onChange={(_, val) =>
                      setFieldValue('huerta', val ? val.id : undefined)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Huerta Propia"
                        error={Boolean(errors.huerta)}
                        helperText={errors.huerta}
                      />
                    )}
                  />

                  <Autocomplete
                    options={huertasRentadas}
                    getOptionLabel={(h) => h.nombre}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={
                      values.huerta_rentada
                        ? huertasRentadas.find(
                            (h) => h.id === values.huerta_rentada
                          ) || null
                        : null
                    }
                    onChange={(_, val) =>
                      setFieldValue(
                        'huerta_rentada',
                        val ? val.id : undefined
                      )
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Huerta Rentada"
                        error={Boolean(errors.huerta)}
                        helperText={errors.huerta}
                      />
                    )}
                  />
                </>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} variant="outlined">
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default TemporadaFormModal;
