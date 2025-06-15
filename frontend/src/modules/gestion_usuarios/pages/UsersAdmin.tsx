// src/modules/gestion_usuarios/pages/UsersAdmin.tsx
import React, { useEffect, useState, Fragment } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import PermissionsDialog from './PermissionsDialog';
import UserActionsMenu from '../components/UserActionsMenu';

import { TableLayout, Column } from '../../../components/common/TableLayout';

/* ─────────────────── Tipos ─────────────────── */
interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  archivado_en: string | null;
  permisos: string[]; // slugs
}

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

type ViewFilter = 'activos' | 'archivados' | 'todos';
const pageSize = 10;

/* ─────────────────── Columnas ─────────────────── */
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

/* ─────────────────── Componente ─────────────────── */
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
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<ViewFilter>('activos');

  /* diálogo de permisos */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selUserId, setSelUserId] = useState<number>(0);
  const [selUserPerms, setSelUserPerms] = useState<string[]>([]);

  /* confirm delete */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUserId, setConfirmUserId] = useState<number>(0);

  /* ─────────────────── Fetch ─────────────────── */
  useEffect(() => {
    if (currentUser?.role === 'admin') fetchUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, page]);

  const fetchUsers = async (pageNumber: number) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/usuarios/users/?page=${pageNumber}`);
      const results = res.data.results || [];

      setUsers(
        results
          // ⬇️ FILTRO DE SEGURIDAD: NO incluir admins ni al usuario actual
          .filter(
            (u: any) =>
              u.id !== currentUser?.id && u.role !== 'admin'
          )
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
      setError('');
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      setError('No se pudo obtener usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  /* ─────────────────── Acciones ─────────────────── */
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

  /* ─────────────────── Filtrado visual ─────────────────── */
  const filteredUsers = users.filter((u) => {
    if (filter === 'activos') return !u.archivado_en;
    if (filter === 'archivados') return Boolean(u.archivado_en);
    return true;
  });

  const emptyMessage =
    filter === 'archivados'
      ? 'No hay usuarios archivados.'
      : 'No hay usuarios registrados.';

  /* ─────────────────── Permisos ─────────────────── */
  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">Acceso denegado</div>
    );
  }

  /* ─────────────────── Render ─────────────────── */
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

          {/* tabla */}
          <TableLayout<User>
            data={filteredUsers}
            columns={columns}
            page={page}
            pageSize={pageSize}
            count={meta.count}
            onPageChange={setPage}
            emptyMessage={emptyMessage}
            loading={isLoading}
            serverSidePagination
            striped
            dense
            rowKey={(u) => u.id}
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
