import React, { useState } from 'react';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';

import { PermissionButton } from '../../../../components/common/PermissionButton';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../../components/common/form/FormikTextField';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import { categoriaPreCosechaService } from '../../services/categoriaPreCosechaService';
import { CategoriaPreCosecha } from '../../types/categoriaPreCosechaTypes';

const schema = Yup.object({
  nombre: Yup.string().trim().min(3, 'Mínimo 3 caracteres').required('Requerido'),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (cat: CategoriaPreCosecha) => void;
}

const CategoriaPreCosechaFormModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [formErrors, setFormErrors] = useState<string[]>([]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Registrar categoría de PreCosecha</DialogTitle>
      <Formik
        initialValues={{ nombre: '' }}
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (vals, helpers) => {
          try {
            const response = await categoriaPreCosechaService.create({ nombre: vals.nombre.trim() });
            const categoria = response.data.categoria;
            onSuccess(categoria);
            onClose();
          } catch (err: unknown) {
            const normalized = applyBackendErrorsToFormik(err, helpers);
            setFormErrors(normalized.formErrors);
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
                perm="add_categoriaprecosecha"
              >
                {isSubmitting ? <CircularProgress size={20} /> : 'Crear'}
              </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaPreCosechaFormModal;
