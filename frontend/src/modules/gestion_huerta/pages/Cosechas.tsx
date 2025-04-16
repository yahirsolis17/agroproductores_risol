// src/modules/gestion_huerta/pages/Cosechas.tsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Paper, Typography, CircularProgress, Box } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';

// Importa tus acciones (o hooks) del slice de cosechas.
// Ejemplo: fetchCosechasByHuerta, createCosecha
import {
  fetchCosechasByHuerta,
  createCosecha,
} from '../../../global/store/cosechasSlice';

// Importa tu toolbar y tabla (si ya los tienes):
// CosechaToolbar y CosechaTable
import CosechaToolbar from '../components/cosecha/CosechaToolbar';
import CosechaTable from '../components/cosecha/CosechaTable';

// Tipos (ajusta según tu archivo de tipos)
import { CosechaCreateData } from '../types/cosechaTypes';

const Cosechas: React.FC = () => {
  const dispatch = useAppDispatch();

  // Estado de cosechas en Redux
  const { list: cosechas, loading, error } = useAppSelector((state) => state.cosechas);

  // Suponiendo que tengas un huertaId en Redux, param o algo similar:
  // para fines de ejemplo, usaremos un id estático = 1
  const huertaId = 1;

  useEffect(() => {
    // Cargar cosechas de la huerta ID=1 al montar:
    dispatch(fetchCosechasByHuerta(huertaId));
  }, [dispatch, huertaId]);

  // Manejar creación de nueva cosecha
  const handleCreateCosecha = async (payload: CosechaCreateData) => {
    // El payload deberá incluir al menos la huerta
    // Ej: payload.huerta = huertaId
    await dispatch(createCosecha(payload)).unwrap();
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
          Gestión de Cosechas
        </Typography>

        {/* Toolbar para crear cosecha (si lo tienes implementado) */}
        <CosechaToolbar onCreate={handleCreateCosecha} />

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <CosechaTable data={cosechas} />
        )}
      </Paper>
    </motion.div>
  );
};

export default Cosechas;
