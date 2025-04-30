// src/modules/gestion_usuarios/pages/UsersAdmin.tsx
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import PermissionsDialog from './PermissionsDialog';
import UserActionsMenu from '../components/UserActionsMenu';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  is_active: boolean;
  permisos: string[];
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

  // Permisos dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selUserId, setSelUserId] = useState<number>(0);
  const [selUserPerms, setSelUserPerms] = useState<string[]>([]);

  // Confirm delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUserId, setConfirmUserId] = useState<number>(0);

  useEffect(() => {
    if (currentUser?.role === 'admin') fetchUsers(page);
  }, [currentUser, page]);

  const fetchUsers = async (pageNumber: number) => {
    const timer = setTimeout(() => setDelayedLoading(true), 400);
    try {
      setDelayedLoading(false);
      const res = await apiClient.get(`/usuarios/users/?page=${pageNumber}`);
      const results: any[] = res.data.results || [];
      setUsers(
        results
          .filter(u => u.id !== currentUser?.id)
          .map(u => ({
            id: u.id,
            nombre: u.nombre,
            apellido: u.apellido,
            telefono: u.telefono,
            role: u.role,
            is_active: u.is_active,
            permisos: u.permisos || [],
          }))
      );
      setMeta({ count: res.data.count, next: res.data.next, previous: res.data.previous });
      localStorage.setItem('usersPage', String(pageNumber));
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      setError('No se pudo obtener usuarios');
    } finally {
      clearTimeout(timer);
      setDelayedLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(meta.count / pageSize));
  const handlePageChange = (_: any, newPage: number) => setPage(newPage);

  const handleToggleActive = async (userId: number) => {
    try {
      const res = await apiClient.patch(`/usuarios/users/${userId}/toggle_active/`);
      handleBackendNotification(res.data);
      fetchUsers(page);
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    }
  };

  const handleArchiveUser = async (userId: number) => {
    try {
      const res = await apiClient.patch(`/usuarios/users/${userId}/archive/`);
      handleBackendNotification(res.data);
      fetchUsers(page);
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const res = await apiClient.delete(`/usuarios/users/${userId}/`);
      handleBackendNotification(res.data);
      fetchUsers(page);
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    }
  };

  const handleManagePermissions = (userId: number, permisos: string[]) => {
    setSelUserId(userId);
    setSelUserPerms(permisos);
    setDialogOpen(true);
  };

  const openConfirm = (userId: number) => {
    setConfirmUserId(userId);
    setConfirmOpen(true);
  };

  if (currentUser?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  return (
    <>
      <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
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
                        <td className="px-4 py-2 border">
                          <UserActionsMenu
                            onDeactivate={() => handleToggleActive(u.id)}
                            onArchive={() => handleArchiveUser(u.id)}
                            onDelete={() => openConfirm(u.id)}
                            onManagePermissions={() => handleManagePermissions(u.id, u.permisos)}
                          />
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

      {/* Modal de confirmación de eliminación */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que deseas eliminar este usuario?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            color="error"
            onClick={() => {
              handleDeleteUser(confirmUserId);
              setConfirmOpen(false);
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UsersAdmin;
