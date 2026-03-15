import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Button,
  IconButton,
  InputAdornment,
  Box,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import { useAuth } from '../context/AuthContext';
import { useAppDispatch } from '../../../global/store/store';
import { changePasswordThunk } from '../../../global/store/authSlice';
import { applyBackendErrorsToFormik } from '../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../components/common/form/FormikTextField';

const ChangePassword: React.FC = () => {
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const { user, refreshSession } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const voluntaryChange = Boolean(location.state?.voluntary);
    if (user && !user.must_change_password && !voluntaryChange) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, location, navigate]);

  const validationSchema = Yup.object({
    new_password: Yup.string()
      .min(4, 'La contrasena debe tener al menos 4 caracteres.')
      .required('La contrasena es requerida.'),
    confirm_password: Yup.string()
      .oneOf([Yup.ref('new_password')], 'Las contrasenas no coinciden.')
      .required('Confirma tu contrasena.'),
  });

  return (
    <Box className="auth-stage px-4">
      <Paper elevation={4} className="auth-card w-full max-w-md p-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <header className="space-y-2 text-center">
            <Typography variant="overline" className="tracking-[0.24em] text-sky-800">
              Seguridad
            </Typography>
            <Typography variant="h5" className="font-bold text-slate-950">
              Cambiar contrasena
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Actualiza tu clave de acceso para mantener la cuenta protegida.
            </Typography>
          </header>

          <Formik
            initialValues={{ new_password: '', confirm_password: '' }}
            validationSchema={validationSchema}
            validateOnChange={false}
            validateOnBlur
            validateOnMount={false}
            onSubmit={async (values, helpers) => {
              try {
                await dispatch(changePasswordThunk(values)).unwrap();
                setFormErrors([]);
                await refreshSession();
                navigate('/dashboard');
              } catch (err: any) {
                const normalized = applyBackendErrorsToFormik(err, helpers);
                setFormErrors(normalized.formErrors);
              } finally {
                helpers.setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, submitForm, setTouched, validateForm, values }) => (
              <Form
                className="mt-6 space-y-6"
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

                <FormikTextField
                  fullWidth
                  label="Nueva contrasena"
                  name="new_password"
                  type={showNew ? 'text' : 'password'}
                  value={values.new_password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNew((prev) => !prev)} edge="end">
                          {showNew ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <FormikTextField
                  fullWidth
                  label="Confirmar contrasena"
                  name="confirm_password"
                  type={showConf ? 'text' : 'password'}
                  value={values.confirm_password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConf((prev) => !prev)} edge="end">
                          {showConf ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  type="submit"
                  disabled={isSubmitting}
                  size="large"
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Actualizar'}
                </Button>
              </Form>
            )}
          </Formik>
        </motion.div>
      </Paper>
    </Box>
  );
};

export default ChangePassword;
