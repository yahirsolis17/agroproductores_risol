// src/modules/gestion_usuarios/pages/Register.tsx
import React, { useEffect } from 'react';
import { Formik, Form } from 'formik';
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
  CircularProgress,
} from '@mui/material';

const validationSchema = Yup.object({
  nombre: Yup.string()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios')
    .required('Nombre requerido'),
  apellido: Yup.string()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios')
    .required('Apellido requerido'),
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'Debe tener 10 dígitos')
    .required('Teléfono requerido'),
  role: Yup.string()
    .oneOf(['usuario', 'admin'], 'Rol inválido')
    .required('Rol requerido'),
});

const Register: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* SEO / meta */
  useEffect(() => {
    document.title = 'Registrar Usuario | Risol';
    if (!document.querySelector("meta[name='description']")) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content =
        'Formulario para registrar nuevos usuarios en el sistema Risol.';
      document.head.appendChild(meta);
    }
  }, []);

  /* Guard — solo admin */
  if (user?.role !== 'admin') {
    return (
      <section
        className="p-6 text-center text-red-500"
        aria-label="Acceso denegado"
      >
        No tienes permiso para registrar usuarios.
      </section>
    );
  }

  /* ------------------------------------------------- */
  /*                    RENDER                         */
  /* ------------------------------------------------- */
  return (
    <main className="flex items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Paper
          elevation={4}
          className="p-8 rounded-2xl shadow-soft"
          role="form"
          aria-labelledby="register-heading"
        >
          <Typography
            id="register-heading"
            variant="h5"
            className="text-center text-primary-dark font-bold mb-4"
          >
            Registrar Usuario
          </Typography>

          <Formik
            initialValues={{
              nombre: '',
              apellido: '',
              telefono: '',
              role: 'usuario',
            }}
            validationSchema={validationSchema}
            onSubmit={async (
              values: RegisterData,
              { setSubmitting, setErrors },
            ) => {
              try {
                const res = await authService.register(values);
                handleBackendNotification(res);
                navigate('/users-admin');
              } catch (error: any) {
                const backendErrors =
                  error.response?.data?.data?.errors || {};
                setErrors(
                  Object.fromEntries(
                    Object.entries(backendErrors).map(
                      ([field, msgs]: any) => [field, msgs[0]],
                    ),
                  ),
                );
                handleBackendNotification(error.response?.data);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, handleChange, touched, errors, values }) => (
              <Form noValidate className="space-y-4">
                <Box>
                  <TextField
                    fullWidth
                    name="nombre"
                    label="Nombre"
                    value={values.nombre}
                    onChange={handleChange}
                    error={touched.nombre && Boolean(errors.nombre)}
                    helperText={touched.nombre && errors.nombre}
                  />
                </Box>

                <Box>
                  <TextField
                    fullWidth
                    name="apellido"
                    label="Apellido"
                    value={values.apellido}
                    onChange={handleChange}
                    error={touched.apellido && Boolean(errors.apellido)}
                    helperText={touched.apellido && errors.apellido}
                  />
                </Box>

                <Box>
                  <TextField
                    fullWidth
                    name="telefono"
                    label="Teléfono"
                    value={values.telefono}
                    onChange={handleChange}
                    error={touched.telefono && Boolean(errors.telefono)}
                    helperText={touched.telefono && errors.telefono}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </Box>

                <Box>
                  <FormControl
                    fullWidth
                    error={touched.role && Boolean(errors.role)}
                  >
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
                    {touched.role && (
                      <FormHelperText>{errors.role}</FormHelperText>
                    )}
                  </FormControl>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isSubmitting}
                  size="large"
                  className="py-3 font-bold"
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : null
                  }
                >
                  {isSubmitting ? 'Registrando…' : 'Registrar'}
                </Button>
              </Form>
            )}
          </Formik>
        </Paper>
      </motion.div>
    </main>
  );
};

export default Register;
