import React, { useEffect, useState } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Typography,
  CircularProgress,
  Pagination,
  Box,
  Paper,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { MdSettings } from 'react-icons/md';
import PermissionsDialog from './PermissionsDialog';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  is_active: boolean;
  permisos: string[]; // vendrá del backend
}

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

const UsersAdmin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ count: 0, next: null, previous: null });
  const [error, setError] = useState('');
  const [page, setPage] = useState(() => Number(localStorage.getItem('usersPage')) || 1);
  const [delayedLoading, setDelayedLoading] = useState(false);
  const pageSize = 10;

  // Estados para el dialog de permisos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selUserId, setSelUserId] = useState<number>(0);
  const [selUserPerms, setSelUserPerms] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser?.role === 'admin') fetchUsers(page);
  }, [currentUser, page]);

  const fetchUsers = async (pageNumber: number) => {
    const timer = setTimeout(() => setDelayedLoading(true), 400);
    try {
      setDelayedLoading(false);
      const res = await apiClient.get(`/usuarios/users/?page=${pageNumber}`);
      const results: any[] = res.data.results || [];
      // Mapeamos y excluimos al admin actual
      const mapped: User[] = results
        .filter(u => u.id !== currentUser?.id)
        .map(u => ({
          id: u.id,
          nombre: u.nombre,
          apellido: u.apellido,
          telefono: u.telefono,
          role: u.role,
          is_active: u.is_active,
          permisos: u.permisos || [], 
        }));
      setUsers(mapped);
      setMeta({ count: res.data.count, next: res.data.next, previous: res.data.previous });
      localStorage.setItem('usersPage', String(pageNumber));
    } catch {
      setError('No se pudo obtener la lista de usuarios');
    } finally {
      clearTimeout(timer);
      setDelayedLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(meta.count / pageSize));
  const handlePageChange = (_: any, newPage: number) => setPage(newPage);

  const toggleActive = async (userId: number) => {
    try {
      await apiClient.patch(`/usuarios/users/${userId}/toggle_active/`);
      fetchUsers(page);
    } catch {
      setError('Error al actualizar el usuario');
    }
  };

  const openDialog = (u: User) => {
    setSelUserId(u.id);
    setSelUserPerms(u.permisos);
    setDialogOpen(true);
  };

  if (currentUser?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  return (
    <>
      <motion.div
        className="p-6 max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
          <Typography variant="h4" className="text-primary-dark font-bold mb-4">
            Administrar Usuarios
          </Typography>

          {error && <div className="text-red-600 mb-2">{error}</div>}

          {delayedLoading ? (
            <Box display="flex" justifyContent="center" mt={6}>
              <CircularProgress />
            </Box>
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
                  {users.length > 0 ? (
                    users.map((u, i) => (
                      <tr key={u.id} className="text-center text-sm hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-2 border">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-4 py-2 border">{u.nombre} {u.apellido}</td>
                        <td className="px-4 py-2 border">{u.telefono}</td>
                        <td className="px-4 py-2 border capitalize">{u.role}</td>
                        <td className="px-4 py-2 border">{u.is_active ? 'Sí' : 'No'}</td>
                        <td className="px-4 py-2 border space-x-2">
                          <Button
                            onClick={() => toggleActive(u.id)}
                            variant="contained"
                            color={u.is_active ? 'warning' : 'success'}
                            size="small"
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Tooltip title="Editar permisos">
                            <IconButton
                              size="small"
                              onClick={() => openDialog(u)}
                            >
                              <MdSettings />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-neutral-400">
                        No hay otros usuarios registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  variant="outlined"
                  shape="rounded"
                  color="primary"
                />
              </Box>
            </div>
          )}
        </Paper>
      </motion.div>

      {/* Dialog de permisos */}
      <PermissionsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={selUserId}
        currentPerms={selUserPerms}
      />
    </>
  );
};

export default UsersAdmin;
