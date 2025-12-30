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
import { applyBackendErrorsToFormik, isValidationError } from '../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../global/validation/focusFirstError';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import FormAlertBanner from '../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../components/common/form/FormikTextField';

const ChangePassword: React.FC = () => {
  const [showNew, setShowNew]       = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  /* ----------------- auth / nav ----------------- */
  const { user, refreshSession } = useAuth();
  const dispatch = useAppDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();      // 👈 para saber si es voluntario

  /* --- redirección sólo en cambio *forzado* desde login --- */
  useEffect(() => {
    const cambioVoluntario = Boolean(location.state?.voluntary);
    if (user && !user.must_change_password && !cambioVoluntario) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, location, navigate]);

  const validationSchema = Yup.object({
    new_password: Yup.string()
      .min(4, 'La contraseña debe tener al menos 4 caracteres.')
      .required('La contraseña es requerida.'),
    confirm_password: Yup.string()
      .oneOf([Yup.ref('new_password')], 'Las contraseñas no coinciden.')
      .required('Confirma tu contraseña.'),
  });

  /* ----------------- UI ----------------- */
  return (
    <Box className="flex items-center justify-center min-h-screen bg-neutral-100 px-4">
      <Paper elevation={4} className="w-full max-w-md p-8 rounded-2xl shadow-lg bg-white">
        <motion.div
          initial={{ opacity:0, y:30 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:.5 }}
        >
          <header className="space-y-1">
            <Typography variant="h5" align="center" className="font-bold text-primary-dark">
              Cambiar contraseña
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary">
              Ingresa tu nueva clave de acceso
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
                if (isValidationError(err)) {
                  setFormErrors(normalized.formErrors);
                } else {
                  setFormErrors([]);
                  const backend = (err as any)?.data || (err as any)?.response?.data || {};
                  handleBackendNotification(backend);
                }
              } finally {
                helpers.setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, submitForm, setTouched, validateForm, values }) => (
              <Form
                className="space-y-6"
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
                {/* ---- nueva ---- */}
                <FormikTextField
                  fullWidth
                  label="Nueva contraseña"
                  name="new_password"
                  type={showNew ? 'text' : 'password'}
                  value={values.new_password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNew(!showNew)} edge="end">
                          {showNew ? <VisibilityOff/> : <Visibility/>}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* ---- confirmar ---- */}
                <FormikTextField
                  fullWidth
                  label="Confirmar contraseña"
                  name="confirm_password"
                  type={showConf ? 'text' : 'password'}
                  value={values.confirm_password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConf(!showConf)} edge="end">
                          {showConf ? <VisibilityOff/> : <Visibility/>}
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
                  sx={{ py:2, textTransform:'none', fontWeight:600 }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit"/> : 'Actualizar'}
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
