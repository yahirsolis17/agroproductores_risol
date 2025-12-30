// src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx
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
import { applyBackendErrorsToFormik, isValidationError } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../../components/common/form/FormikTextField';
interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (cat: CategoriaInversion) => void;
  initial?: CategoriaInversion;
}

const schema = Yup.object({
  nombre: Yup.string().trim().min(3, 'Mínimo 3 caracteres').required('Requerido'),
});

const CategoriaFormModal: React.FC<Props> = ({ open, onClose, onSuccess, initial }) => {
  const { addCategoria, editCategoria } = useCategoriasInversion();
  const isEdit = Boolean(initial);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Editar categoría' : 'Registrar nueva categoría'}</DialogTitle>
      <Formik
        initialValues={{ nombre: initial?.nombre ?? '' }}
        validationSchema={schema}
        enableReinitialize
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (vals, helpers) => {
          try {
            const nombre = vals.nombre.trim();
            const cat = isEdit
              ? await editCategoria(initial!.id, { nombre })
              : await addCategoria({ nombre });

            window.dispatchEvent(
              new CustomEvent(isEdit ? 'categoria-updated' : 'categoria-created', { detail: cat })
            );

            onSuccess(cat);
            onClose();
          } catch (err: unknown) {
            const normalized = applyBackendErrorsToFormik(err, helpers);
            if (isValidationError(err)) {
              setFormErrors(normalized.formErrors);
            } else {
              setFormErrors([]);
              const backend = (err as any)?.data || (err as any)?.response?.data || {};
              handleBackendNotification(backend);
            }
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, handleChange, handleBlur, isSubmitting, setTouched, validateForm, submitForm }) => (
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
                id="nombre"
                name="nombre"
                label="Nombre de la categoría"
                value={values.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                <PermissionButton
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  perm={isEdit ? 'change_categoriainversion' : 'add_categoriainversion'}
                >
                  {isSubmitting ? <CircularProgress size={20} /> : isEdit ? 'Guardar' : 'Crear'}
                </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaFormModal;
