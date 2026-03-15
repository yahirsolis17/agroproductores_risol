// src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress
} from '@mui/material';
import { Formik, Form, FormikHelpers, FormikProps } from 'formik';
import * as Yup from 'yup';

import {
  InversionCreateData,
  InversionUpdateData,
  InversionHuerta,
} from '../../types/inversionTypes';

import { PermissionButton } from '../../../../components/common/PermissionButton';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormikDateField from '../../../../components/common/form/FormikDateField';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import FormikTextField from '../../../../components/common/form/FormikTextField';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import CategoriaInversionFormModal from './CategoriaFormModal';
import CategoriaAutocomplete from './CategoriaAutocomplete';
import { parseIntegerInput } from '../../../../global/utils/numericInput';

/** YYYY-MM-DD local */
function formatLocalDateYYYYMMDD(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type FormValues = {
  fecha: string;
  categoria: number;
  gastos_insumos: string;
  gastos_mano_obra: string;
  descripcion: string;
};
const today = formatLocalDateYYYYMMDD(new Date());
const yesterday = formatLocalDateYYYYMMDD(new Date(Date.now() - 86400000));

// Schema with per-field validations and custom numeric checks
const schema = Yup.object({
  fecha: Yup.string().required('La fecha es requerida'),
  categoria: Yup.number().min(1, 'Selecciona una categoría').required('La categoría es requerida'),
  gastos_insumos: Yup.string()
    .required('El gasto de insumos es requerido')
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => {
      const n = parseIntegerInput(value ?? '');
      return Number.isFinite(n) && n > 0;
    }),
  gastos_mano_obra: Yup.string()
    .required('El gasto de mano de obra es requerido')
    .test('mayor-cero', 'Debe ser mayor que 0', (value?: string) => {
      const n = parseIntegerInput(value ?? '');
      return Number.isFinite(n) && n > 0;
    }),
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
  const [formErrors, setFormErrors] = useState<string[]>([]);
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
    gastos_insumos: initialValues.gastos_insumos != null ? String(initialValues.gastos_insumos) : '',
    gastos_mano_obra: initialValues.gastos_mano_obra != null ? String(initialValues.gastos_mano_obra) : '',
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
    const gastosInsumos = parseIntegerInput(vals.gastos_insumos);
    const gastosManoObra = parseIntegerInput(vals.gastos_mano_obra);
    const payload: InversionCreateData | InversionUpdateData = {
      fecha: vals.fecha,
      categoria: Number(vals.categoria),
      gastos_insumos: Number.isFinite(gastosInsumos) ? gastosInsumos : 0,
      gastos_mano_obra: Number.isFinite(gastosManoObra) ? gastosManoObra : 0,
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
          validateOnChange={false}
          validateOnBlur
          validateOnMount={false}
          onSubmit={handleSubmit}
        >
          {({ values, isSubmitting, handleChange, handleBlur, setTouched, validateForm }) => (
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
                {/* Fecha */}
                <FormikDateField
                  label="Fecha"
                  name="fecha"
                  value={values.fecha}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  margin="normal"
                  fullWidth
                  inputProps={{ min: yesterday, max: today }}   // <-- límites UI
                />

                <CategoriaAutocomplete name="categoria" label="Categoría" />

                {/* Gasto insumos */}
                <FormikNumberField
                  label="Gasto insumos"
                  name="gastos_insumos"
                  thousandSeparator
                  allowDecimal={false}
                  inputMode="numeric"
                  placeholder="Ej. 12,500"
                  margin="normal"
                  fullWidth
                />

                {/* Gastos mano de obra */}
                <FormikNumberField
                  label="Gasto mano de obra"
                  name="gastos_mano_obra"
                  thousandSeparator
                  allowDecimal={false}
                  inputMode="numeric"
                  placeholder="Ej. 8,000"
                  margin="normal"
                  fullWidth
                />

                {/* Descripción */}
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
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>

                {/* 👇 Permiso correcto según modo (crear vs editar) */}
                <PermissionButton
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  perm={initialValues ? 'change_inversioneshuerta' : 'add_inversioneshuerta'}
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
