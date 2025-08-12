// src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
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

/** YYYY-MM-DD local (evita desfase de zona) */
function formatLocalDateYYYYMMDD(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** enteros (sin decimales) desde UI con comas */
function parseMXNumber(input: string): number {
  if (!input) return NaN; // ← importante: vacío NO es 0 (para que sea “obligatorio”)
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

function msg(e: any): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (Array.isArray(e)) return e.map(x => (typeof x === 'string' ? x : '')).filter(Boolean)[0] || '';
  return '';
}

type FormValues = {
  fecha_venta: string;
  tipo_mango: string;
  num_cajas: string;        // UI: con comas
  precio_por_caja: string;  // UI: con comas
  gasto: string;            // UI: con comas (obligatorio >= 0)
  descripcion: string;
};

/** Validaciones (idéntica filosofía de Inversiones) */
const schema = Yup.object({
  fecha_venta: Yup.string().required('La fecha es requerida'),
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
  precio_por_caja: Yup.string()
    .required('El precio por caja es requerido')
    .test('solo-numeros', 'Ingresa solo números y comas', (value?: string) => {
      if (!value) return false;
      const cleaned = value.replace(/[\s,]/g, '');
      return /^\d+$/.test(cleaned);
    })
    .test('no-negativo', 'No puede ser negativo', (value?: string) => {
      const n = parseMXNumber(value || '');
      return Number.isFinite(n) && n >= 0;
    }),
  gasto: Yup.string() // ← OBLIGATORIO
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
  onSubmit: (vals: VentaCreateData | VentaUpdateData) => Promise<any>;
  initialValues?: VentaHuerta;
}

const VentaFormModal: React.FC<Props> = ({ open, onClose, onSubmit, initialValues }) => {
  const formikRef = useRef<FormikProps<FormValues>>(null);

  useEffect(() => {
    // cada que se abre, limpia errores residuales
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
    fecha_venta: formatLocalDateYYYYMMDD(new Date()), // ← preseleccionado HOY
    tipo_mango: '',
    num_cajas: '',
    precio_por_caja: '',
    gasto: '', // ← vacío por defecto (obligatorio)
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
      onClose();
    } catch (err: any) {
      const backend = err?.data || err?.response?.data || {};
      const beErrors = backend.errors || backend.data?.errors || {};
      const fieldErrors: Record<string, string> = {};

      // Errores de objeto → reflejar en campos claves
      if (Array.isArray(beErrors.non_field_errors) && beErrors.non_field_errors.length) {
        const m = String(beErrors.non_field_errors[0]);
        ['fecha_venta', 'tipo_mango', 'num_cajas', 'precio_por_caja', 'gasto'].forEach((f) => {
          fieldErrors[f] = m;
        });
      }

      // Mapear nombres de backend → nombres del form
      Object.entries(beErrors).forEach(([f, val]: [string, any]) => {
        const text = Array.isArray(val) ? String(val[0]) : String(val);
        switch (f) {
          case 'fecha':
          case 'fecha_venta':
            fieldErrors['fecha_venta'] = text; break;
          case 'tipo_mango':
            fieldErrors['tipo_mango'] = text; break;
          case 'num_cajas':
            fieldErrors['num_cajas'] = text; break;
          case 'precio_por_caja':
            fieldErrors['precio_por_caja'] = text; break;
          case 'gasto':
            fieldErrors['gasto'] = text; break;
          case 'descripcion':
            fieldErrors['descripcion'] = text; break;
          default:
            // ignorar otros; los muestra el toast
            break;
        }
      });

      helpers.setErrors(fieldErrors);
      handleBackendNotification(backend);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  /** Cambio en campos numéricos con validación reactiva y formateo con comas */
  const handleMoneyChange = (
    field: 'num_cajas' | 'precio_por_caja' | 'gasto',
    raw: string,
    setFieldValue: (f: string, v: any) => void
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

    // Reglas por campo
    if (field === 'num_cajas') {
      if (!Number.isFinite(n) || n <= 0) errorMsg = 'Debe ser mayor que 0';
    } else {
      // precio_por_caja y gasto: >= 0, y "gasto" es obligatorio (se valida arriba), aquí solo no-negativo
      if (!Number.isFinite(n) || n < 0) errorMsg = 'No puede ser negativo';
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
        validateOnBlur={false}
        validateOnChange={false}
        onSubmit={handleSubmit}
      >
        {({ values, errors, isSubmitting, handleChange, setFieldValue }) => (
          <Form>
            <DialogContent>

              {/* Fecha (debajo del título; por defecto HOY) */}
              <TextField
                label="Fecha"
                type="date"
                name="fecha_venta"
                value={values.fecha_venta}
                onChange={(e) => {
                  setFieldValue('fecha_venta', e.target.value);
                  formikRef.current?.setFieldError('fecha_venta', undefined);
                }}
                margin="normal"
                fullWidth
                error={Boolean(msg(errors.fecha_venta))}
                helperText={msg(errors.fecha_venta)}
                InputLabelProps={{ shrink: true }}
              />

              {/* Tipo de mango — TextField NORMAL (SIN Autocomplete) */}
              <TextField
                label="Tipo de mango"
                name="tipo_mango"
                value={values.tipo_mango}
                onChange={(e) => {
                  setFieldValue('tipo_mango', e.target.value);
                  formikRef.current?.setFieldError('tipo_mango', undefined);
                }}
                margin="normal"
                fullWidth
                placeholder="Ej. Ataulfo, Kent, Tommy Atkins…"
                error={Boolean(msg(errors.tipo_mango))}
                helperText={msg(errors.tipo_mango)}
              />

              {/* Número de cajas */}
              <TextField
                label="Número de cajas"
                name="num_cajas"
                value={values.num_cajas}
                onChange={(e) => handleMoneyChange('num_cajas', e.target.value, setFieldValue)}
                inputMode="numeric"
                placeholder="Ej. 1,000"
                margin="normal"
                fullWidth
                error={Boolean(msg(errors.num_cajas))}
                helperText={msg(errors.num_cajas)}
              />

              {/* Precio por caja */}
              <TextField
                label="Precio por caja"
                name="precio_por_caja"
                value={values.precio_por_caja}
                onChange={(e) => handleMoneyChange('precio_por_caja', e.target.value, setFieldValue)}
                inputMode="numeric"
                placeholder="Ej. 28"
                margin="normal"
                fullWidth
                error={Boolean(msg(errors.precio_por_caja))}
                helperText={msg(errors.precio_por_caja)}
              />

              {/* Gasto (OBLIGATORIO, puede ser 0, sin decimales) */}
              <TextField
                label="Gasto"
                name="gasto"
                value={values.gasto}
                onChange={(e) => handleMoneyChange('gasto', e.target.value, setFieldValue)}
                inputMode="numeric"
                placeholder="Ej. 3,500"
                margin="normal"
                fullWidth
                error={Boolean(msg(errors.gasto))}
                helperText={msg(errors.gasto)}
              />

              {/* Descripción */}
              <TextField
                label="Descripción"
                name="descripcion"
                value={values.descripcion}
                onChange={handleChange}
                margin="normal"
                fullWidth
                multiline
                rows={2}
                error={Boolean(msg(errors.descripcion))}
                helperText={msg(errors.descripcion)}
              />
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose}>Cancelar</Button>
              <PermissionButton
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                perm="gestion_huerta.change_venta"
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
