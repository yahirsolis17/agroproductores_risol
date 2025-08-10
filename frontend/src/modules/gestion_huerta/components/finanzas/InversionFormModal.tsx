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
  fecha: Yup.string().required('Requerido'),
  categoria: Yup.number().min(1, 'Selecciona una categoría').required('Requerido'),
  gastos_insumos: Yup.string(),
  gastos_mano_obra: Yup.string(),
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

  const { refetch: refetchCategorias } = useCategoriasInversion();

  useEffect(() => { if (open) refetchCategorias(); }, [open]);

  // abrir modal crear desde el Autocomplete (evento global)
  useEffect(() => {
    const onOpen = () => setOpenCatModal(true);
    window.addEventListener('open-create-categoria', onOpen as any);
    return () => window.removeEventListener('open-create-categoria', onOpen as any);
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
    // Avisar al Autocomplete para insertar/seleccionar sin recargar
    window.dispatchEvent(new CustomEvent('categoria-created', { detail: c }));
    // Además, setear el valor del form
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
    } catch (err: any) {
      const backend = err?.data || err?.response?.data || {};
      const beErrors = backend.errors || backend.data?.errors || {};
      const fieldErrors: Record<string, string> = {};
      Object.entries(beErrors).forEach(([f, msgVal]: any) => {
        const text = Array.isArray(msgVal) ? String(msgVal[0]) : String(msgVal);
        fieldErrors[f] = text;
      });
      helpers.setErrors(fieldErrors);
      handleBackendNotification(backend);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const handleMoneyChange = (
    field: 'gastos_insumos' | 'gastos_mano_obra',
    raw: string,
    setFieldValue: (f: string, v: any) => void
  ) => {
    if (raw.trim() === '') {
      setFieldValue(field, '');
      return;
    }
    const cleaned = raw.replace(/[^\d]/g, '');
    const n = Number(cleaned);
    if (!Number.isFinite(n)) {
      setFieldValue(field, '');
      return;
    }
    const display = Math.trunc(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
    setFieldValue(field, display);
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
          validateOnChange={false}
          onSubmit={handleSubmit}
        >
          {({ values, errors, isSubmitting, handleChange, setFieldValue }) => (
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
                  onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
                  error={Boolean(msg(errors.fecha))}
                  helperText={msg(errors.fecha)}
                />

                {/* Categoría (Autocomplete con menú contextual) */}
                <CategoriaAutocomplete
                  valueId={values.categoria || null}
                  onChangeId={(id) => setFieldValue('categoria', id ?? 0)}
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
                    handleMoneyChange('gastos_insumos', e.target.value, setFieldValue)
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
                    handleMoneyChange('gastos_mano_obra', e.target.value, setFieldValue)
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
                  onChange={handleChange as React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>}
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
                  onClick={() => formikRef.current?.submitForm()}
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
