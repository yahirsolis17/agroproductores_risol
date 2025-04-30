// src/modules/gestion_usuarios/pages/UsersAdmin.tsx
import React, { useEffect, useState, Fragment } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Typography,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Tabs,
  Tab,
  Skeleton,
} from '@mui/material';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import PermissionsDialog from './PermissionsDialog';
import UserActionsMenu from '../components/UserActionsMenu';

/* tabla unificada */
import { TableLayout, Column } from '../../../components/common/TableLayout';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  archivado_en: string | null;
  permisos: string[];
}

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

type ViewFilter = 'activos' | 'archivados' | 'todos';
const pageSize = 10;

/* ---------- columnas de la tabla ---------- */
const columns: Column<User>[] = [
  {
    label: 'Nombre',
    key: 'nombre',
    render: (u) => `${u.nombre} ${u.apellido}`,
  },
  { label: 'Teléfono', key: 'telefono' },
  {
    label: 'Rol',
    key: 'role',
    render: (u) => <span className="capitalize">{u.role}</span>,
    align: 'center',
  },
  {
    label: 'Estado',
    key: 'archivado_en',
    align: 'center',
    render: (u) =>
      u.archivado_en ? (
        <Chip label="Archivado" size="small" color="warning" />
      ) : (
        <Chip label="Activo" size="small" color="success" />
      ),
  },
];

const UsersAdmin: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    count: 0,
    next: null,
    previous: null,
  });
  const [error, setError] = useState('');
  const [page, setPage] = useState<number>(
    () => Number(localStorage.getItem('usersPage')) || 1,
  );
  const [delayedLoading, setDelayedLoading] = useState(false);
  const [filter, setFilter] = useState<ViewFilter>('activos');

  /* diálogo de permisos */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selUserId, setSelUserId] = useState<number>(0);
  const [selUserPerms, setSelUserPerms] = useState<string[]>([]);

  /* confirm delete */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUserId, setConfirmUserId] = useState<number>(0);

  /* ---------- fetch ---------- */
  useEffect(() => {
    if (currentUser?.role === 'admin') fetchUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, page]);

  const fetchUsers = async (pageNumber: number) => {
    const timer = setTimeout(() => setDelayedLoading(true), 400);
    try {
      setDelayedLoading(false);
      const res = await apiClient.get(`/usuarios/users/?page=${pageNumber}`);
      const results = res.data.results || [];
      setUsers(
        results
          .filter((u: any) => u.id !== currentUser?.id)
          .map((u: any) => ({
            id: u.id,
            nombre: u.nombre,
            apellido: u.apellido,
            telefono: u.telefono,
            role: u.role,
            archivado_en: u.archivado_en,
            permisos: u.permisos || [],
          })),
      );
      setMeta({
        count: res.data.count,
        next: res.data.next,
        previous: res.data.previous,
      });
      localStorage.setItem('usersPage', String(pageNumber));
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      setError('No se pudo obtener usuarios');
    } finally {
      clearTimeout(timer);
      setDelayedLoading(false);
    }
  };

  /* ---------- acciones ---------- */
  const handleArchiveOrRestore = async (
    userId: number,
    isArchived: boolean,
  ) => {
    const endpoint = isArchived ? 'restaurar' : 'archivar';
    try {
      const res = await apiClient.patch(
        `/usuarios/users/${userId}/${endpoint}/`,
      );
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

  const handleManagePermissions = (userId: number, perms: string[]) => {
    setSelUserId(userId);
    setSelUserPerms(perms);
    setDialogOpen(true);
  };

  /* ---------- filtrado ---------- */
  const filteredUsers = users.filter((u) => {
    if (filter === 'activos') return !u.archivado_en;
    if (filter === 'archivados') return Boolean(u.archivado_en);
    return true;
  });

  const emptyMessage =
    filter === 'archivados'
      ? 'No hay usuarios archivados.'
      : 'No hay usuarios registrados.';

  /* ---------- permisos ---------- */
  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">Acceso denegado</div>
    );
  }

  /* ---------- render ---------- */
  return (
    <Fragment>
      <motion.div
        className="p-6 max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Paper
          elevation={4}
          className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white"
        >
          <Typography variant="h4" className="text-primary-dark font-bold mb-4">
            Administrar Usuarios
          </Typography>

          {/* filtro */}
          <Tabs
            value={filter}
            onChange={(_, v) => setFilter(v)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ mb: 2 }}
          >
            <Tab label="Activos" value="activos" />
            <Tab label="Archivados" value="archivados" />
            <Tab label="Todos" value="todos" />
          </Tabs>

          {error && <div className="text-red-600 mb-2">{error}</div>}

          {/* ---------- tabla ---------- */}
          {delayedLoading ? (
            /* Skeleton rows (reduce flash) */
            <Box className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={48}
                  animation="wave"
                />
              ))}
            </Box>
          ) : (
            <TableLayout<User>
              data={filteredUsers}
              columns={columns}
              page={page}
              pageSize={pageSize}
              count={meta.count}
              onPageChange={setPage}
              emptyMessage={emptyMessage}
              renderActions={(u) => {
                const isArchived = Boolean(u.archivado_en);
                return (
                  <UserActionsMenu
                    isArchived={isArchived}
                    onArchiveOrRestore={() =>
                      handleArchiveOrRestore(u.id, isArchived)
                    }
                    onDelete={() => {
                      setConfirmUserId(u.id);
                      setConfirmOpen(true);
                    }}
                    onManagePermissions={() =>
                      handleManagePermissions(u.id, u.permisos)
                    }
                  />
                );
              }}
            />
          )}
        </Paper>
      </motion.div>

      {/* diálogo de permisos */}
      <PermissionsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={selUserId}
        currentPerms={selUserPerms}
      />

      {/* confirm delete */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que deseas eliminar este usuario?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
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
    </Fragment>
  );
};

export default UsersAdmin;
