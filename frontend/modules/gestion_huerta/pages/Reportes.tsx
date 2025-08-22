// frontend/modules/gestion_huerta/pages/Reportes.tsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ReportToolbar from '../components/reportes/common/ReportToolbar';
import ReportView from '../components/reportes/ReportView';
import useReporte from '../hooks/useReporte';

const Reportes: React.FC = () => {
  const { data, loading, fetchCosecha, fetchTemporada, fetchHuerta } = useReporte();

  const handleFetch = (tipo: 'cosecha' | 'temporada' | 'huerta', id: number) => {
    if (tipo === 'cosecha') fetchCosecha(id);
    else if (tipo === 'temporada') fetchTemporada(id);
    else fetchHuerta(id);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reportes de Producción
      </Typography>
      <ReportToolbar onFetch={handleFetch} />
      {loading && <CircularProgress sx={{ mt: 2 }} />}
      {!loading && data && <ReportView data={data} />}
    </Box>
  );
};

export default Reportes;

