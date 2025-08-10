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
  initial?: CategoriaInversion;
  onClose: () => void;
  onSuccess: () => void; // el caller refresca lista/selección
}

const schema = Yup.object({
  nombre: Yup.string().trim().min(3, 'Mínimo 3 caracteres').required('Requerido'),
});

const CategoriaInversionEditModal: React.FC<Props> = ({ open, initial, onClose, onSuccess }) => {
  const { editCategoria } = useCategoriasInversion();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Editar categoría</DialogTitle>
      <Formik
        initialValues={{ nombre: initial?.nombre ?? '' }}
        enableReinitialize
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur={false}
        onSubmit={async (vals, helpers) => {
          if (!initial) return;
          try {
            await editCategoria(initial.id, { nombre: vals.nombre.trim() });
            onSuccess();
          } catch (err: any) {
            const be = err?.response?.data || err?.data || {};
            const fieldErrors = be?.errors || be?.data?.errors || {};
            Object.entries(fieldErrors).forEach(([k, v]: any) => {
              helpers.setFieldError(k, Array.isArray(v) ? v[0] : String(v));
            });
            handleBackendNotification(be);
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <TextField
                autoFocus
                fullWidth
                label="Nombre de la categoría"
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                error={!!errors.nombre}
                helperText={errors.nombre}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={20} /> : 'Guardar cambios'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaInversionEditModal;
