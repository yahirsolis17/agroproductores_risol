import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

import { useAuth } from '../context/AuthContext';
import { useAppDispatch } from '../../../global/store/store';
import { changePasswordThunk } from '../../../global/store/authSlice';

const ChangePassword: React.FC = () => {
  /* ----------------- form state ----------------- */
  const [newPass, setNewPass]       = useState('');
  const [confirm, setConfirm]       = useState('');
  const [load, setLoad]             = useState(false);
  const [errNew, setErrNew]         = useState('');
  const [errConfirm, setErrConfirm] = useState('');
  const [showNew, setShowNew]       = useState(false);
  const [showConf, setShowConf]     = useState(false);

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

  /* ----------------- submit ----------------- */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrNew(''); setErrConfirm('');

    if (newPass.length < 4) {
      const msg = 'La contraseña debe tener al menos 4 caracteres.';
      setErrNew(msg);
      return;
    }
    if (newPass !== confirm) {
      const msg = 'Las contraseñas no coinciden.';
      setErrConfirm(msg);
      return;
    }

    try {
      setLoad(true);
      await dispatch(changePasswordThunk({
        new_password: newPass,
        confirm_password: confirm,
      })).unwrap();
      await refreshSession();
      navigate('/dashboard');
    } catch (err: any) {
      const be = err?.data?.errors || err?.data?.data?.errors || {};
      if (be.new_password)      setErrNew(be.new_password[0]);
      if (be.confirm_password)  setErrConfirm(be.confirm_password[0]);
    } finally { setLoad(false); }
  };

  /* ----------------- UI ----------------- */
  return (
    <Box className="flex items-center justify-center min-h-screen bg-neutral-100 px-4">
      <Paper elevation={4} className="w-full max-w-md p-8 rounded-2xl shadow-lg bg-white">
        <motion.form
          onSubmit={onSubmit}
          className="space-y-6"
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

          {/* ---- nueva ---- */}
          <TextField
            fullWidth
            label="Nueva contraseña"
            type={showNew ? 'text' : 'password'}
            value={newPass}
            onChange={e=>setNewPass(e.target.value)}
            error={Boolean(errNew)}
            helperText={errNew}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={()=>setShowNew(!showNew)} edge="end">
                    {showNew ? <VisibilityOff/> : <Visibility/>}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* ---- confirmar ---- */}
          <TextField
            fullWidth
            label="Confirmar contraseña"
            type={showConf ? 'text' : 'password'}
            value={confirm}
            onChange={e=>setConfirm(e.target.value)}
            error={Boolean(errConfirm)}
            helperText={errConfirm}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={()=>setShowConf(!showConf)} edge="end">
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
            disabled={load}
            sx={{ py:2, textTransform:'none', fontWeight:600 }}
          >
            {load ? <CircularProgress size={24} color="inherit"/> : 'Actualizar'}
          </Button>
        </motion.form>
      </Paper>
    </Box>
  );
};

export default ChangePassword;
