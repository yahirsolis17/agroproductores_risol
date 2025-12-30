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
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormikDateField from '../../../../components/common/form/FormikDateField';
import FormikTextField from '../../../../components/common/form/FormikTextField';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';

/** YYYY-MM-DD local (evita desfase de zona) */
function formatLocalDateYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const TODAY_YMD     = formatLocalDateYYYYMMDD(new Date());
const YESTERDAY_YMD = formatLocalDateYYYYMMDD(new Date(Date.now() - 24 * 60 * 60 * 1000));
/** enteros (sin decimales) desde UI con comas */
function parseMXNumber(input: string): number {
  if (!input) return NaN; // vacío NO es 0
  const cleaned = input.replace(/\s+/g, '').replace(/,/g, '');
  const n = Math.trunc(Number(cleaned));
  return Number.isFinite(n) ? n : NaN;
}

/** enteros formateados es-MX (sin decimales) */
function formatMX(input: string | number): string {
  if (input === '' || input === null || input === undefined) return '';
  const n = typeof input === 'number' ? input : parseMXNumber(input);
  if (!Number.isFinite(n)) return '';
  return Math.trunc(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

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
    .test('solo-numeros', 'Ingresa solo números y comas', (value?: string) => {
      if (!value) return false;
      const cleaned = value.replace(/[\s,]/g, '');
      return /^\d+$/.test(cleaned);
    })
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => {
      const n = parseMXNumber(value || '');
      return Number.isFinite(n) && n > 0;
    }),
  // 👇 aquí el backend exige > 0 (no 0)
  precio_por_caja: Yup.string()
    .required('El precio por caja es requerido')
    .test('solo-numeros', 'Ingresa solo números y comas', (value?: string) => {
      if (!value) return false;
      const cleaned = value.replace(/[\s,]/g, '');
      return /^\d+$/.test(cleaned);
    })
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => {
      const n = parseMXNumber(value || '');
      return Number.isFinite(n) && n > 0;
    }),
  gasto: Yup.string() // obligatorio y ≥ 0
    .required('El gasto es obligatorio')
    .test('solo-numeros', 'Ingresa solo números y comas', (value?: string) => {
      if (!value) return false;
      const cleaned = value.replace(/[\s,]/g, '');
      return /^\d+$/.test(cleaned);
    })
    .test('no-negativo', 'No puede ser negativo', (value?: string) => {
      const n = parseMXNumber(value || '');
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
    num_cajas: initialValues.num_cajas != null ? formatMX(initialValues.num_cajas) : '',
    precio_por_caja: initialValues.precio_por_caja != null ? formatMX(initialValues.precio_por_caja) : '',
    gasto: initialValues.gasto != null ? formatMX(initialValues.gasto) : '',
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
    const payload: VentaCreateData | VentaUpdateData = {
      fecha_venta: vals.fecha_venta,
      tipo_mango: vals.tipo_mango.trim(),
      num_cajas: parseMXNumber(vals.num_cajas),
      precio_por_caja: parseMXNumber(vals.precio_por_caja),
      gasto: parseMXNumber(vals.gasto),
      descripcion: vals.descripcion || '',
    };

    try {
      await onSubmit(payload);
      setFormErrors([]);
      onClose();
    } catch (err: unknown) {
      const normalized = applyBackendErrorsToFormik(err, helpers);
      setFormErrors(normalized.formErrors);
      if (!Object.keys(normalized.fieldErrors).length && !normalized.formErrors.length) {
        const backend = (err as any)?.data || (err as any)?.response?.data || {};
        handleBackendNotification(backend);
      }
    } finally {
      helpers.setSubmitting(false);
    }
  };

  /** Cambio en campos numéricos con validación reactiva + formateo */
  const handleMoneyChange = (
    field: 'num_cajas' | 'precio_por_caja' | 'gasto',
    raw: string,
    setFieldValue: (f: string, v: unknown) => void
  ) => {
    let errorMsg: string | undefined;

    // Solo dígitos, espacios y comas
    if (/[^0-9\s,]/.test(raw)) {
      errorMsg = 'Ingresa solo números y comas';
      setFieldValue(field, raw);
      formikRef.current?.setFieldError(field, errorMsg);
      return;
    }
    // No negativos
    if (/-/.test(raw)) {
      errorMsg = 'No se permiten números negativos';
      setFieldValue(field, raw);
      formikRef.current?.setFieldError(field, errorMsg);
      return;
    }

    const cleaned = raw.replace(/[\s,]/g, '');
    const n = cleaned ? Number(cleaned) : NaN;

    if (cleaned) {
      if (field === 'num_cajas') {
        if (!Number.isFinite(n) || n <= 0) errorMsg = 'Debe ser mayor que 0';
      } else if (field === 'gasto') {
        if (!Number.isFinite(n) || n < 0) errorMsg = 'No puede ser negativo';
      } else {
        // precio_por_caja
        if (!Number.isFinite(n) || n <= 0) errorMsg = 'Debe ser mayor que 0';
      }
    } else {
      // vacío: deja que Yup marque "Requerido" en submit/blur
      errorMsg = undefined;
    }
    const formatted = cleaned ? Math.trunc(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }) : '';
    setFieldValue(field, formatted);
    formikRef.current?.setFieldError(field, errorMsg);
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

              <FormikTextField
                label="Número de cajas"
                name="num_cajas"
                value={values.num_cajas}
                onChange={(e) => handleMoneyChange('num_cajas', e.target.value, setFieldValue)}
                onBlur={handleBlur}
                inputMode="numeric"
                placeholder="Ej. 320"
                margin="normal"
                fullWidth
              />

              <FormikTextField
                label="Precio por caja"
                name="precio_por_caja"
                value={values.precio_por_caja}
                onChange={(e) => handleMoneyChange('precio_por_caja', e.target.value, setFieldValue)}
                onBlur={handleBlur}
                inputMode="numeric"
                placeholder="Ej. 220"
                margin="normal"
                fullWidth
              />

              <FormikTextField
                label="Gasto"
                name="gasto"
                value={values.gasto}
                onChange={(e) => handleMoneyChange('gasto', e.target.value, setFieldValue)}
                onBlur={handleBlur}
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
