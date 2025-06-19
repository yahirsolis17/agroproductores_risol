// src/modules/gestion_usuarios/pages/UsersAdmin.tsx
import React, { Fragment } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Typography,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import PermissionsDialog from './PermissionsDialog';
import UserActionsMenu from '../components/UserActionsMenu';
import { TableLayout, Column } from '../../../components/common/TableLayout';
import { useUsers } from '../hooks/useUsers';
import apiClient from '../../../global/api/apiClient';

type ViewFilter = 'activos' | 'archivados' | 'todos';

const columns: Column<any>[] = [
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
        <span className="text-yellow-600 font-medium">Archivado</span>
      ) : (
        <span className="text-green-600 font-medium">Activo</span>
      ),
  },
];

const UsersAdmin: React.FC = () => {
  const { user: currentUser } = useAuth();

  const {
    users,
    meta,
    page,
    loading,
    estado,
    changePage,
    changeEstado,
    refetch,
  } = useUsers();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selUserId, setSelUserId] = React.useState<number>(0);
  const [selUserPerms, setSelUserPerms] = React.useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmUserId, setConfirmUserId] = React.useState<number>(0);

  const handleArchiveOrRestore = async (userId: number, isArchived: boolean) => {
    const endpoint = isArchived ? 'restaurar' : 'archivar';
    try {
      const res = await apiClient.patch(`/usuarios/users/${userId}/${endpoint}/`);
      handleBackendNotification(res.data);
      refetch();
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const res = await apiClient.delete(`/usuarios/users/${userId}/`);
      handleBackendNotification(res.data);
      refetch();
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    }
  };

  const handleManagePermissions = (userId: number, perms: string[]) => {
    setSelUserId(userId);
    setSelUserPerms(perms);
    setDialogOpen(true);
  };

  if (currentUser?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  const emptyMessage =
    estado === 'archivados'
      ? 'No hay usuarios archivados.'
      : 'No hay usuarios registrados.';

  return (
    <Fragment>
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

          <Tabs
            value={estado}
            onChange={(_, v: ViewFilter) => changeEstado(v)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ mb: 2 }}
          >
            <Tab label="Activos" value="activos" />
            <Tab label="Archivados" value="archivados" />
            <Tab label="Todos" value="todos" />
          </Tabs>

          <TableLayout<any>
            data={users}
            columns={columns}
            page={page}
            pageSize={10}
            count={meta.count}
            onPageChange={changePage}
            emptyMessage={emptyMessage}
            loading={loading}
            serverSidePagination
            striped
            dense
            rowKey={(u) => u.id}
            renderActions={(u) => {
              const isArchived = Boolean(u.archivado_en);
              return (
                <UserActionsMenu
                  isArchived={isArchived}
                  onArchiveOrRestore={() => handleArchiveOrRestore(u.id, isArchived)}
                  onDelete={() => {
                    setConfirmUserId(u.id);
                    setConfirmOpen(true);
                  }}
                  onManagePermissions={() => handleManagePermissions(u.id, u.permisos)}
                />
              );
            }}
          />
        </Paper>
      </motion.div>

      <PermissionsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={selUserId}
        currentPerms={selUserPerms}
      />

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
