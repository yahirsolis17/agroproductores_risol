// src/modules/gestion_usuarios/pages/Register.tsx
import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import authService, { RegisterData } from '../services/authService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import { applyBackendErrorsToFormik, isValidationError } from '../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../global/validation/focusFirstError';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
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
import FormAlertBanner from '../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../components/common/form/FormikTextField';

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
  const [formErrors, setFormErrors] = useState<string[]>([]);

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
        initial={{ opacity: 0, scale: 0.1 }}
        animate={{ opacity: 1, scale: 1 }}
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
            validateOnChange={false}
            validateOnBlur
            validateOnMount={false}
            onSubmit={async (
              values: RegisterData,
              helpers,
            ) => {
              try {
                const res = await authService.register(values);
                setFormErrors([]);
                handleBackendNotification(res);
                navigate('/users-admin');
              } catch (error: any) {
                const normalized = applyBackendErrorsToFormik(error, helpers);
                if (isValidationError(error)) {
                  setFormErrors(normalized.formErrors);
                } else {
                  setFormErrors([]);
                  handleBackendNotification(error.response?.data);
                }
              } finally {
                helpers.setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, handleChange, handleBlur, touched, errors, values, setTouched, validateForm, submitForm, submitCount }) => (
              <Form
                noValidate
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const validationErrors = await validateForm();
                  if (Object.keys(validationErrors).length) {
                    const touchedFields = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                      (acc, key) => ({ ...acc, [key]: true }),
                      {}
                    );
                    setTouched(touchedFields, false);
                    focusFirstError(validationErrors, event.currentTarget);
                    return;
                  }
                  submitForm();
                }}
              >
                <FormAlertBanner
                  open={formErrors.length > 0}
                  severity="error"
                  title="Revisa la información"
                  messages={formErrors}
                />
                <Box>
                  <FormikTextField
                    fullWidth
                    name="nombre"
                    label="Nombre"
                    value={values.nombre}
                    onChange={handleChange}
                  />
                </Box>

                <Box>
                  <FormikTextField
                    fullWidth
                    name="apellido"
                    label="Apellido"
                    value={values.apellido}
                    onChange={handleChange}
                  />
                </Box>

                <Box>
                  <FormikTextField
                    fullWidth
                    name="telefono"
                    label="Teléfono"
                    value={values.telefono}
                    onChange={handleChange}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </Box>

                <Box>
                  <FormControl
                    fullWidth
                    error={(touched.role || submitCount > 0) && Boolean(errors.role)}
                  >
                    <InputLabel id="role-label">Rol</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={values.role}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Rol"
                    >
                      <MenuItem value="usuario">Usuario</MenuItem>
                    </Select>
                    {(touched.role || submitCount > 0) && (
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
