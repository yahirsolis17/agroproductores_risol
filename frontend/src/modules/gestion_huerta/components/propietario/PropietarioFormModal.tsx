import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { PropietarioCreateData } from '../../types/propietarioTypes';

interface PropietarioFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PropietarioCreateData) => Promise<void>;
  initialValues?: PropietarioCreateData;
  isEdit?: boolean;
}

const validationSchema = Yup.object().shape({
  nombre: Yup.string()
    .min(3, 'Mínimo 3 caracteres')
    .required('Campo requerido'),
  apellidos: Yup.string()
    .min(3, 'Mínimo 3 caracteres')
    .required('Campo requerido'),
  telefono: Yup.string()
    .length(10, 'Debe tener 10 dígitos')
    .required('Campo requerido'),
  direccion: Yup.string()
    .min(5, 'Mínimo 5 caracteres')
    .required('Campo requerido'),
});

const PropietarioFormModal: React.FC<PropietarioFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isEdit = false,
}) => {
  // Valores por defecto para CREAR
  const defaultValues: PropietarioCreateData = {
    nombre: '',
    apellidos: '',
    telefono: '',
    direccion: '',
  };

  const handleSubmit = async (values: PropietarioCreateData, actions: any) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error('Error al guardar propietario:', error);
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="text-primary-dark font-bold">
        {isEdit ? 'Editar Propietario' : 'Nuevo Propietario'}
      </DialogTitle>
      <Formik
        initialValues={initialValues || defaultValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, isSubmitting }) => (
          <Form>
            <DialogContent dividers className="space-y-4">
              <TextField
                fullWidth
                label="Nombre"
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                error={touched.nombre && Boolean(errors.nombre)}
                helperText={touched.nombre && errors.nombre}
              />

              <TextField
                fullWidth
                label="Apellidos"
                name="apellidos"
                value={values.apellidos}
                onChange={handleChange}
                error={touched.apellidos && Boolean(errors.apellidos)}
                helperText={touched.apellidos && errors.apellidos}
              />

              <TextField
                fullWidth
                label="Teléfono (10 dígitos)"
                name="telefono"
                value={values.telefono}
                onChange={handleChange}
                error={touched.telefono && Boolean(errors.telefono)}
                helperText={touched.telefono && errors.telefono}
              />

              <TextField
                fullWidth
                label="Dirección"
                name="direccion"
                value={values.direccion}
                onChange={handleChange}
                error={touched.direccion && Boolean(errors.direccion)}
                helperText={touched.direccion && errors.direccion}
              />
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button onClick={onClose} variant="outlined" color="secondary">
                Cancelar
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default PropietarioFormModal;
