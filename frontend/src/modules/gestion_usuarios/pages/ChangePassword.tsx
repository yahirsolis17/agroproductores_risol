import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import apiClient from '../../../global/api/apiClient';
import { motion } from 'framer-motion';
import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Box,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const ChangePassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { refreshSession, user } = useAuth();

  useEffect(() => {
    if (user && !user.must_change_password) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiar errores previos
    setNewPasswordError('');
    setConfirmPasswordError('');

    // Validación local: nueva contraseña debe tener al menos 4 caracteres
    if (newPassword.length < 4) {
      setNewPasswordError('La contraseña debe tener al menos 4 caracteres.');
      handleBackendNotification({
        success: false,
        message: 'La contraseña debe tener al menos 4 caracteres.',
        message_key: 'validation_error',
      });
      return;
    }

    // Validación local: ambas contraseñas deben coincidir
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Las contraseñas no coinciden.');
      handleBackendNotification({
        success: false,
        message: 'Las contraseñas no coinciden.',
        message_key: 'validation_error',
      });
      return;
    }

    setLoading(true);
    try {
      // Enviamos ambos campos: new_password y confirm_password
      const response = await apiClient.post('/usuarios/change-password/', {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      handleBackendNotification(response.data);
      await refreshSession();
      navigate('/dashboard');
    } catch (error: any) {
      const fieldErrors = error.response?.data?.data?.errors || {};
      if (fieldErrors.new_password) {
        setNewPasswordError(fieldErrors.new_password[0]);
      }
      if (fieldErrors.confirm_password) {
        setConfirmPasswordError(fieldErrors.confirm_password[0]);
      }
      handleBackendNotification(
        error.response?.data || {
          success: false,
          message: 'Error al cambiar la contraseña.',
          message_key: 'server_error',
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleShowNewPassword = () => setShowNewPassword((prev) => !prev);
  const toggleShowConfirmPassword = () => setShowConfirmPassword((prev) => !prev);

  return (
    <Box className="flex items-center justify-center min-h-screen bg-neutral-200 px-4">
      <Paper elevation={3} className="w-full max-w-md rounded-2xl p-8">
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <Typography variant="h4" align="center" className="text-primary-dark font-bold">
              Cambiar Contraseña
            </Typography>
            <Typography variant="body2" align="center" className="text-neutral-500 mt-1">
              Por seguridad, actualiza tu clave.
            </Typography>
          </div>

          <TextField
            fullWidth
            label="Nueva Contraseña"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            error={Boolean(newPasswordError)}
            helperText={newPasswordError}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleShowNewPassword} edge="end">
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Confirmar Contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            error={Boolean(confirmPasswordError)}
            helperText={confirmPasswordError}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleShowConfirmPassword} edge="end">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            color="primary"
            disabled={loading}
            sx={{ py: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Actualizar'}
          </Button>
        </motion.form>
      </Paper>
    </Box>
  );
};

export default ChangePassword;
