/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress,
} from '@mui/material';
import { Formik, Form, FormikHelpers, FormikProps } from 'formik';
import * as Yup from 'yup';

import {
  InversionCreateData,
  InversionUpdateData,
  InversionHuerta,
} from '../../types/inversionTypes';

import { PermissionButton } from '../../../../components/common/PermissionButton';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import CategoriaInversionFormModal from './CategoriaFormModal';
import CategoriaAutocomplete from './CategoriaAutocomplete';

/** YYYY-MM-DD local */
function formatLocalDateYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function msg(e: any): string {
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

const schema = Yup.object({
  fecha: Yup.string().required('Debes seleccionar una fecha.'),
  categoria: Yup.number().min(1, 'Selecciona una categoría.').required('Selecciona una categoría.'),
  gastos_insumos: Yup.string().required('El gasto en insumos es obligatorio.'),
  gastos_mano_obra: Yup.string().required('El gasto en mano de obra es obligatorio.'),
  descripcion: Yup.string().max(250, 'Máximo 250 caracteres'),
}).test('total-mayor-cero', 'Los gastos totales deben ser mayores a 0.', (values?: any) => {
  if (!values) return false;
  const gi = parseMXNumber(values.gastos_insumos || '');
  const gm = parseMXNumber(values.gastos_mano_obra || '');
  return gi + gm > 0;
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (vals: InversionCreateData | InversionUpdateData) => Promise<void>;
  initialValues?: InversionHuerta;
}

const InversionFormModal: React.FC<Props> = ({ open, onClose, onSubmit, initialValues }) => {
  const formikRef = useRef<FormikProps<FormValues>>(null);
  const [openCatModal, setOpenCatModal] = useState(false);
  const [liveValidate, setLiveValidate] = useState(false); // ← modo de validación en tiempo real

  const { refetch: refetchCategorias } = useCategoriasInversion();

  useEffect(() => {
    if (open) {
      refetchCategorias();
      setLiveValidate(false); // reset al abrir
    }
  }, [open]);

  // abrir modal crear desde el Autocomplete (evento global)
  useEffect(() => {
    const onOpen = () => setOpenCatModal(true);
    window.addEventListener('open-create-categoria', onOpen as any);
    return () => window.removeEventListener('open-create-categoria', onOpen as any);
  }, []);

  const initialFormValues: FormValues = initialValues
    ? {
        fecha: initialValues.fecha,
        categoria: initialValues.categoria,
        gastos_insumos: initialValues.gastos_insumos ? formatMX(initialValues.gastos_insumos) : '',
        gastos_mano_obra: initialValues.gastos_mano_obra ? formatMX(initialValues.gastos_mano_obra) : '',
        descripcion: initialValues.descripcion ?? '',
      }
    : {
        fecha: formatLocalDateYYYYMMDD(new Date()),
        categoria: 0,
        gastos_insumos: '',
        gastos_mano_obra: '',
        descripcion: '',
      };

  const handleNewCatSuccess = (c: CategoriaInversion) => {
    setOpenCatModal(false);
    // refrescamos y seteamos valor seleccionado
    refetchCategorias().then(() => {
      // setear el formik
      formikRef.current?.setFieldValue('categoria', c.id);
      // avisar al Autocomplete para que actualice listado y se cierre
      window.dispatchEvent(new CustomEvent('categoria-created', { detail: c }));
    });
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
      await onSubmit(payload);   // los thunks muestran toast genérico
      onClose();
    } catch (err: any) {
      // backend errors → activamos modo “live” y pintamos errores por campo
      setLiveValidate(true);
      const backend = err?.data || err?.response?.data || {};
      const beErrors = backend.errors || backend.data?.errors || {};
      const fieldErrors: Record<string, string> = {};
      Object.entries(beErrors).forEach(([f, msgVal]: any) => {
        const text = Array.isArray(msgVal) ? String(msgVal[0]) : String(msgVal);
        fieldErrors[f] = text;
      });
      helpers.setErrors(fieldErrors);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  // Helper: validar “total > 0” en caliente y limpiar/poner errores de los montos
  const revalidateTotals = (
    values: FormValues,
    setFieldError: (f: string, m?: string) => void
  ) => {
    if (!liveValidate) return;
    const gi = parseMXNumber(values.gastos_insumos || '');
    const gm = parseMXNumber(values.gastos_mano_obra || '');
    if (gi + gm <= 0) {
      const msg = 'Los gastos totales deben ser mayores a 0.';
      setFieldError('gastos_insumos', msg);
      setFieldError('gastos_mano_obra', msg);
    } else {
      setFieldError('gastos_insumos', '');
      setFieldError('gastos_mano_obra', '');
    }
  };

  const handleMoneyChange = (
    field: 'gastos_insumos' | 'gastos_mano_obra',
    raw: string,
    values: FormValues,
    setFieldValue: (f: string, v: any) => void,
    setFieldError: (f: string, m?: string) => void,
    hadError: boolean
  ) => {
    if (raw.trim() === '') {
      setFieldValue(field, '');
      if (liveValidate || hadError) setFieldError(field, 'Este campo es obligatorio.');
      revalidateTotals({ ...values, [field]: '' }, setFieldError);
      return;
    }
    const cleaned = raw.replace(/[^\d]/g, '');
    const n = Number(cleaned);
    if (!Number.isFinite(n)) {
      setFieldValue(field, '');
      if (liveValidate || hadError) setFieldError(field, 'Este campo es obligatorio.');
      revalidateTotals({ ...values, [field]: '' }, setFieldError);
      return;
    }
    const display = Math.trunc(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
    setFieldValue(field, display);

    // Limpia el error del propio campo al escribir algo válido
    if (liveValidate || hadError) setFieldError(field, '');

    // Y revalida el total
    revalidateTotals(
      {
        ...values,
        [field]: display,
      } as FormValues,
      setFieldError
    );
  };

  return (
    <>
      <CategoriaInversionFormModal
        open={openCatModal}
        onClose={() => setOpenCatModal(false)}
        onSuccess={handleNewCatSuccess}
      />

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{initialValues ? 'Editar inversión' : 'Nueva inversión'}</DialogTitle>

        <Formik<FormValues>
          innerRef={formikRef}
          initialValues={initialFormValues}
          enableReinitialize
          validationSchema={schema}
          validateOnBlur={false}
          validateOnChange={false}  // ← desactivado; validamos “en vivo” manualmente
          onSubmit={handleSubmit}
        >
          {({ values, errors, isSubmitting, handleChange, setFieldValue, setFieldError }) => (
            <Form>
              <DialogContent dividers className="space-y-4">
                {/* Fecha */}
                <TextField
                  fullWidth
                  type="date"
                  name="fecha"
                  label="Fecha"
                  InputLabelProps={{ shrink: true }}
                  value={values.fecha}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleChange(e);
                    if (liveValidate || !!errors.fecha) setFieldError('fecha', '');
                  }}
                  error={Boolean(msg(errors.fecha))}
                  helperText={msg(errors.fecha)}
                />

                {/* Categoría */}
                <CategoriaAutocomplete
                  valueId={values.categoria || null}
                  onChangeId={(id) => {
                    setFieldValue('categoria', id ?? 0);
                    if (liveValidate || !!errors.categoria) setFieldError('categoria', '');
                  }}
                  label="Categoría"
                  error={Boolean(msg(errors.categoria))}
                  helperText={msg(errors.categoria)}
                />

                {/* Gastos insumos */}
                <TextField
                  fullWidth
                  label="Gastos en insumos"
                  name="gastos_insumos"
                  value={values.gastos_insumos}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleMoneyChange(
                      'gastos_insumos',
                      e.target.value,
                      values,
                      setFieldValue,
                      setFieldError,
                      Boolean(errors.gastos_insumos)
                    )
                  }
                  inputMode="numeric"
                  placeholder="Ej. 12,500"
                  error={Boolean(msg(errors.gastos_insumos))}
                  helperText={msg(errors.gastos_insumos)}
                />

                {/* Gastos mano de obra */}
                <TextField
                  fullWidth
                  label="Gastos mano de obra"
                  name="gastos_mano_obra"
                  value={values.gastos_mano_obra}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleMoneyChange(
                      'gastos_mano_obra',
                      e.target.value,
                      values,
                      setFieldValue,
                      setFieldError,
                      Boolean(errors.gastos_mano_obra)
                    )
                  }
                  inputMode="numeric"
                  placeholder="Ej. 8,000"
                  error={Boolean(msg(errors.gastos_mano_obra))}
                  helperText={msg(errors.gastos_mano_obra)}
                />

                {/* Descripción */}
                <TextField
                  fullWidth
                  label="Descripción (opcional)"
                  name="descripcion"
                  multiline
                  minRows={2}
                  value={values.descripcion}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    handleChange(e);
                    // Limpia error de longitud si ya no aplica
                    if (liveValidate || !!errors.descripcion) {
                      const v = (e.target as HTMLInputElement).value;
                      if (!v || v.length <= 250) setFieldError('descripcion', '');
                    }
                  }}
                  error={Boolean(msg(errors.descripcion))}
                  helperText={msg(errors.descripcion)}
                />
              </DialogContent>

              <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <PermissionButton
                  perm={initialValues ? 'change_inversion' : 'add_inversion'}
                  type="button"
                  variant="contained"
                  disabled={isSubmitting}
                  onClick={() => {
                    // Primer intento de submit → activa validación en vivo
                    setLiveValidate(true);
                    formikRef.current?.submitForm();
                  }}
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
