import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';

import { PermissionButton } from '../../../../components/common/PermissionButton';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikDateField from '../../../../components/common/form/FormikDateField';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import FormikTextField from '../../../../components/common/form/FormikTextField';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import { parseDecimalInput } from '../../../../global/utils/numericInput';
import { CategoriaPreCosecha } from '../../types/categoriaPreCosechaTypes';
import { PreCosecha, PreCosechaCreateData, PreCosechaUpdateData } from '../../types/precosechaTypes';

type FormValues = {
  fecha: string;
  categoria: number;
  gastos_insumos: string;
  gastos_mano_obra: string;
  descripcion: string;
};

const schema = Yup.object({
  fecha: Yup.string().required('La fecha es requerida'),
  categoria: Yup.number().min(1, 'Selecciona una categoría').required('La categoría es requerida'),
  gastos_insumos: Yup.string()
    .required('El gasto en insumos es requerido')
    .test('no-negativo', 'Debe ser 0 o mayor', (value?: string) => {
      const n = parseDecimalInput(value ?? '');
      return Number.isFinite(n) && n >= 0;
    }),
  gastos_mano_obra: Yup.string()
    .required('El gasto en mano de obra es requerido')
    .test('no-negativo', 'Debe ser 0 o mayor', (value?: string) => {
      const n = parseDecimalInput(value ?? '');
      return Number.isFinite(n) && n >= 0;
    }),
  descripcion: Yup.string().max(250, 'Máximo 250 caracteres'),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PreCosechaCreateData | PreCosechaUpdateData) => Promise<unknown>;
  categorias: CategoriaPreCosecha[];
  temporadaId: number;
  maxFecha: string;
  readOnly?: boolean;
  initialValues?: PreCosecha;
  onCreateCategoria: () => void;
}

const PreCosechaFormModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  categorias,
  temporadaId,
  maxFecha,
  readOnly = false,
  initialValues,
  onCreateCategoria,
}) => {
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const initialFormValues = useMemo<FormValues>(() => {
    if (initialValues) {
      return {
        fecha: initialValues.fecha,
        categoria: initialValues.categoria,
        gastos_insumos: String(initialValues.gastos_insumos ?? ''),
        gastos_mano_obra: String(initialValues.gastos_mano_obra ?? ''),
        descripcion: initialValues.descripcion ?? '',
      };
    }
    return {
      fecha: maxFecha,
      categoria: 0,
      gastos_insumos: '',
      gastos_mano_obra: '',
      descripcion: '',
    };
  }, [initialValues, maxFecha]);

  const validateTotals = (values: FormValues) => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    const gastosInsumos = parseDecimalInput(values.gastos_insumos);
    const gastosManoObra = parseDecimalInput(values.gastos_mano_obra);
    const total = (Number.isFinite(gastosInsumos) ? gastosInsumos : 0) + (Number.isFinite(gastosManoObra) ? gastosManoObra : 0);
    if (total <= 0) {
      const message = 'La suma de insumos y mano de obra debe ser mayor que 0.';
      errors.gastos_insumos = message;
      errors.gastos_mano_obra = message;
    }
    return errors;
  };

  const handleSubmit = async (vals: FormValues, helpers: FormikHelpers<FormValues>) => {
    const gastosInsumos = parseDecimalInput(vals.gastos_insumos);
    const gastosManoObra = parseDecimalInput(vals.gastos_mano_obra);
    const payload = {
      fecha: vals.fecha,
      categoria: Number(vals.categoria),
      gastos_insumos: Number.isFinite(gastosInsumos) ? gastosInsumos : 0,
      gastos_mano_obra: Number.isFinite(gastosManoObra) ? gastosManoObra : 0,
      descripcion: vals.descripcion || '',
      ...(initialValues ? {} : { temporada: temporadaId }),
    };

    try {
      await onSubmit(payload as PreCosechaCreateData | PreCosechaUpdateData);
      setFormErrors([]);
      onClose();
    } catch (err: unknown) {
      const normalized = applyBackendErrorsToFormik(err, helpers);
      setFormErrors(normalized.formErrors);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>{readOnly ? 'Consultar PreCosecha' : initialValues ? 'Editar PreCosecha' : 'Nueva PreCosecha'}</DialogTitle>
      <Formik
        initialValues={initialFormValues}
        enableReinitialize
        validationSchema={schema}
        validate={validateTotals}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, handleChange, handleBlur, setTouched, validateForm, submitForm }) => (
          <Form
            onSubmit={async (event) => {
              event.preventDefault();
              if (readOnly) return;
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
              await submitForm();
            }}
          >
            <DialogContent>
              <FormAlertBanner
                open={formErrors.length > 0}
                severity="error"
                title="Revisa la información"
                messages={formErrors}
              />

              {!readOnly && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Verifica que este gasto de preparación no ya esté registrado como inversión operativa de una cosecha.
                </Alert>
              )}

              <FormikDateField
                label="Fecha"
                name="fecha"
                value={values.fecha}
                onChange={handleChange}
                onBlur={handleBlur}
                margin="normal"
                fullWidth
                disabled={readOnly}
                inputProps={{ max: maxFecha }}
              />

              <Box display="flex" gap={1} alignItems="flex-start">
                <TextField
                  select
                  fullWidth
                  margin="normal"
                  label="Categoría"
                  name="categoria"
                  value={values.categoria}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={readOnly}
                >
                  <MenuItem value={0} disabled>Selecciona una categoría</MenuItem>
                  {categorias.filter((cat) => cat.is_active).map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                  ))}
                </TextField>
                {!readOnly && (
                  <Button sx={{ mt: 2.1 }} onClick={onCreateCategoria}>
                    Nueva categoría
                  </Button>
                )}
              </Box>

              <FormikNumberField
                label="Gasto insumos"
                name="gastos_insumos"
                thousandSeparator
                allowDecimal
                maxDecimals={2}
                inputMode="decimal"
                placeholder="Ej. 12,500.50"
                margin="normal"
                fullWidth
                disabled={readOnly}
              />

              <FormikNumberField
                label="Gasto mano de obra"
                name="gastos_mano_obra"
                thousandSeparator
                allowDecimal
                maxDecimals={2}
                inputMode="decimal"
                placeholder="Ej. 8,000.00"
                margin="normal"
                fullWidth
                disabled={readOnly}
              />

              <FormikTextField
                label="Descripción"
                name="descripcion"
                value={values.descripcion}
                onChange={handleChange}
                onBlur={handleBlur}
                margin="normal"
                fullWidth
                multiline
                rows={2}
                disabled={readOnly}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cerrar</Button>
              {!readOnly && (
                <PermissionButton
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  perm={initialValues ? 'change_precosecha' : 'add_precosecha'}
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

export default PreCosechaFormModal;
