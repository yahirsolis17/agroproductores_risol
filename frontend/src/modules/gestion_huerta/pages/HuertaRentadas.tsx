// src/modules/gestion_huerta/pages/HuertasRentadas.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Paper, Typography, CircularProgress, Box, Pagination } from '@mui/material';

/* ───── Hooks ───── */
import { useHuertaRentada } from '../hooks/useHuertaRentada';
import { usePropietarios } from '../hooks/usePropietarios';

/* ───── Componentes ───── */
import HuertaRentadaToolbar from '../components/huerta_rentada/HuertaRentadaToolbar';
import HuertaRentadaTable from '../components/huerta_rentada/HuertaRentadaTable';
import HuertaRentadaFormModal from '../components/huerta_rentada/HuertaRentadaFormModal';
import PropietarioFormModal from '../components/propietario/PropietarioFormModal';

/* ───── Tipos ───── */
import { HuertaRentadaCreateData } from '../types/huertaRentadaTypes';
import { PropietarioCreateData, Propietario } from '../types/propietarioTypes';

const HuertasRentadas: React.FC = () => {
  const [openHuertaModal, setOpenHuertaModal] = useState(false);
  const [openPropietarioModal, setOpenPropietarioModal] = useState(false);
  const [defaultPropietarioId, setDefaultPropietarioId] = useState<number | undefined>(undefined);

  const {
    huertasRentadas,
    loading: loadingHuerta,
    meta,
    page,
    setPage,
    addHuertaRentada,
    fetchHuertasRentadas,
  } = useHuertaRentada();

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

  const handleCreateHuerta = async (payload: HuertaRentadaCreateData) => {
    try {
      await addHuertaRentada(payload);
      await fetchHuertasRentadas();
      handleCloseHuertaModal();
    } catch (error) {
      console.error('Error al crear huerta rentada:', error);
    }
  };

  const handleCreatePropietario = async (payload: PropietarioCreateData) => {
    try {
      const newProp: Propietario = await addPropietario(payload);
      await fetchPropietarios();
      setDefaultPropietarioId(newProp.id);
      setOpenPropietarioModal(false);
    } catch (error) {
      console.error('Error en crear propietario:', error);
    }
  };

  const isLoading = loadingHuerta || loadingPropietarios;

  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl shadow-lg bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-4">
          Huertas Rentadas
        </Typography>

        <HuertaRentadaToolbar onOpen={() => setOpenHuertaModal(true)} />

        {isLoading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <HuertaRentadaTable
              data={huertasRentadas}
              page={page}
              total={meta.count}
              onPageChange={(_, value) => setPage(value)}
            />
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={Math.ceil(meta.count / 10)}
                page={page}
                onChange={(_, value) => setPage(value)}
                shape="rounded"
                color="primary"
              />
            </Box>
          </>
        )}

        <HuertaRentadaFormModal
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

export default HuertasRentadas;