import React from 'react';
import { Formik, Form} from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import authService, { RegisterData } from '../services/authService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Box,
  Paper,
} from '@mui/material';

const validationSchema = Yup.object({
  nombre: Yup.string().matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios').required('Nombre requerido'),
  apellido: Yup.string().matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios').required('Apellido requerido'),
  telefono: Yup.string().matches(/^\d{10}$/, 'Debe tener 10 dígitos').required('Teléfono requerido'),
  role: Yup.string().required('Rol requerido'),
});

const Register: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">No tienes permiso para registrar usuarios.</div>;
  }

  const handleSubmit = async (values: RegisterData, { setSubmitting, setErrors }: any) => {
    try {
      const res = await authService.register(values);
      handleBackendNotification(res);
      navigate('/users-admin');
    } catch (error: any) {
      const res = error?.response?.data;
      handleBackendNotification(res);
      setErrors({ telefono: ' ', nombre: ' ', apellido: ' ' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Paper elevation={4} className="p-8 rounded-2xl shadow-soft">
          <Formik
            initialValues={{ nombre: '', apellido: '', telefono: '', role: 'usuario' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, handleChange, values, touched, errors }) => (
              <Form noValidate>
                <Typography variant="h5" className="text-center text-primary-dark font-bold mb-4">
                  Registrar Usuario
                </Typography>

                <Box mb={2}>
                  <TextField
                    fullWidth
                    name="nombre"
                    label="Nombre"
                    value={values.nombre}
                    onChange={handleChange}
                    error={touched.nombre && Boolean(errors.nombre)}
                    helperText={touched.nombre && errors.nombre}
                    variant="outlined"
                  />
                </Box>

                <Box mb={2}>
                  <TextField
                    fullWidth
                    name="apellido"
                    label="Apellido"
                    value={values.apellido}
                    onChange={handleChange}
                    error={touched.apellido && Boolean(errors.apellido)}
                    helperText={touched.apellido && errors.apellido}
                    variant="outlined"
                  />
                </Box>

                <Box mb={2}>
                  <TextField
                    fullWidth
                    name="telefono"
                    label="Teléfono"
                    value={values.telefono}
                    onChange={handleChange}
                    error={touched.telefono && Boolean(errors.telefono)}
                    helperText={touched.telefono && errors.telefono}
                    variant="outlined"
                  />
                </Box>

                <Box mb={3}>
                  <FormControl fullWidth variant="outlined" error={touched.role && Boolean(errors.role)}>
                    <InputLabel id="role-label">Rol</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={values.role}
                      onChange={handleChange}
                      label="Rol"
                    >
                      <MenuItem value="usuario">Usuario</MenuItem>
                      <MenuItem value="admin">Administrador</MenuItem>
                    </Select>
                    {touched.role && <FormHelperText>{errors.role}</FormHelperText>}
                  </FormControl>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  size="large"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar'}
                </Button>
              </Form>
            )}
          </Formik>
        </Paper>
      </motion.div>
    </div>
  );
};

export default Register;
