import React, { useEffect } from 'react';
import { Paper, Typography, CircularProgress, Box } from '@mui/material';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchPropietarios, createPropietario } from '../../../global/store/propietariosSlice';
import PropietarioToolbar from '../components/propietario/PropietarioToolbar';
import PropietarioTable from '../components/propietario/PropietarioTable';
import { PropietarioCreateData } from '../types/propietarioTypes';

const Propietarios: React.FC = () => {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector(state => state.propietarios);

  useEffect(() => {
    dispatch(fetchPropietarios());
  }, [dispatch]);

  const handleCreate = async (payload: PropietarioCreateData) => {
    await dispatch(createPropietario(payload)).unwrap();
  };

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Propietarios
        </Typography>

        <PropietarioToolbar onCreate={handleCreate} />

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <PropietarioTable data={list} />
        )}
      </Paper>
    </motion.div>
  );
};

export default Propietarios;
