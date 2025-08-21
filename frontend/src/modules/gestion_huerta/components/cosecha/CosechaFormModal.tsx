// src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Cosecha } from '../../types/cosechaTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Props {
  open: boolean;
  onClose: () => void;
  cosecha?: Cosecha | null;
  onSubmit: (nombre: string) => Promise<void>;
}

const schema = Yup.object({
  nombre: Yup.string().min(3, 'Mínimo 3 caracteres').required('Requerido'),
});

const CosechaFormModal: React.FC<Props> = ({ open, onClose, cosecha, onSubmit }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Renombrar cosecha</DialogTitle>
      <Formik
        initialValues={{ nombre: cosecha?.nombre || '' }}
        validationSchema={schema}
        onSubmit={async (vals, { setSubmitting, setErrors }) => {
          try {
            await onSubmit(vals.nombre.trim()); // ← si esto lanza, NO cerramos
            onClose();                          // ← cerrar SOLO en éxito
          } catch (err: any) {
            const be = err?.response?.data || err?.data || {};
            const beErrors = be?.errors || be?.data?.errors || {};
            if (typeof beErrors?.nombre === 'string') {
              setErrors({ nombre: beErrors.nombre });
            }
            // opcional: manejar non_field_errors
          } finally {
            setSubmitting(false);
          }
        }}
        enableReinitialize
      >
      {({ values, errors, handleChange, isSubmitting }) => (
        <Form>
          <DialogContent dividers>
            <TextField
              autoFocus
              fullWidth
              label="Nombre"
              name="nombre"
              value={values.nombre}
              onChange={handleChange}
              error={Boolean(errors.nombre)}
              helperText={errors.nombre}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <PermissionButton
              perm="change_cosecha"
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar'}
            </PermissionButton>
          </DialogActions>
        </Form>
      )}
    </Formik>
  </Dialog>
);

export default CosechaFormModal;
