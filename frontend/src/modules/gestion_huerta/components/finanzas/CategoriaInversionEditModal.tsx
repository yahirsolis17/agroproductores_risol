// src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import {PermissionButton} from '../../../../components/common/PermissionButton';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../../components/common/form/FormikTextField';

interface Props {
  open: boolean;
  categoria: CategoriaInversion | null;
  onClose: () => void;
  onSuccess: (updated?: CategoriaInversion) => void;
}

const schema = Yup.object({
  nombre: Yup.string().trim().min(3, 'Mínimo 3 caracteres').required('Requerido'),
});

const CategoriaInversionEditModal: React.FC<Props> = ({ open, categoria, onClose, onSuccess }) => {
  const { editCategoria } = useCategoriasInversion();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const initialNombre = categoria?.nombre ?? '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Editar categoría</DialogTitle>

      <Formik
        enableReinitialize
        initialValues={{ nombre: initialNombre }}
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (vals, helpers) => {
          if (!categoria) {
            onClose();
            return;
          }
          try {
            const nombre = vals.nombre.trim();
            if (!nombre || nombre === categoria.nombre) {
              onClose();
              return;
            }
            const updated = await editCategoria(categoria.id, { nombre });

            window.dispatchEvent(new CustomEvent('categoria-updated', { detail: updated }));

            onSuccess(updated);
            setFormErrors([]);
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
        }}
      >
        {({ values, handleChange, handleBlur, isSubmitting, submitForm, setTouched, validateForm }) => (
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
              submitForm();
            }}
          >
            <DialogContent dividers>
              <FormAlertBanner
                open={formErrors.length > 0}
                severity="error"
                title="Revisa la información"
                messages={formErrors}
              />
              <FormikTextField
                autoFocus
                fullWidth
                label="Nombre de la categoría"
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                <PermissionButton
                  variant="contained"
                  disabled={isSubmitting}
                  onClick={submitForm}
                  perm="change_categoriainversion"
                >
                  {isSubmitting ? <CircularProgress size={20} /> : 'Guardar'}
                </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaInversionEditModal;
