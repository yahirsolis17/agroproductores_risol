// reportetemporada.tsx
import { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Divider, Alert, CircularProgress } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/ReporteProduccionViewer';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { useReporteTemporada } from '../hooks/useReporteTemporada';
import { FormatoReporte } from '../types/reportesProduccionTypes';

export default function ReporteTemporada() {
  const { temporadaId } = useParams<{ temporadaId: string }>();
  const id = useMemo(() => Number(temporadaId), [temporadaId]);
  const { data, loading, error, refetch } = useReporteTemporada(id);

  const handleExport = useCallback(async (formato: FormatoReporte) => {
    if (!id) return;
    await reportesProduccionService.generarReporteTemporada({ temporada_id: id, formato });
  }, [id]);

  return (
    <Box sx={{ p: 2 }}>

      <ReportesProduccionToolbar loading={loading} onRefresh={refetch} onExport={handleExport} />

      <Divider sx={{ my: 2 }} />
      {!id && <Alert severity="info">Proporcione un ID de temporada en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <ReporteProduccionViewer
          data={data}
          title="Reporte de Temporada"
        />
      )}
    </Box>
  );
}
