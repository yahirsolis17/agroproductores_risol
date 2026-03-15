// src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress
} from '@mui/material';
import { Formik, Form, FormikHelpers, FormikProps } from 'formik';
import * as Yup from 'yup';

import {
  VentaCreateData,
  VentaUpdateData,
  VentaHuerta,
} from '../../types/ventaTypes';

import { PermissionButton } from '../../../../components/common/PermissionButton';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormikDateField from '../../../../components/common/form/FormikDateField';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import FormikTextField from '../../../../components/common/form/FormikTextField';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import { parseIntegerInput } from '../../../../global/utils/numericInput';

/** YYYY-MM-DD local (evita desfase de zona) */
function formatLocalDateYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const TODAY_YMD     = formatLocalDateYYYYMMDD(new Date());
const YESTERDAY_YMD = formatLocalDateYYYYMMDD(new Date(Date.now() - 24 * 60 * 60 * 1000));

type FormValues = {
  fecha_venta: string;
  tipo_mango: string;
  num_cajas: string;        // UI
  precio_por_caja: string;  // UI
  gasto: string;            // UI
  descripcion: string;
};

/** Validaciones (alineadas al backend) */
const schema = Yup.object({
    fecha_venta: Yup.string()
    .required('La fecha es requerida')
    .test('hoy-o-ayer', 'Solo se permite HOY o AYER', (v) => v === TODAY_YMD || v === YESTERDAY_YMD),
  tipo_mango: Yup.string().trim().required('El tipo de mango es requerido'),
  num_cajas: Yup.string()
    .required('El número de cajas es requerido')
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => {
      const n = parseIntegerInput(value ?? '');
      return Number.isFinite(n) && n > 0;
    }),
  // 👇 aquí el backend exige > 0 (no 0)
  precio_por_caja: Yup.string()
    .required('El precio por caja es requerido')
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => {
      const n = parseIntegerInput(value ?? '');
      return Number.isFinite(n) && n > 0;
    }),
  gasto: Yup.string() // obligatorio y ≥ 0
    .required('El gasto es obligatorio')
    .test('no-negativo', 'No puede ser negativo', (value?: string) => {
      const n = parseIntegerInput(value ?? '');
      return Number.isFinite(n) && n >= 0;
    }),
  descripcion: Yup.string().max(250, 'Máximo 250 caracteres'),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (vals: VentaCreateData | VentaUpdateData) => Promise<unknown>;
  initialValues?: VentaHuerta;
}

const VentaFormModal: React.FC<Props> = ({ open, onClose, onSubmit, initialValues }) => {
  const formikRef = useRef<FormikProps<FormValues>>(null);
  const [formErrors, setFormErrors] = React.useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        formikRef.current?.setErrors({});
        formikRef.current?.setSubmitting(false);
      }, 0);
    }
  }, [open]);

  const initialFormValues: FormValues = initialValues ? {
    fecha_venta: initialValues.fecha_venta,
    tipo_mango: initialValues.tipo_mango || '',
    num_cajas: initialValues.num_cajas != null ? String(initialValues.num_cajas) : '',
    precio_por_caja: initialValues.precio_por_caja != null ? String(initialValues.precio_por_caja) : '',
    gasto: initialValues.gasto != null ? String(initialValues.gasto) : '',
    descripcion: initialValues.descripcion ?? '',
  } : {
    fecha_venta: formatLocalDateYYYYMMDD(new Date()),
    tipo_mango: '',
    num_cajas: '',
    precio_por_caja: '',
    gasto: '',
    descripcion: '',
  };

  const handleSubmit = async (vals: FormValues, helpers: FormikHelpers<FormValues>) => {
    const numCajas = parseIntegerInput(vals.num_cajas);
    const precioPorCaja = parseIntegerInput(vals.precio_por_caja);
    const gasto = parseIntegerInput(vals.gasto);
    const payload: VentaCreateData | VentaUpdateData = {
      fecha_venta: vals.fecha_venta,
      tipo_mango: vals.tipo_mango.trim(),
      num_cajas: Number.isFinite(numCajas) ? numCajas : 0,
      precio_por_caja: Number.isFinite(precioPorCaja) ? precioPorCaja : 0,
      gasto: Number.isFinite(gasto) ? gasto : 0,
      descripcion: vals.descripcion || '',
    };

    try {
      await onSubmit(payload);
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
      <DialogTitle>{initialValues ? 'Editar venta' : 'Nueva venta'}</DialogTitle>

      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        enableReinitialize
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, handleChange, handleBlur, setFieldValue, setTouched, validateForm }) => (
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
              formikRef.current?.handleSubmit(event);
            }}
          >
            <DialogContent>
              <FormAlertBanner
                open={formErrors.length > 0}
                severity="error"
                title="Revisa la información"
                messages={formErrors}
              />

              <FormikDateField
                label="Fecha"
                name="fecha_venta"
                value={values.fecha_venta}
                onChange={(e) => {
                  setFieldValue('fecha_venta', e.target.value);
                  formikRef.current?.setFieldError('fecha_venta', undefined);
                }}
                onBlur={handleBlur}
                margin="normal"
                fullWidth
                inputProps={{
                  min: YESTERDAY_YMD,
                  max: TODAY_YMD,
                }}
              />

              <FormikTextField
                label="Tipo de mango"
                name="tipo_mango"
                value={values.tipo_mango}
                onChange={(e) => {
                  setFieldValue('tipo_mango', e.target.value);
                  formikRef.current?.setFieldError('tipo_mango', undefined);
                }}
                onBlur={handleBlur}
                margin="normal"
                fullWidth
                placeholder="Ej. Ataulfo, Kent, Tommy Atkins…"
              />

              <FormikNumberField
                label="Número de cajas"
                name="num_cajas"
                thousandSeparator
                allowDecimal={false}
                inputMode="numeric"
                placeholder="Ej. 320"
                margin="normal"
                fullWidth
              />

              <FormikNumberField
                label="Precio por caja"
                name="precio_por_caja"
                thousandSeparator
                allowDecimal={false}
                inputMode="numeric"
                placeholder="Ej. 220"
                margin="normal"
                fullWidth
              />

              <FormikNumberField
                label="Gasto"
                name="gasto"
                thousandSeparator
                allowDecimal={false}
                inputMode="numeric"
                placeholder="Ej. 3,500"
                margin="normal"
                fullWidth
              />

              <FormikTextField
                label="Descripción (Opcional)"
                name="descripcion"
                value={values.descripcion}
                onChange={handleChange}
                onBlur={handleBlur}
                margin="normal"
                fullWidth
                multiline
                rows={2}
                inputProps={{
                min: formatLocalDateYYYYMMDD(new Date(Date.now() - 24*60*60*1000)), // AYER
                max: formatLocalDateYYYYMMDD(new Date()),                          // HOY
                }}

              />
            </DialogContent>


            <DialogActions>
              <Button onClick={onClose}>Cancelar</Button>
              <PermissionButton
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                // 👇 corregido: solo codename (sin prefijo de app)
                perm={initialValues ? 'change_venta' : 'add_venta'}
              >
                {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
              </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default VentaFormModal;
