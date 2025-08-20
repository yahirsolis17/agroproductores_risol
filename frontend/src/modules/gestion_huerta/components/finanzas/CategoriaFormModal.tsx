// src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Editar categoría' : 'Registrar nueva categoría'}</DialogTitle>
      <Formik
        initialValues={{ nombre: initial?.nombre ?? '' }}
        validationSchema={schema}
        enableReinitialize
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
            // err puede ser: envelope (por rejectWithValue), AxiosError, string, etc.
            let be: any = err;
            if (typeof err === 'object' && err !== null) {
              const maybe = err as { response?: { data?: any }; data?: any };
              be = maybe.response?.data ?? maybe.data ?? err;
            }

            const fieldErrors: Record<string, any> =
              be?.errors || be?.data?.errors || {};

            Object.entries(fieldErrors).forEach(([k, v]) => {
              const msg = Array.isArray(v) ? v[0] : String(v);
              helpers.setFieldError(k, msg);
            });

            // Fuerza "touched" para que MUI pinte en rojo
            if (fieldErrors?.nombre) {
              helpers.setTouched({ nombre: true }, false);
            }

            handleBackendNotification(be);
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <TextField
                autoFocus
                fullWidth
                id="nombre"
                name="nombre"
                label="Nombre de la categoría"
                value={values.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.nombre && errors.nombre)}
                helperText={touched.nombre && errors.nombre}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? (
                  <CircularProgress size={20} />
                ) : isEdit ? 'Guardar' : 'Crear'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaFormModal;
