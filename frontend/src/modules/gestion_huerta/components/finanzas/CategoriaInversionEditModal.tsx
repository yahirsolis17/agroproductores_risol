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
        validateOnChange={false}
        validateOnBlur={false}
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

            // 🔔 Notificar globalmente para refrescar mapas/listas
            window.dispatchEvent(new CustomEvent('categoria-updated', { detail: updated }));

            onSuccess(updated); // devuelve la categoría actualizada al caller
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
        {({ values, errors, handleChange, isSubmitting, submitForm }) => (
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
              <Button
                variant="contained"
                disabled={isSubmitting}
                onClick={submitForm}
              >
                {isSubmitting ? <CircularProgress size={20} /> : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaInversionEditModal;
