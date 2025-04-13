import React, { useEffect, useState } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Sort } from '@mui/icons-material';

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

const ActivityLog: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ count: 0, next: null, previous: null });
  const [delayedLoading, setDelayedLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(() => Number(localStorage.getItem('activityPage')) || 1);
  const [sortDesc, setSortDesc] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchActivities(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, sortDesc]);

  const fetchActivities = async (pageNumber = 1) => {
    let delayTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      setDelayedLoading(false);

      delayTimer = setTimeout(() => {
        setDelayedLoading(true);
      }, 300); // 300ms para evitar el parpadeo feo

      const ordering = sortDesc ? '-fecha_hora' : 'fecha_hora';
      const response = await apiClient.get(`/usuarios/actividad/?page=${pageNumber}&ordering=${ordering}`);
      const results: Activity[] = response.data.results || [];

      setActivities(results);
      setMeta({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
      });

      localStorage.setItem('activityPage', String(pageNumber));
    } catch {
      setError('No se pudo obtener el historial de actividades.');
    } finally {
      if (delayTimer) clearTimeout(delayTimer);
      setDelayedLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(meta.count / pageSize));

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const toggleSort = () => {
    setSortDesc(prev => !prev);
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
          <Tooltip title="Ordenar">
            <IconButton onClick={toggleSort} color="primary">
              <Sort className={sortDesc ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </IconButton>
          </Tooltip>
        </Box>

        {error && <Typography color="error" className="mb-4">{error}</Typography>}

        {delayedLoading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} className="rounded-xl border border-neutral-200">
              <Table size="small">
                <TableHead className="bg-neutral-100">
                  <TableRow>
                    <TableCell className="font-semibold">Fecha</TableCell>
                    <TableCell className="font-semibold">Usuario</TableCell>
                    <TableCell className="font-semibold">Acción</TableCell>
                    <TableCell className="font-semibold">Detalles</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activities.length > 0 ? (
                    activities.map((act) => (
                      <TableRow key={act.id} hover>
                        <TableCell>{new Date(act.fecha_hora).toLocaleString()}</TableCell>
                        <TableCell>
                          {act.usuario.nombre} {act.usuario.apellido}
                          <br />
                          <span className="text-sm text-neutral-500">{act.usuario.telefono}</span>
                        </TableCell>
                        <TableCell>{act.accion}</TableCell>
                        <TableCell className="text-neutral-600">{act.detalles || '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-neutral-500 py-6">
                        No hay actividades para esta página.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

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
          </>
        )}
      </Paper>
    </motion.div>
  );
};

export default ActivityLog;
