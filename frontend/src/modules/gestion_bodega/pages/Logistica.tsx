// frontend/src/modules/gestion_bodega/pages/Logistica.tsx
// Vista completa de Logística: Pedidos y Camiones de Salida
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Alert,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { m, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../../global/store/store';
import LogisticaSection from '../components/tablero/sections/LogisticaSection';
import CamionFormModal from '../components/logistica/CamionFormModal';
import { useCamiones } from '../hooks/useCamiones';
import { useAuth } from '../../gestion_usuarios/context/AuthContext';

const panelVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -10, transition: { duration: 0.18, ease: 'easeIn' } },
};

export default function Logistica() {
  const { hasPerm } = useAuth();
  const { bodegaId, temporadaId, selectedWeekId } = useAppSelector((s) => s.tableroBodega);
  const [page, setPage] = useState(1);
  const [filterEstado, setFilterEstado] = useState<string | null>(null);

  // Camiones hook
  const { items: camiones, meta, isLoading, error, fetchCamiones } = useCamiones({
    bodegaId: bodegaId ?? undefined,
    temporadaId: temporadaId ?? undefined,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCamion, setSelectedCamion] = useState<any>(null);
  const canManageCamiones = hasPerm('add_camionsalida') || hasPerm('change_camionsalida');

  // Fetch on mount and params change
  useEffect(() => {
    fetchCamiones({ page, estado: filterEstado });
  }, [fetchCamiones, page, filterEstado]);

  const handleRefresh = useCallback(() => {
    fetchCamiones({ page, estado: filterEstado });
  }, [fetchCamiones, page, filterEstado]);

  const handleAddCamion = () => {
    setSelectedCamion(null);
    setModalOpen(true);
  };

  const handleEditCamion = (row: any) => {
    setSelectedCamion(row);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    handleRefresh();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleFilterEstadoChange = (estado: string | null) => {
    setFilterEstado(estado);
    setPage(1);
  };

  // Map camiones to LogisticaSection rows
  const rows = camiones.map((c: any) => ({
    id: c.id,
    ref: c.numero || c.id,
    folio: c.folio,
    numero: c.numero,
    fecha: c.fecha_salida,
    cajas: c.cargas?.reduce((acc: number, cg: any) => acc + (cg.cantidad ?? 0), 0) ?? c.total_cajas ?? 0,
    estado: c.estado,
    ...c,
  }));

  return (
    <Box>
      {/* Header */}
      <Box mb={2}>
        <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShippingIcon fontSize="small" /> Logística de Bodega
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500} mt={0.25}>
          Gestión de camiones de salida, cargas y despachos
        </Typography>
      </Box>

      {!bodegaId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Selecciona una bodega y temporada para ver la logística.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <Box
          key="logistica-content"
          component={m.div}
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <LogisticaSection
            hasWeeks={true}
            semanaIndex={null}
            rows={rows}
            meta={{
              page: meta.page,
              page_size: meta.page_size,
              count: meta.count,
              total_pages: meta.total_pages,
            }}
            loading={isLoading}
            onPageChange={handlePageChange}
            onAddCamion={bodegaId && canManageCamiones ? handleAddCamion : undefined}
            onEditCamion={canManageCamiones ? handleEditCamion : undefined}
            canManageCamiones={canManageCamiones}
            camionesTooltip="No tienes permiso para gestionar camiones."
            filterEstado={filterEstado}
            onFilterEstadoChange={handleFilterEstadoChange}
          />
        </Box>
      </AnimatePresence>

      {/* Camion Modal */}
      {bodegaId && temporadaId && (
        <CamionFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedCamion(null); }}
          onSuccess={handleSuccess}
          bodegaId={bodegaId}
          temporadaId={temporadaId}
          semanaId={selectedWeekId}
          camion={selectedCamion}
        />
      )}
    </Box>
  );
}
