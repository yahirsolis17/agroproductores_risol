// src/modules/gestion_usuarios/components/Login.tsx
import React, { useState, useEffect } from 'react';
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
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { motion } from 'framer-motion';

const validationSchema = Yup.object({
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'Debe tener exactamente 10 dígitos')
    .required('Teléfono requerido'),
  password: Yup.string().required('Contraseña requerida'),
});

const BLOCK_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockEndTime, setBlockEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    const storedBlockEndTime = localStorage.getItem('loginBlockEndTime');
    const storedFailedAttempts = localStorage.getItem('loginFailedAttempts');
    
    if (storedBlockEndTime) {
      const endTime = parseInt(storedBlockEndTime);
      if (endTime > Date.now()) {
        setIsBlocked(true);
        setBlockEndTime(endTime);
      } else {
        localStorage.removeItem('loginBlockEndTime');
        localStorage.removeItem('loginFailedAttempts');
      }
    }

    if (storedFailedAttempts) {
      setFailedAttempts(parseInt(storedFailedAttempts));
    }
  }, []);

  useEffect(() => {
    if (blockEndTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        if (blockEndTime <= now) {
          setIsBlocked(false);
          setBlockEndTime(null);
          setTimeRemaining('');
          localStorage.removeItem('loginBlockEndTime');
          localStorage.removeItem('loginFailedAttempts');
          clearInterval(timer);
        } else {
          const seconds = Math.ceil((blockEndTime - now) / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          setTimeRemaining(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [blockEndTime]);

  const handleLoginAttempt = async (values: { telefono: string; password: string }, { setSubmitting, setErrors }: any) => {
    if (isBlocked) return;

    try {
      await login(values.telefono, values.password);
      // Resetear intentos fallidos después de un login exitoso
      setFailedAttempts(0);
      localStorage.removeItem('loginFailedAttempts');
      localStorage.removeItem('loginBlockEndTime');
    } catch (error: any) {
      const res = error?.response?.data;
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      localStorage.setItem('loginFailedAttempts', newFailedAttempts.toString());

      if (newFailedAttempts >= 5) {
        const endTime = Date.now() + BLOCK_DURATION;
        setIsBlocked(true);
        setBlockEndTime(endTime);
        localStorage.setItem('loginBlockEndTime', endTime.toString());
      }

      setErrors(res || { telefono: ' ', password: ' ' });
      handleBackendNotification(res);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  if (isAuthenticated && !location.state?.fromLoginRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.4, 0, 0.2, 1],
          reducedMotion: "user"
        }}
        className="w-full max-w-md"
      >
        <Paper
          elevation={4}
          className="p-10 rounded-2xl shadow-soft bg-white space-y-6"
          role="main"
          aria-label="Formulario de inicio de sesión"
        >
          <div className="text-center space-y-2">
            <Typography variant="h4" className="text-primary-dark font-bold" role="heading">
              Agroproductores Risol
            </Typography>
            <Typography variant="body2" className="text-neutral-500" role="text">
              Ingresa con tu cuenta
            </Typography>
          </div>

          {isBlocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Alert 
                severity="error"
                role="alert"
                aria-live="polite"
              >
                Demasiados intentos fallidos. Por favor, espera {timeRemaining} antes de intentar nuevamente.
              </Alert>
            </motion.div>
          )}

          <Formik
            initialValues={{ telefono: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={handleLoginAttempt}
          >
            {({
              isSubmitting,
              handleChange,
              handleBlur,
              values,
              errors,
              touched,
            }) => (
              <Form className="space-y-6" noValidate>
                <Box>
                  <TextField
                    fullWidth
                    id="telefono"
                    name="telefono"
                    label="Teléfono"
                    type="tel"
                    value={values.telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.telefono && Boolean(errors.telefono)}
                    helperText={touched.telefono && errors.telefono}
                    disabled={isBlocked}
                    aria-label="Número de teléfono"
                    aria-required="true"
                    aria-invalid={touched.telefono && Boolean(errors.telefono)}
                    aria-describedby={errors.telefono ? "telefono-error" : undefined}
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
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    disabled={isBlocked}
                    aria-label="Contraseña"
                    aria-required="true"
                    aria-invalid={touched.password && Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            size="large"
                            className="text-neutral-500 hover:text-primary-dark"
                            disabled={isBlocked}
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
                  disabled={isSubmitting || isBlocked}
                  className="py-3 font-bold"
                  aria-label={isBlocked ? "Inicio de sesión bloqueado" : "Iniciar sesión"}
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
      </motion.div>
    </div>
  );
};

export default Login;