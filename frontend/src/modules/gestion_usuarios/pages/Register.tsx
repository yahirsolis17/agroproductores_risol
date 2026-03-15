import React, { useEffect, useState } from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

import FormAlertBanner from '../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../components/common/form/FormikTextField';
import { applyBackendErrorsToFormik } from '../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../global/validation/focusFirstError';
import { useAuth } from '../context/AuthContext';
import authService, { RegisterData } from '../services/authService';

type RegisterFormValues = RegisterData & {
  confirmPassword: string;
};

const validationSchema = Yup.object({
  nombre: Yup.string()
    .matches(/^[A-Za-zÀ-ÿ\u00f1\u00d1 ]+$/, 'Solo se permiten letras y espacios.')
    .required('El nombre es obligatorio.'),
  apellido: Yup.string()
    .matches(/^[A-Za-zÀ-ÿ\u00f1\u00d1 ]+$/, 'Solo se permiten letras y espacios.')
    .required('El apellido es obligatorio.'),
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'El telefono debe tener 10 digitos.')
    .required('El telefono es obligatorio.'),
  role: Yup.string()
    .oneOf(['usuario', 'admin'], 'Selecciona un rol valido.')
    .required('El rol es obligatorio.'),
  password: Yup.string()
    .matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'Usa minimo 8 caracteres con letras y numeros.')
    .required('La contrasena es obligatoria.'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Las contrasenas no coinciden.')
    .required('Confirma la contrasena.'),
});

const initialValues: RegisterFormValues = {
  nombre: '',
  apellido: '',
  telefono: '',
  role: 'usuario',
  password: '',
  confirmPassword: '',
};

const Register: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    document.title = 'Registrar Usuario | Risol';
  }, []);

  if (user?.role !== 'admin') {
    return (
      <section className="p-6 text-center text-red-500" aria-label="Acceso denegado">
        No tienes permiso para registrar usuarios.
      </section>
    );
  }

  const handleSubmit = async (
    values: RegisterFormValues,
    helpers: FormikHelpers<RegisterFormValues>,
  ) => {
    const { confirmPassword, ...payload } = values;
    void confirmPassword;

    try {
      await authService.register(payload);
      setFormErrors([]);
      navigate('/users-admin');
    } catch (error: unknown) {
      const normalized = applyBackendErrorsToFormik(error, helpers);
      setFormErrors(normalized.formErrors);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]"
      >
        <Paper elevation={4} className="rounded-[28px] p-6 shadow-soft sm:p-8">
          <div className="mb-6">
            <Typography variant="overline" className="tracking-[0.24em] text-emerald-700">
              Alta segura
            </Typography>
            <Typography variant="h4" className="mt-1 font-bold text-primary-dark">
              Registrar usuario
            </Typography>
            <Typography variant="body2" className="mt-2 text-neutral-500">
              El alta ya exige contrasena segura y el usuario tendra que cambiarla al primer acceso.
            </Typography>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            validateOnChange={false}
            validateOnBlur
            validateOnMount={false}
            onSubmit={handleSubmit}
          >
            {({
              errors,
              handleBlur,
              handleChange,
              isSubmitting,
              setTouched,
              submitCount,
              submitForm,
              touched,
              validateForm,
              values,
            }) => (
              <Form
                noValidate
                className="space-y-4"
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormikTextField
                    fullWidth
                    name="nombre"
                    label="Nombre"
                    value={values.nombre}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormikTextField
                    fullWidth
                    name="apellido"
                    label="Apellido"
                    value={values.apellido}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormikTextField
                    fullWidth
                    name="telefono"
                    label="Telefono"
                    value={values.telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    inputProps={{ inputMode: 'numeric', maxLength: 10, pattern: '[0-9]*' }}
                  />

                  <FormControl
                    fullWidth
                    error={(touched.role || submitCount > 0) && Boolean(errors.role)}
                  >
                    <InputLabel id="role-label">Rol</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={values.role}
                      label="Rol"
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <MenuItem value="usuario">Usuario operativo</MenuItem>
                      <MenuItem value="admin">Administrador</MenuItem>
                    </Select>
                    <FormHelperText>
                      {(touched.role || submitCount > 0) && errors.role
                        ? errors.role
                        : 'Asigna administrador solo si realmente lo necesita.'}
                    </FormHelperText>
                  </FormControl>
                </div>

                <FormikTextField
                  fullWidth
                  name="password"
                  label="Contrasena inicial"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  helperText="Minimo 8 caracteres con letras y numeros."
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="large"
                          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                          onClick={() => setShowPassword((current) => !current)}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <FormikTextField
                  fullWidth
                  name="confirmPassword"
                  label="Confirmar contrasena"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="large"
                          aria-label={showConfirmPassword ? 'Ocultar confirmacion' : 'Mostrar confirmacion'}
                          onClick={() => setShowConfirmPassword((current) => !current)}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  className="py-3 font-bold"
                  startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar usuario'}
                </Button>
              </Form>
            )}
          </Formik>
        </Paper>

        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#f4fbf8_0%,#ffffff_100%)] p-6 shadow-sm"
        >
          <Typography variant="overline" className="tracking-[0.24em] text-emerald-700">
            Criterios
          </Typography>
          <Typography variant="h5" className="mt-1 font-semibold text-primary-dark">
            Alta mas segura y ordenada
          </Typography>

          <div className="mt-5 space-y-4 text-sm leading-6 text-neutral-600">
            <InfoBlock
              title="Contrasena valida"
              text="La interfaz valida el mismo criterio minimo del backend para evitar intentos fallidos innecesarios."
            />
            <InfoBlock
              title="Primer acceso controlado"
              text="El backend obliga al usuario nuevo a cambiar su contrasena al entrar por primera vez."
            />
            <InfoBlock
              title="Sin datos duplicados"
              text="Este formulario envia solo lo necesario al endpoint de usuarios y reutiliza el manejo canonico de errores."
            />
          </div>
        </motion.aside>
      </motion.div>
    </main>
  );
};

const InfoBlock: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <Box className="rounded-2xl border border-emerald-100 bg-white px-4 py-4">
    <Typography variant="subtitle2" className="font-semibold text-primary-dark">
      {title}
    </Typography>
    <Typography variant="body2" className="mt-1 text-neutral-500">
      {text}
    </Typography>
  </Box>
);

export default Register;
