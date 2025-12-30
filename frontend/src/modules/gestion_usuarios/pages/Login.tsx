// Importaciones de librerías y componentes necesarios
import React, { useState, useEffect } from 'react'; // React y hooks para manejo de estado y ciclo de vida
import { Formik, Form } from 'formik'; // Formik para manejo de formularios
import * as Yup from 'yup'; // Yup para validación de formularios
import { Navigate, useLocation } from 'react-router-dom'; // Navegación y obtención de ubicación actual
import { useAuth } from '../context/AuthContext'; // Contexto de autenticación personalizado
import { handleBackendNotification } from '../../../global/utils/NotificationEngine'; // Utilidad para mostrar notificaciones

// Importaciones de componentes de Material UI y otras librerías
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material'; // Iconos para mostrar/ocultar contraseña
import { motion } from 'framer-motion'; // Animaciones
import { applyBackendErrorsToFormik, isValidationError } from '../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../components/common/form/FormikTextField';

// Esquema de validación para el formulario usando Yup
const validationSchema = Yup.object({
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'Debe tener exactamente 10 dígitos') // Solo acepta 10 dígitos
    .required('Teléfono requerido'),
  password: Yup.string().required('Contraseña requerida'), // Contraseña obligatoria
});

// Constante para la duración del bloqueo tras varios intentos fallidos (5 minutos)
const BLOCK_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

// Componente principal de Login
const Login: React.FC = () => {
  // Obtención de funciones y estados del contexto de autenticación
  const { isAuthenticated, login } = useAuth();
  const location = useLocation(); // Ubicación actual para redirección

  // Estados locales para el manejo del formulario y lógica de bloqueo
  const [showPassword, setShowPassword] = useState(false); // Mostrar/ocultar contraseña
  const [isBlocked, setIsBlocked] = useState(false); // Indica si el login está bloqueado
  const [blockEndTime, setBlockEndTime] = useState<number | null>(null); // Tiempo en que termina el bloqueo
  const [timeRemaining, setTimeRemaining] = useState<string>(''); // Tiempo restante de bloqueo (formato mm:ss)
  const [failedAttempts, setFailedAttempts] = useState(0); // Contador de intentos fallidos
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // useEffect para cargar información de bloqueo e intentos fallidos desde localStorage al montar el componente
  useEffect(() => {
    const storedBlockEndTime = localStorage.getItem('loginBlockEndTime');
    const storedFailedAttempts = localStorage.getItem('loginFailedAttempts');
    
    if (storedBlockEndTime) {
      const endTime = parseInt(storedBlockEndTime);
      if (endTime > Date.now()) {
        setIsBlocked(true);
        setBlockEndTime(endTime);
      } else {
        // Si ya pasó el tiempo de bloqueo, limpiar localStorage
        localStorage.removeItem('loginBlockEndTime');
        localStorage.removeItem('loginFailedAttempts');
      }
    }

    if (storedFailedAttempts) {
      setFailedAttempts(parseInt(storedFailedAttempts));
    }
  }, []);

  // useEffect para actualizar el temporizador de bloqueo cada segundo
  useEffect(() => {
    if (blockEndTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        if (blockEndTime <= now) {
          // Si terminó el bloqueo, limpiar estados y localStorage
          setIsBlocked(false);
          setBlockEndTime(null);
          setTimeRemaining('');
          localStorage.removeItem('loginBlockEndTime');
          localStorage.removeItem('loginFailedAttempts');
          clearInterval(timer);
        } else {
          // Calcular y mostrar el tiempo restante de bloqueo
          const seconds = Math.ceil((blockEndTime - now) / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          setTimeRemaining(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(timer); // Limpiar intervalo al desmontar
    }
  }, [blockEndTime]);

  // Función que maneja el intento de login
  const handleLoginAttempt = async (values: { telefono: string; password: string }, helpers: any) => {
    if (isBlocked) return; // Si está bloqueado, no permite intentar

    try {
      await login(values.telefono, values.password); // Intenta loguear
      setFormErrors([]);
      // Si es exitoso, reinicia los intentos fallidos y limpia el bloqueo
      setFailedAttempts(0);
      localStorage.removeItem('loginFailedAttempts');
      localStorage.removeItem('loginBlockEndTime');
    } catch (error: any) {
      // Si falla, incrementa el contador de intentos fallidos
      const res = error?.response?.data;
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      localStorage.setItem('loginFailedAttempts', newFailedAttempts.toString());

      // Si supera el límite de intentos, activa el bloqueo
      if (newFailedAttempts >= 5) {
        const endTime = Date.now() + BLOCK_DURATION;
        setIsBlocked(true);
        setBlockEndTime(endTime);
        localStorage.setItem('loginBlockEndTime', endTime.toString());
      }

      // Muestra errores en el formulario y notificación
      const normalized = applyBackendErrorsToFormik(error, helpers);
      if (isValidationError(error)) {
        setFormErrors(normalized.formErrors);
      } else {
        setFormErrors([]);
        helpers.setErrors(res || { telefono: ' ', password: ' ' });
        handleBackendNotification(res);
      }
    } finally {
      helpers.setSubmitting(false); // Finaliza el estado de envío
    }
  };

  // Funciones para mostrar/ocultar la contraseña
  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  // Si el usuario ya está autenticado y no viene de un redirect, lo manda al dashboard
  if (isAuthenticated && !location.state?.fromLoginRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  // Renderizado del formulario de login
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 px-4">
      {/* Animación de entrada usando framer-motion */}
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
        {/* Contenedor principal del formulario */}
        <Paper
          elevation={4}
          className="p-10 rounded-2xl shadow-soft bg-white space-y-6"
          role="main"
          aria-label="Formulario de inicio de sesión"
        >
          {/* Encabezado */}
          <div className="text-center space-y-2">
            <Typography variant="h4" className="text-primary-dark font-bold" role="heading">
              Agroproductores Risol
            </Typography>
            <Typography variant="body2" className="text-neutral-500" role="text">
              Ingresa con tu cuenta
            </Typography>
          </div>

          {/* Alerta de bloqueo por demasiados intentos */}
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

          {/* Formulario de login usando Formik */}
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
                {/* Campo de teléfono */}
                <Box>
                  <FormikTextField
                    fullWidth
                    id="telefono"
                    name="telefono"
                    label="Teléfono"
                    type="tel"
                    value={values.telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
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
                  {/* Mensaje de error accesible para lectores de pantalla */}
                  {touched.telefono && errors.telefono && (
                    <span id="telefono-error" className="sr-only">
                      {errors.telefono}
                    </span>
                  )}
                </Box>

                {/* Campo de contraseña */}
                <Box>
                  <FormikTextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
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
                  {/* Mensaje de error accesible para lectores de pantalla */}
                  {touched.password && errors.password && (
                    <span id="password-error" className="sr-only">
                      {errors.password}
                    </span>
                  )}
                </Box>

                {/* Botón de enviar */}
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

// Exporta el componente para su uso en otras partes de la aplicación
export default Login;
