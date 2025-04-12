// src/modules/gestion_usuarios/pages/UsersAdmin.tsx
import React, { useEffect, useState } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext'; // <- CORREGIDO

interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  is_active: boolean;
}

const UsersAdmin: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users/');
      setUsers(response.data);
    } catch {
      setError('No se pudo obtener la lista de usuarios');
    }
  };

  const toggleActive = async (userId: number) => {
    try {
      await apiClient.patch(`/users/${userId}/toggle_active/`);
      fetchUsers();
    } catch {
      setError('Error al actualizar el usuario');
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administrar Usuarios</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="px-4 py-2 border">ID</th>
            <th className="px-4 py-2 border">Nombre</th>
            <th className="px-4 py-2 border">Teléfono</th>
            <th className="px-4 py-2 border">Rol</th>
            <th className="px-4 py-2 border">Activo</th>
            <th className="px-4 py-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="text-center hover:bg-gray-100 transition-colors">
              <td className="px-4 py-2 border">{u.id}</td>
              <td className="px-4 py-2 border">{u.nombre} {u.apellido}</td>
              <td className="px-4 py-2 border">{u.telefono}</td>
              <td className="px-4 py-2 border">{u.role}</td>
              <td className="px-4 py-2 border">{u.is_active ? 'Sí' : 'No'}</td>
              <td className="px-4 py-2 border">
                <button
                  className="bg-blue-500 text-white px-2 py-1 mr-2 rounded hover:bg-blue-600"
                  onClick={() => toggleActive(u.id)}
                >
                  {u.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersAdmin;
