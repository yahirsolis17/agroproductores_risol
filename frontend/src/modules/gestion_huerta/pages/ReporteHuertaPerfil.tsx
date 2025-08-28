import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Box, Typography, Divider, Alert, CircularProgress } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/ReporteProduccionViewer';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { useReportePerfilHuerta } from '../hooks/useReportePerfilHuerta';
import { FormatoReporte } from '../types/reportesProduccionTypes';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ReportePerfilHuerta() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery();
  const isRentada = query.get('rentada') === '1';
  const años = Number(query.get('anios') || '5');

  const huertaId = !isRentada ? Number(id) : undefined;
  const huertaRentadaId = isRentada ? Number(id) : undefined;

  const { data, loading, error, refetch } = useReportePerfilHuerta(huertaId, huertaRentadaId, años);

  const handleExport = async (formato: FormatoReporte) => {
    await reportesProduccionService.generarReportePerfilHuerta({
      formato,
      huerta_id: huertaId,
      huerta_rentada_id: huertaRentadaId,
      años,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Perfil de Huerta
      </Typography>

      <ReportesProduccionToolbar
        loading={loading}
        onRefresh={refetch}
        onExport={handleExport}
      />

      <Divider sx={{ my: 2 }} />
      {!id && <Alert severity="info">Proporcione un id de huerta en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <ReporteProduccionViewer
          data={data}
          title="Perfil de Huerta"
          subtitle={data.metadata.infoHuerta?.huerta_nombre}
          onExport={undefined}
          onRefresh={refetch} 
        />
      )}
    </Box>
  );
}
