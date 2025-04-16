import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';

const validationSchema = Yup.object({
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'Debe tener exactamente 10 dígitos')
    .required('Teléfono requerido'),
  password: Yup.string().required('Contraseña requerida'),
});

const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();

  if (isAuthenticated && !location.state?.fromLoginRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Paper
          elevation={4}
          className="p-10 rounded-2xl shadow-soft bg-white space-y-6"
        >
          <div className="text-center space-y-2">
            <Typography variant="h4" className="text-primary-dark font-bold">
              Agroproductores Risol
            </Typography>
            <Typography variant="body2" className="text-neutral-500">
              Ingresa con tu cuenta
            </Typography>
          </div>

          <Formik
            initialValues={{ telefono: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting, setErrors }) => {
              try {
                // El login debería lanzarse y, en caso de error, se rechace la promesa.
                await login(values.telefono, values.password);
              } catch (error: any) {
                const res = error?.response?.data;
                // Si el backend devuelve un objeto de validación con claves correspondientes
                if (res) {
                  setErrors(res);
                } else {
                  setErrors({ telefono: ' ', password: ' ' });
                }
                handleBackendNotification(res);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({
              isSubmitting,
              handleChange,
              handleBlur,
              values,
              errors,
              touched,
            }) => (
              <Form className="space-y-6">
                <Box>
                  <TextField
                    fullWidth
                    id="telefono"
                    name="telefono"
                    label="Teléfono"
                    variant="outlined"
                    value={values.telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.telefono && Boolean(errors.telefono)}
                    helperText={touched.telefono && errors.telefono}
                  />
                </Box>

                <Box>
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Contraseña"
                    type="password"
                    variant="outlined"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                  />
                </Box>

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={isSubmitting}
                  className="py-3 font-bold"
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        </Paper>
      </motion.div>
    </div>
  );
};

export default Login;
