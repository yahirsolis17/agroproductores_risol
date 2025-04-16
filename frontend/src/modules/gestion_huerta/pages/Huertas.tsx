import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Paper, Typography, CircularProgress, Box } from '@mui/material';

// Hooks
import { useHuertas } from '../hooks/useHuertas';
import { usePropietarios } from '../hooks/usePropietarios';

// Componentes
import HuertaToolbar from '../components/huerta/HuertaToolBar';
import HuertaTable from '../components/huerta/HuertaTable';
import HuertaFormModal from '../components/huerta/HuertaFormModal';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

// Tipos
import { HuertaCreateData } from '../types/huertaTypes';
import { PropietarioCreateData, Propietario } from '../types/propietarioTypes';

const Huertas: React.FC = () => {
  const [openHuertaModal, setOpenHuertaModal] = useState(false);
  const [openPropietarioModal, setOpenPropietarioModal] = useState(false);
  const [defaultPropietarioId, setDefaultPropietarioId] = useState<number | undefined>(undefined);

  const {
    huertas,
    loading: loadingHuerta,
    error: errorHuerta,
    addHuerta,
  } = useHuertas();

  const {
    propietarios,
    loading: loadingPropietarios,
    error: errorPropietarios,
    fetchPropietarios,
    addPropietario,
  } = usePropietarios();

  const handleCreateHuerta = async (payload: HuertaCreateData): Promise<void> => {
    try {
      await addHuerta(payload);
      setOpenHuertaModal(false);
      setDefaultPropietarioId(undefined);
    } catch (error) {
      console.error("Error en handleCreateHuerta:", error);
    }
  };

  const handleCreatePropietario = async (payload: PropietarioCreateData): Promise<void> => {
    try {
      const newProp: Propietario = await addPropietario(payload);
      await fetchPropietarios();
      setDefaultPropietarioId(newProp.id);
      setOpenPropietarioModal(false);
    } catch (error) {
      console.error("Error en handleCreatePropietario:", error);
    }
  };

  const isLoading = loadingHuerta || loadingPropietarios;
  interface ErrorWithNotification { notification?: { message: string } }
  const error = (errorHuerta || errorPropietarios) as ErrorWithNotification | string | null;

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Gestión de Huertas
        </Typography>

        <HuertaToolbar onOpen={() => setOpenHuertaModal(true)} />

        {isLoading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">
            {typeof error === 'object' && error !== null
              ? (error.notification?.message || 'Ocurrió un error al procesar la solicitud.')
              : error}
          </Typography>
        ) : (
          <HuertaTable data={huertas} />
        )}

        <HuertaFormModal
          open={openHuertaModal}
          onClose={() => setOpenHuertaModal(false)}
          onSubmit={handleCreateHuerta}
          propietarios={propietarios}
          onRegisterNewPropietario={() => setOpenPropietarioModal(true)}
          defaultPropietarioId={defaultPropietarioId}
        />

        <PropietarioFormModal
          open={openPropietarioModal}
          onClose={() => setOpenPropietarioModal(false)}
          onSubmit={handleCreatePropietario}
        />
      </Paper>
    </motion.div>
  );
};

export default Huertas;
