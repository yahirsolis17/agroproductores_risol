// src/modules/gestion_huerta/pages/Huertas.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Paper, Typography, CircularProgress, Box, Pagination } from '@mui/material';

/* ───── Hooks ───── */
import { useHuertas } from '../hooks/useHuertas';
import { usePropietarios } from '../hooks/usePropietarios';

/* ───── Componentes ───── */
import HuertaToolbar from '../components/huerta/HuertaToolBar';
import HuertaTable from '../components/huerta/HuertaTable';
import HuertaFormModal from '../components/huerta/HuertaFormModal';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

/* ───── Tipos ───── */
import { HuertaCreateData } from '../types/huertaTypes';
import { PropietarioCreateData } from '../types/propietarioTypes';

const Huertas: React.FC = () => {
  const [openHuertaModal, setOpenHuertaModal] = useState(false);
  const [openPropietarioModal, setOpenPropietarioModal] = useState(false);
  const [defaultPropietarioId, setDefaultPropietarioId] = useState<number | undefined>(undefined);

  const {
    huertas,
    loading: loadingHuerta,
    meta,
    page,
    setPage,
    addHuerta,
    fetchHuertas,
  } = useHuertas();

  const {
    propietarios,
    loading: loadingPropietarios,
    fetchPropietarios,
    addPropietario,
  } = usePropietarios();

  const handleCloseHuertaModal = () => {
    setOpenHuertaModal(false);
    setDefaultPropietarioId(undefined);
  };

  // Ahora devuelve Promise<void> para coincidir con Formik
  const handleCreateHuerta = async (payload: HuertaCreateData): Promise<void> => {
    try {
      await addHuerta(payload);        // unwrap() arrojará ValidationError si existe
      await fetchHuertas();
      handleCloseHuertaModal();
    } catch (error) {
      console.error('Error al crear huerta:', error);
      throw error; // para que Formik capture y pinte los errores en el formulario
    }
  };

  const handleCreatePropietario = async (payload: PropietarioCreateData) => {
    try {
      const newProp = await addPropietario(payload); // unwrap() lanzará si hay validación
      await fetchPropietarios();
      setDefaultPropietarioId(newProp.id);
      return newProp; // necesario para onSuccess de PropietarioFormModal
    } catch (error) {
      throw error; // para que PropietarioFormModal capture el error
    }
  };

  const isLoading = loadingHuerta || loadingPropietarios;
  const totalPages = Math.ceil((meta?.count || 0) / 10);

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
        ) : (
          <>
            <HuertaTable
              data={huertas}
              page={page}
              total={meta?.count || 0}
              onPageChange={(_, value) => setPage(value)}
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

        <HuertaFormModal
          open={openHuertaModal}
          onClose={handleCloseHuertaModal}
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
