// ============================================================================
// src/modules/gestion_huerta/components/finanzas/CategoriaInversionFormModal.tsx
// ============================================================================
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, CircularProgress } from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';

interface Props { open: boolean; onClose: () => void; onSuccess: (nuevaCat: CategoriaInversion) => void; }

const schema = Yup.object({ nombre: Yup.string().min(3, 'Mínimo 3 caracteres').required('Requerido') });

const CategoriaInversionFormModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const { addCategoria } = useCategoriasInversion();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Registrar nueva categoría</DialogTitle>
      <Formik
        initialValues={{ nombre: '' }}
        validationSchema={schema}
        onSubmit={async (vals, helpers) => {
          try {
            const nueva: CategoriaInversion = await addCategoria({ nombre: vals.nombre });
            onSuccess(nueva);
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <TextField fullWidth label="Nombre de la categoría" name="nombre" value={values.nombre} onChange={handleChange} error={!!errors.nombre} helperText={errors.nombre} />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={20} /> : 'Crear'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaInversionFormModal;