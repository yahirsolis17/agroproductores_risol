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
  initial?: CategoriaInversion;  // ← NUEVO: si viene, editamos
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

            // 🔔 Notificar globalmente para refrescar mapas/listas sin recargar página
            window.dispatchEvent(
              new CustomEvent(isEdit ? 'categoria-updated' : 'categoria-created', { detail: cat })
            );

            onSuccess(cat);
            onClose();
          } catch (err: unknown) {
            const be = err?.response?.data || err?.data || {};
            const fieldErrors = be?.errors || be?.data?.errors || {};
            Object.entries(fieldErrors).forEach(([k, v]: [string, unknown]) => {
              helpers.setFieldError(k, Array.isArray(v) ? v[0] : String(v));
            });
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
                label="Nombre de la categoría"
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.nombre && Boolean(errors.nombre)}
                helperText={touched.nombre && errors.nombre}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isEdit ? (isSubmitting ? <CircularProgress size={20} /> : 'Guardar') : (isSubmitting ? <CircularProgress size={20} /> : 'Crear')}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaFormModal;
