// src/modules/gestion_usuarios/pages/ActivityLog.tsx
import React, { useEffect, useState } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Typography,
  Paper,
  Box,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material';
import { Sort } from '@mui/icons-material';

import { TableLayout, Column } from '../../../components/common/TableLayout';

/* ------------------- Tipos ------------------- */
interface Activity {
  id: number;
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
    role: 'admin' | 'usuario';
  };
  accion: string;
  fecha_hora: string;
  detalles?: string;
}

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

/* ------------------- Tabla ------------------- */
const pageSize = 10;

const columns: Column<Activity>[] = [
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
    render: (a) => a.detalles || '—',
    align: 'left',
  },
];

/* ------------------- Componente ------------------- */
const ActivityLog: React.FC = () => {
  const { user } = useAuth();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ count: 0, next: null, previous: null });
  const [error, setError] = useState('');

  const [page, setPage] = useState(() => Number(localStorage.getItem('activityPage')) || 1);
  const [sortDesc, setSortDesc] = useState(true);

  const [delayedLoading, setDelayedLoading] = useState(false);

  /* ------------------- Fetch ------------------- */
  useEffect(() => {
    if (user?.role === 'admin') fetchActivities(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, sortDesc]);

  const fetchActivities = async (pageNumber = 1) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      setDelayedLoading(false);
      timer = setTimeout(() => setDelayedLoading(true), 400);

      const ordering = sortDesc ? '-fecha_hora' : 'fecha_hora';
      const res = await apiClient.get(
        `/usuarios/actividad/?page=${pageNumber}&ordering=${ordering}`,
      );

      setActivities(res.data.results || []);
      setMeta({ count: res.data.count, next: res.data.next, previous: res.data.previous });
      localStorage.setItem('activityPage', String(pageNumber));
    } catch {
      setError('No se pudo obtener el historial de actividades.');
    } finally {
      if (timer) clearTimeout(timer);
      setDelayedLoading(false);
    }
  };

  const toggleSort = () => setSortDesc((prev) => !prev);

  /* ------------------- Guard ------------------- */
  if (user?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  /* ------------------- Render ------------------- */
  return (
    <motion.div
      className="p-4 sm:p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" className="text-primary-dark font-bold">
            Historial de Actividades
          </Typography>

          <Tooltip title="Ordenar por fecha">
            <IconButton onClick={toggleSort} color="primary">
              <Sort
                className={
                  sortDesc ? 'rotate-180 transition-transform' : 'transition-transform'
                }
              />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Error */}
        {error && (
          <Typography color="error" className="mb-4">
            {error}
          </Typography>
        )}

        {/* Tabla / loader */}
        {delayedLoading ? (
          <Box>
            {/* Skeleton: 8 filas  */}
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={40}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : (
          <TableLayout<Activity>
            data={activities}
            columns={columns}
            page={page}
            pageSize={pageSize}
            count={meta.count}
            onPageChange={setPage}
            emptyMessage="No hay actividades registradas."
          />
        )}
      </Paper>
    </motion.div>
  );
};

export default ActivityLog;
