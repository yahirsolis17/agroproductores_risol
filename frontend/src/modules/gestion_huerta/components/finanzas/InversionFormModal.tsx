/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
} from '@mui/material';
import { Formik, Form, FormikHelpers, FormikProps } from 'formik';
import * as Yup from 'yup';

import {
  InversionCreateData,
  InversionUpdateData,
  InversionHuerta,
} from '../../types/inversionTypes';

import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import CategoriaInversionFormModal from './CategoriaFormModal';
import CategoriaAutocomplete from './CategoriaAutocomplete';

/** YYYY-MM-DD local */
function formatLocalDateYYYYMMDD(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** enteros (sin decimales) desde UI con comas */
function parseMXNumber(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/\s+/g, '').replace(/,/g, '');
  const n = Math.trunc(Number(cleaned));
  return Number.isFinite(n) ? n : 0;
}

/** enteros formateados es-MX (sin decimales) */
function formatMX(input: string | number): string {
  if (input === '' || input === null || input === undefined) return '';
  const n = typeof input === 'number' ? input : parseMXNumber(input);
  if (!Number.isFinite(n)) return '';
  return Math.trunc(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function msg(e: unknown): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (Array.isArray(e)) return e.map(x => (typeof x === 'string' ? x : '')).filter(Boolean)[0] || '';
  return '';
}

type FormValues = {
  fecha: string;
  categoria: number;
  gastos_insumos: string;
  gastos_mano_obra: string;
  descripcion: string;
};

// Schema with per-field validations and custom numeric checks
const schema = Yup.object({
  fecha: Yup.string().required('La fecha es requerida'),
  categoria: Yup.number().min(1, 'Selecciona una categoría').required('La categoría es requerida'),
  gastos_insumos: Yup.string()
    .required('El gasto de insumos es requerido')
    .test('solo-numeros', 'Ingresa solo números y comas', (value?: string) => {
      if (!value) return false;
      // allow digits, spaces and commas only
      const cleaned = value.replace(/[\s,]/g, '');
      return /^\d+$/.test(cleaned);
    })
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => parseMXNumber(value || '') > 0),
  gastos_mano_obra: Yup.string()
    .required('El gasto de mano de obra es requerido')
    .test('solo-numeros', 'Ingresa solo números y comas', (value?: string) => {
      if (!value) return false;
      const cleaned = value.replace(/[\s,]/g, '');
      return /^\d+$/.test(cleaned);
    })
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => parseMXNumber(value || '') > 0),
  descripcion: Yup.string().max(250, 'Máximo 250 caracteres'),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (vals: InversionCreateData | InversionUpdateData) => Promise<unknown>;
  initialValues?: InversionHuerta;
}

const InversionFormModal: React.FC<Props> = ({ open, onClose, onSubmit, initialValues }) => {
  const formikRef = useRef<FormikProps<FormValues>>(null);
  const [openCatModal, setOpenCatModal] = useState(false);
  const { refetch: refetchCategorias } = useCategoriasInversion();

  useEffect(() => {
    if (open) refetchCategorias();
  }, [open]);

  // abrir modal crear desde el Autocomplete (evento global)
  useEffect(() => {
    const onOpen = () => setOpenCatModal(true);
    window.addEventListener('open-create-categoria', onOpen as EventListener);
    return () => window.removeEventListener('open-create-categoria', onOpen as EventListener);
  }, []);

  const initialFormValues: FormValues = initialValues ? {
    fecha: initialValues.fecha,
    categoria: initialValues.categoria,
    gastos_insumos: initialValues.gastos_insumos ? formatMX(initialValues.gastos_insumos) : '',
    gastos_mano_obra: initialValues.gastos_mano_obra ? formatMX(initialValues.gastos_mano_obra) : '',
    descripcion: initialValues.descripcion ?? '',
  } : {
    fecha: formatLocalDateYYYYMMDD(new Date()),
    categoria: 0,
    gastos_insumos: '',
    gastos_mano_obra: '',
    descripcion: '',
  };

  const handleNewCatSuccess = (c: CategoriaInversion) => {
    setOpenCatModal(false);
    // notify autocompletes to refresh
    window.dispatchEvent(new CustomEvent('categoria-inversion/refresh'));
    // select the new category
    formikRef.current?.setFieldValue('categoria', c.id);
  };

  const handleSubmit = async (vals: FormValues, helpers: FormikHelpers<FormValues>) => {
    const payload: InversionCreateData | InversionUpdateData = {
      fecha: vals.fecha,
      categoria: Number(vals.categoria),
      gastos_insumos: parseMXNumber(vals.gastos_insumos),
      gastos_mano_obra: parseMXNumber(vals.gastos_mano_obra),
      descripcion: vals.descripcion || '',
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const backend = (err as any)?.data || (err as any)?.response?.data || {};
      const beErrors = backend.errors || backend.data?.errors || {};
      const fieldErrors: Record<string, string> = {};
      // replicate general errors across key fields
      if (Array.isArray(beErrors.non_field_errors)) {
        const m = beErrors.non_field_errors[0] || 'Error de validación';
        ['fecha', 'categoria', 'gastos_insumos', 'gastos_mano_obra'].forEach((f) => {
          fieldErrors[f] = m;
        });
      }
      Object.entries(beErrors).forEach(([f, msgVal]: [string, unknown]) => {
        if (f !== 'non_field_errors') {
          const text = Array.isArray(msgVal) ? String((msgVal as any)[0]) : String(msgVal);
          fieldErrors[f] = text;
        }
      });
      helpers.setErrors(fieldErrors);
      handleBackendNotification(backend);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  /**
   * Maneja el cambio en campos de dinero.
   * Evalúa el valor crudo para detectar caracteres inválidos, negativos o cero.
   * Formatea el valor para mostrar con comas (es-MX) y registra mensajes de error específicos.
   */
  const handleMoneyChange = (
    field: 'gastos_insumos' | 'gastos_mano_obra',
    raw: string,
    setFieldValue: (f: string, v: unknown) => void
  ) => {
    let errorMsg: string | undefined;
    // Detect invalid characters: anything other than digits, spaces or commas
    if (/[^0-9\s,]/.test(raw)) {
      errorMsg = 'Ingresa solo números y comas';
      setFieldValue(field, raw);
      formikRef.current?.setFieldError(field, errorMsg);
      return;
    }
    // Detect negative sign
    if (/-/.test(raw)) {
      errorMsg = 'No se permiten números negativos';
      setFieldValue(field, raw);
      formikRef.current?.setFieldError(field, errorMsg);
      return;
    }
    // Remove non-digit characters to parse
    const cleaned = raw.replace(/[\s,]/g, '');
    const n = Number(cleaned);
    // If not a finite number or <= 0, set error
    if (!Number.isFinite(n) || n <= 0) {
      errorMsg = 'Debe ser mayor que 0';
    }
    // Format display with locale (es-MX) grouping separators
    const formatted = cleaned ? Math.trunc(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }) : '';
    setFieldValue(field, formatted);
    formikRef.current?.setFieldError(field, errorMsg);
  };

  return (
    <>
      {/* Modal para categoría nueva */}
      <CategoriaInversionFormModal
        open={openCatModal}
        onClose={() => setOpenCatModal(false)}
        onSuccess={handleNewCatSuccess}
      />

      <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') onClose(); }} maxWidth="sm" fullWidth>
        <DialogTitle>{initialValues ? 'Editar inversión' : 'Nueva inversión'}</DialogTitle>
        <Formik
          innerRef={formikRef}
          initialValues={initialFormValues}
          enableReinitialize
          validationSchema={schema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, isSubmitting, handleChange, handleBlur, setFieldValue }) => (
            <Form>
              <DialogContent>
                {/* Fecha */}
                <TextField
                  label="Fecha"
                  type="date"
                  name="fecha"
                  value={values.fecha}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  margin="normal"
                  fullWidth
                  error={touched.fecha && Boolean(msg(errors.fecha))}
                  helperText={touched.fecha && msg(errors.fecha)}
                />

                <CategoriaAutocomplete
                  valueId={values.categoria}
                  onChangeId={(id: number | null) => {
                    // Actualiza el valor en el formulario
                    setFieldValue('categoria', id ?? 0);
                    // Al seleccionar una categoría válida, limpia el error asociado
                    if (id) {
                      formikRef.current?.setFieldError('categoria', undefined);
                    }
                    formikRef.current?.setFieldTouched('categoria', true, false);
                  }}
                  label="Categoría"
                  error={Boolean(touched.categoria && msg(errors.categoria))}
                  helperText={touched.categoria ? (msg(errors.categoria) || undefined) : undefined}
                />

                {/* Gasto insumos */}
                <TextField
                  label="Gasto insumos"
                  name="gastos_insumos"
                  value={values.gastos_insumos}
                  onChange={(e) =>
                    handleMoneyChange('gastos_insumos', e.target.value, setFieldValue)
                  }
                  onBlur={handleBlur}
                  inputMode="numeric"
                  placeholder="Ej. 12,500"
                  margin="normal"
                  fullWidth
                  error={touched.gastos_insumos && Boolean(msg(errors.gastos_insumos))}
                  helperText={touched.gastos_insumos && msg(errors.gastos_insumos)}
                />

                {/* Gastos mano de obra */}
                <TextField
                  label="Gasto mano de obra"
                  name="gastos_mano_obra"
                  value={values.gastos_mano_obra}
                  onChange={(e) =>
                    handleMoneyChange('gastos_mano_obra', e.target.value, setFieldValue)
                  }
                  onBlur={handleBlur}
                  inputMode="numeric"
                  placeholder="Ej. 8,000"
                  margin="normal"
                  fullWidth
                  error={touched.gastos_mano_obra && Boolean(msg(errors.gastos_mano_obra))}
                  helperText={touched.gastos_mano_obra && msg(errors.gastos_mano_obra)}
                />

                {/* Descripción */}
                <TextField
                  label="Descripción"
                  name="descripcion"
                  value={values.descripcion}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  margin="normal"
                  fullWidth
                  multiline
                  rows={2}
                  error={touched.descripcion && Boolean(msg(errors.descripcion))}
                  helperText={touched.descripcion && msg(errors.descripcion)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>

                {/* 👇 Permiso correcto según modo (crear vs editar) */}
                <PermissionButton
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  perm={initialValues ? 'change_inversion' : 'add_inversion'}
                >
                  {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
                </PermissionButton>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default InversionFormModal;
