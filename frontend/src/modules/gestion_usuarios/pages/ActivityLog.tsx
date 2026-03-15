import React, { useEffect } from 'react';
import { m } from 'framer-motion';
import {
  Typography,
  Paper,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
} from '@mui/material';
import { Sort } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { TableLayout, Column } from '../../../components/common/TableLayout';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import {
  ActivityLogEntry,
  fetchActivityLog,
  setOrdering,
  setPage,
  setRol,
  setSearch,
  setTipo,
} from '../../../global/store/activityLogSlice';

const pageSize = 10;

const categoriaLabel: Record<string, string> = {
  seguridad: 'Seguridad',
  autenticacion: 'Autenticacion',
  gestion_bodega: 'Bodega',
  gestion_huerta: 'Huerta',
  gestion_usuarios: 'Usuarios',
  sistema: 'Sistema',
};

const categoriaColor = (
  categoria?: string
): 'warning' | 'info' | 'success' | 'secondary' | 'default' => {
  switch (categoria) {
    case 'seguridad':
      return 'warning';
    case 'autenticacion':
      return 'secondary';
    case 'gestion_bodega':
      return 'success';
    case 'gestion_huerta':
      return 'info';
    default:
      return 'default';
  }
};

const severityColor = (
  severidad?: string
): 'warning' | 'info' | 'success' | 'default' => {
  switch (severidad) {
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    default:
      return 'default';
  }
};

const columns: Column<ActivityLogEntry>[] = [
  {
    label: 'Fecha',
    key: 'fecha_hora',
    render: (a) => new Date(a.fecha_hora).toLocaleString(),
  },
  {
    label: 'Usuario',
    key: 'usuario',
    render: (a) => (
      <>
        {a.usuario.nombre} {a.usuario.apellido}
        <br />
        <span className="text-sm text-neutral-500">{a.usuario.telefono}</span>
        <br />
        <Chip
          size="small"
          label={a.usuario.role === 'admin' ? 'Admin' : 'Usuario'}
          color={a.usuario.role === 'admin' ? 'secondary' : 'default'}
          sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
        />
      </>
    ),
  },
  {
    label: 'Contexto',
    key: 'categoria',
    render: (a) => (
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
        <Chip
          size="small"
          label={categoriaLabel[a.categoria || 'sistema'] || 'Sistema'}
          color={categoriaColor(a.categoria)}
        />
        <Chip
          size="small"
          label={a.severidad === 'warning' ? 'Alerta' : a.severidad === 'info' ? 'Info' : 'OK'}
          color={severityColor(a.severidad)}
          variant="outlined"
        />
      </Stack>
    ),
  },
  { label: 'Accion', key: 'accion' },
  {
    label: 'Ruta',
    key: 'ruta',
    render: (a) => (a.ruta ? `${a.metodo || 'N/A'} ${a.ruta}` : '—'),
  },
  {
    label: 'Detalles',
    key: 'detalles',
    render: (a) =>
      a.detalles ? (
        <pre className="whitespace-pre-wrap">{a.detalles}</pre>
      ) : (
        '—'
      ),
    align: 'left',
  },
  {
    label: 'IP',
    key: 'ip',
    render: (a) => a.ip || '—',
    align: 'center',
  },
];

const ActivityLog: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { items, meta, page, ordering, search, tipo, rol, loading, error } = useAppSelector((s) => s.activityLog);
  const sortDesc = ordering.startsWith('-');

  useEffect(() => {
    if (user?.role === 'admin') {
      void dispatch(fetchActivityLog({ page, ordering, search, tipo, rol }));
    }
  }, [dispatch, ordering, page, rol, search, tipo, user]);

  useEffect(() => {
    if (error?.status === 404 && page > 1) {
      dispatch(setPage(1));
    }
  }, [dispatch, error, page]);

  const toggleSort = () => {
    dispatch(setOrdering(sortDesc ? 'fecha_hora' : '-fecha_hora'));
  };

  if (user?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  return (
    <m.div
      className="p-4 sm:p-6 max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2} flexWrap="wrap">
          <Box>
            <Typography variant="h4" className="text-primary-dark font-bold">
              Historial de Actividades
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Auditoria operativa y de seguridad para acciones de usuarios y administradores.
            </Typography>
          </Box>
          <Tooltip title="Ordenar por fecha">
            <IconButton onClick={toggleSort} color="primary">
              <Sort className={sortDesc ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Buscar"
            placeholder="Accion, detalle, ruta, IP o telefono"
            value={search}
            onChange={(event) => dispatch(setSearch(event.target.value))}
          />
          <TextField
            select
            size="small"
            label="Rol"
            value={rol}
            onChange={(event) => dispatch(setRol(event.target.value as 'todos' | 'admin' | 'usuario'))}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="usuario">Usuario</MenuItem>
          </TextField>
        </Stack>

        <ToggleButtonGroup
          exclusive
          value={tipo}
          onChange={(_, value) => {
            if (value !== null) dispatch(setTipo(value));
          }}
          size="small"
          sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
        >
          <ToggleButton value="todos">Todo</ToggleButton>
          <ToggleButton value="seguridad">Seguridad</ToggleButton>
          <ToggleButton value="autenticacion">Autenticacion</ToggleButton>
          <ToggleButton value="gestion_bodega">Bodega</ToggleButton>
          <ToggleButton value="gestion_huerta">Huerta</ToggleButton>
          <ToggleButton value="gestion_usuarios">Usuarios</ToggleButton>
        </ToggleButtonGroup>

        {error?.message && (
          <Typography color="error" className="mb-4">
            {error.message}
          </Typography>
        )}

        <TableLayout<ActivityLogEntry>
          data={items}
          columns={columns}
          page={page}
          pageSize={meta.page_size ?? pageSize}
          metaPageSize={meta.page_size}
          count={meta.count ?? 0}
          serverSidePagination
          rowKey={(a) => a.id}
          onPageChange={(nextPage) => dispatch(setPage(nextPage))}
          emptyMessage="No hay actividades registradas."
          loading={loading}
          striped
          dense
        />
      </Paper>
    </m.div>
  );
};

export default ActivityLog;
