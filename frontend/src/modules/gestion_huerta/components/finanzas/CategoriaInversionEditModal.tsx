// src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import {PermissionButton} from '../../../../components/common/PermissionButton';

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

  const initialNombre = categoria?.nombre ?? '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Editar categoría</DialogTitle>

      <Formik
        enableReinitialize
        initialValues={{ nombre: initialNombre }}
        validationSchema={schema}
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
          } catch (err: unknown) {
            let be: any = err;
            if (typeof err === 'object' && err !== null) {
              const maybe = err as { response?: { data?: any }; data?: any };
              be = maybe.response?.data ?? maybe.data ?? err;
            }
            const fieldErrors = be?.errors || be?.data?.errors || {};
            Object.entries(fieldErrors).forEach(([k, v]: any) => {
              helpers.setFieldError(k, Array.isArray(v) ? v[0] : String(v));
            });
            if (fieldErrors?.nombre) {
              helpers.setTouched({ nombre: true }, false);
            }
            handleBackendNotification(be);
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, submitForm }) => (
          <Form>
            <DialogContent dividers>
              <TextField
                autoFocus
                fullWidth
                label="Nombre de la categoría"
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.nombre && errors.nombre)}
                helperText={touched.nombre && errors.nombre}
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
