import React from 'react';
import {
  Paper,
  Typography,
  CircularProgress,
  Box,
  Pagination,
} from '@mui/material';
import { motion } from 'framer-motion';

import PropietarioToolbar from '../components/propietario/PropietarioToolbar';
import PropietarioTable from '../components/propietario/PropietarioTable';
import { usePropietarios } from '../hooks/usePropietarios';
import { PropietarioCreateData } from '../types/propietarioTypes';

const Propietarios: React.FC = () => {
  const {
    propietarios,
    loading,
    meta,
    page,
    setPage,
    addPropietario,
    fetchPropietarios,
  } = usePropietarios();

  const handleCreate = async (payload: PropietarioCreateData) => {
    await addPropietario(payload); // ← esto lanza si hay error
    await fetchPropietarios();
  };
  

  const totalPages = Math.ceil((meta?.count || 0) / 10);

  return (
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
          Gestión de Propietarios
        </Typography>

        <PropietarioToolbar onCreate={handleCreate} />

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <PropietarioTable
              data={propietarios}
              page={page}
              pageSize={10}
              count={meta?.count || 0}
              onPageChange={(newPage: number) => setPage(newPage)}
            />
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  shape="rounded"
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </motion.div>
  );
};

export default Propietarios;
