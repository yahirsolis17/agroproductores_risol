// src/modules/gestion_usuarios/pages/UsersAdmin.tsx
import React, { useEffect, useState } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Typography, CircularProgress } from '@mui/material';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  is_active: boolean;
}

const UsersAdmin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/usuarios/users/');
      const filtered = (response.data.results || []).filter(
        (u: User) => u.id !== currentUser?.id
      );
      setUsers(filtered);
    } catch {
      setError('No se pudo obtener la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (userId: number) => {
    try {
      await apiClient.patch(`/usuarios/users/${userId}/toggle_active/`);
      fetchUsers();
    } catch {
      setError('Error al actualizar el usuario');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        Acceso denegado
      </div>
    );
  }

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h4" className="text-primary-dark font-bold mb-4">
        Administrar Usuarios
      </Typography>

      {error && (
        <div className="text-red-600 mb-2">{error}</div>
      )}

      {loading ? (
        <div className="text-center mt-10">
          <CircularProgress />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="min-w-full bg-white rounded-xl">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700 text-sm">
                <th className="px-4 py-2 border">#</th>
                <th className="px-4 py-2 border">Nombre</th>
                <th className="px-4 py-2 border">Teléfono</th>
                <th className="px-4 py-2 border">Rol</th>
                <th className="px-4 py-2 border">Activo</th>
                <th className="px-4 py-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <tr
                  key={u.id}
                  className="text-center text-sm hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-4 py-2 border">{index + 1}</td>
                  <td className="px-4 py-2 border">
                    {u.nombre} {u.apellido}
                  </td>
                  <td className="px-4 py-2 border">{u.telefono}</td>
                  <td className="px-4 py-2 border capitalize">{u.role}</td>
                  <td className="px-4 py-2 border">{u.is_active ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => toggleActive(u.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-all"
                    >
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-neutral-400">
                    No hay otros usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default UsersAdmin;
