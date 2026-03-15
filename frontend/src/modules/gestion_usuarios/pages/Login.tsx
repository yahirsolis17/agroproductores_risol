import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { m } from 'framer-motion';
import { applyBackendErrorsToFormik } from '../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../components/common/form/FormikTextField';

const validationSchema = Yup.object({
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'Debe tener exactamente 10 digitos')
    .required('Telefono requerido'),
  password: Yup.string().required('Contrasena requerida'),
});

const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleLoginAttempt = async (
    values: { telefono: string; password: string },
    helpers: any,
  ) => {
    try {
      await login(values.telefono, values.password);
      setFormErrors([]);
    } catch (error: unknown) {
      const normalized = applyBackendErrorsToFormik(error, helpers);
      setFormErrors(normalized.formErrors);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword((prev) => !prev);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  if (isAuthenticated && !location.state?.fromLoginRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-stage px-4">
      <m.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], reducedMotion: 'user' }}
        className="w-full max-w-md"
      >
        <Paper
          elevation={4}
          className="auth-card space-y-6 p-10"
          role="main"
          aria-label="Formulario de inicio de sesion"
        >
          <div className="text-center space-y-2">
            <Typography variant="overline" className="tracking-[0.24em] text-sky-800">
              Acceso seguro
            </Typography>
            <Typography variant="h4" className="font-bold text-slate-950" role="heading">
              Agroproductores Risol
            </Typography>
            <Typography variant="body2" className="text-slate-500" role="text">
              Ingresa con tu cuenta para continuar al centro operativo.
            </Typography>
          </div>

          <Formik
            initialValues={{ telefono: '', password: '' }}
            validationSchema={validationSchema}
            validateOnChange={false}
            validateOnBlur
            validateOnMount={false}
            onSubmit={handleLoginAttempt}
          >
            {({
              isSubmitting,
              handleChange,
              handleBlur,
              values,
              errors,
              touched,
              setTouched,
              validateForm,
              submitForm,
            }) => (
              <Form
                className="space-y-6"
                noValidate
                onSubmit={async (event) => {
                  event.preventDefault();
                  const validationErrors = await validateForm();
                  if (Object.keys(validationErrors).length) {
                    const touchedFields = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                      (acc, key) => ({ ...acc, [key]: true }),
                      {},
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
                  title="Revisa la informacion"
                  messages={formErrors}
                />

                <Box>
                  <FormikTextField
                    fullWidth
                    id="telefono"
                    name="telefono"
                    label="Telefono"
                    type="tel"
                    value={values.telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-label="Numero de telefono"
                    aria-required="true"
                    aria-invalid={touched.telefono && Boolean(errors.telefono)}
                    aria-describedby={errors.telefono ? 'telefono-error' : undefined}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      maxLength: 10,
                    }}
                  />
                  {touched.telefono && errors.telefono && (
                    <span id="telefono-error" className="sr-only">
                      {errors.telefono}
                    </span>
                  )}
                </Box>

                <Box>
                  <FormikTextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Contrasena"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-label="Contrasena"
                    aria-required="true"
                    aria-invalid={touched.password && Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            size="large"
                            className="text-slate-500 hover:text-slate-900"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {touched.password && errors.password && (
                    <span id="password-error" className="sr-only">
                      {errors.password}
                    </span>
                  )}
                </Box>

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  className="py-3 font-bold"
                  aria-label="Iniciar sesion"
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" aria-label="Cargando..." />
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        </Paper>
      </m.div>
    </div>
  );
};

export default Login;
