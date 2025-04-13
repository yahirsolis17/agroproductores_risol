import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import apiClient from '../../../global/api/apiClient';
import { motion } from 'framer-motion';

const ChangePassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshSession, user } = useAuth();

  useEffect(() => {
    if (user && !user.must_change_password) {
      navigate('/dashboard');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 4) {
      handleBackendNotification({
        success: false,
        message: 'La contraseña debe tener al menos 4 caracteres.',
        message_key: 'validation_error',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/usuarios/change-password/', {
        new_password: password,
      });

      handleBackendNotification(response.data);
      await refreshSession();
      navigate('/dashboard');
    } catch (error: any) {
      handleBackendNotification(error.response?.data || {
        success: false,
        message: 'Error al cambiar la contraseña.',
        message_key: 'server_error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-200 px-4">
      <motion.form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-soft w-full max-w-md space-y-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h2 className="text-2xl font-bold text-center text-primary-dark">Cambiar Contraseña</h2>
          <p className="text-sm text-center text-neutral-500 mt-1">Por seguridad, actualiza tu clave.</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          required
          className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-light transition-all"
        >
          {loading ? 'Cambiando...' : 'Actualizar'}
        </button>
      </motion.form>
    </div>
  );
};

export default ChangePassword;
