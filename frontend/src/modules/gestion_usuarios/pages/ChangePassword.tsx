// src/modules/gestion_usuarios/pages/ChangePassword.tsx
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
  /* ------------------------------ State ------------------------------ */
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ------------------------------ Auth / nav ------------------------- */
  const navigate = useNavigate();
  const { refreshSession, user } = useAuth();

  useEffect(() => {
    if (user && !user.must_change_password) navigate('/dashboard');
  }, [user, navigate]);

  /* ------------------------------ Submit ----------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setNewPasswordError('');
    setConfirmPasswordError('');

    if (newPassword.length < 4) {
      const msg = 'La contraseña debe tener al menos 4 caracteres.';
      setNewPasswordError(msg);
      handleBackendNotification({ success: false, message: msg });
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = 'Las contraseñas no coinciden.';
      setConfirmPasswordError(msg);
      handleBackendNotification({ success: false, message: msg });
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/usuarios/change-password/', {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      handleBackendNotification(res.data);
      await refreshSession();
      navigate('/dashboard');
    } catch (err: any) {
      const errs = err.response?.data?.data?.errors || {};
      if (errs.new_password) setNewPasswordError(errs.new_password[0]);
      if (errs.confirm_password) setConfirmPasswordError(errs.confirm_password[0]);
      handleBackendNotification(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ Render ----------------------------- */
  return (
    <Box className="flex items-center justify-center min-h-screen bg-neutral-200 px-4">
      <Paper elevation={3} className="w-full max-w-md rounded-2xl p-8">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <header>
            <Typography variant="h4" align="center" className="text-primary-dark font-bold">
              Cambiar Contraseña
            </Typography>
            <Typography variant="body2" align="center" className="text-neutral-500 mt-1">
              Por seguridad, actualiza tu clave.
            </Typography>
          </header>

          {/* Nueva */}
          <TextField
            fullWidth
            label="Nueva Contraseña"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={Boolean(newPasswordError)}
            helperText={newPasswordError}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNew(!showNew)} edge="end">
                    {showNew ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Confirmar */}
          <TextField
            fullWidth
            label="Confirmar Contraseña"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={Boolean(confirmPasswordError)}
            helperText={confirmPasswordError}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end">
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            fullWidth
            type="submit"
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
