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
      onSubmit={async (vals, { setSubmitting }) => {
        try {
          await onSubmit(vals.nombre.trim());
        } finally {
          setSubmitting(false);
          onClose();
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
