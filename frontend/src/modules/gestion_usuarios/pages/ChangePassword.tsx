// src/modules/gestion_usuarios/pages/ChangePassword.tsx
import React, { useEffect, useState } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Cambiar Contraseña</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          required
          className="w-full p-2 border rounded mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition-colors"
        >
          {loading ? 'Cambiando...' : 'Actualizar'}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
