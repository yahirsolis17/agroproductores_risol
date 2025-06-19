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
} from '@mui/material';
import { Sort } from '@mui/icons-material';
import { TableLayout, Column } from '../../../components/common/TableLayout';

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
  ip?: string;
}

interface Meta {
  count: number;
  next: string | null;
  previous: string | null;
}

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

  const [activities, setActivities] = useState<Activity[]>([]);
  const [meta, setMeta] = useState<Meta>({ count: 0, next: null, previous: null });
  const [page, setPage] = useState(() => Number(localStorage.getItem('activityPage')) || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchActivities(page, sortDesc);
    }
  }, [page, sortDesc, user]);

  const fetchActivities = async (pageNumber: number, desc: boolean) => {
    setIsLoading(true);
    try {
      const ordering = desc ? '-fecha_hora' : 'fecha_hora';
      const res = await apiClient.get('/usuarios/actividad/', {
        params: { page: pageNumber, ordering },
      });

      setActivities(res.data.results || []);
      setMeta(res.data.meta || {
        count: res.data.count,
        next: res.data.next,
        previous: res.data.previous,
      });
      localStorage.setItem('activityPage', String(pageNumber));
      setError('');
    } catch (error: any) {
      if (error?.response?.status === 404 && pageNumber > 1) {
        setPage(1); // fallback si la página ya no existe
      } else {
        setError('No se pudo obtener el historial de actividades.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSort = () => setSortDesc((prev) => !prev);

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

        {error && (
          <Typography color="error" className="mb-4">
            {error}
          </Typography>
        )}

        <TableLayout<Activity>
          data={activities}
          columns={columns}
          page={page}
          pageSize={pageSize}
          count={meta.count}
          serverSidePagination
          rowKey={(a) => a.id}
          onPageChange={setPage}
          emptyMessage="No hay actividades registradas."
          loading={isLoading}
          striped
          dense
        />
      </Paper>
    </motion.div>
  );
};

export default ActivityLog;
