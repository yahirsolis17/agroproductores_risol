// src/modules/gestion_usuarios/pages/ActivityLog.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Typography,
  Paper,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Sort } from '@mui/icons-material';
import { TableLayout, Column } from '../../../components/common/TableLayout';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { ActivityLogEntry, fetchActivityLog, setOrdering, setPage } from '../../../global/store/activityLogSlice';

const pageSize = 10;

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
      </>
    ),
  },
  { label: 'Acción', key: 'accion' },
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
  const { items, meta, page, ordering, loading, error } = useAppSelector((s) => s.activityLog);
  const sortDesc = ordering.startsWith('-');

  useEffect(() => {
    if (user?.role === 'admin') {
      void dispatch(fetchActivityLog({ page, ordering }));
    }
  }, [dispatch, ordering, page, user]);

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
    <motion.div
      className="p-4 sm:p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" className="text-primary-dark font-bold">
            Historial de Actividades
          </Typography>
          <Tooltip title="Ordenar por fecha">
            <IconButton onClick={toggleSort} color="primary">
              <Sort className={sortDesc ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </IconButton>
          </Tooltip>
        </Box>

        {error?.message && (
          <Typography color="error" className="mb-4">
            {error.message}
          </Typography>
        )}

<TableLayout<Activity>
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
    </motion.div>
  );
};

export default ActivityLog;
