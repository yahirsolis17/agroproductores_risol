// frontend/modules/gestion_huerta/pages/Reportes.tsx
import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import ReportToolbar from '../components/reportes/common/ReportToolbar';
import ReportView from '../components/reportes/ReportView';
import useReporte from '../hooks/useReporte';

const Reportes: React.FC = () => {
  const { data, loading, fetchCosecha, fetchTemporada, fetchHuerta } = useReporte();
  const location = useLocation() as { state?: { tipo?: 'cosecha' | 'temporada' | 'huerta'; id?: number } };

  const handleFetch = (tipo: 'cosecha' | 'temporada' | 'huerta', id: number) => {
    if (tipo === 'cosecha') fetchCosecha(id);
    else if (tipo === 'temporada') fetchTemporada(id);
    else fetchHuerta(id);
  };

  // Si venimos desde una tabla con estado, generar el reporte automáticamente
  useEffect(() => {
    const st = location.state;
    if (st?.id && st.tipo) {
      handleFetch(st.tipo, st.id);
    }
  }, [location.state]);

  const initialTipo = location.state?.tipo;
  const initialId = location.state?.id;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reportes de Producción
      </Typography>
      <ReportToolbar onFetch={handleFetch} initialTipo={initialTipo} initialId={initialId} />
      {loading && <CircularProgress sx={{ mt: 2 }} />}
      {!loading && data && <ReportView data={data} />}
    </Box>
  );
};

export default Reportes;

