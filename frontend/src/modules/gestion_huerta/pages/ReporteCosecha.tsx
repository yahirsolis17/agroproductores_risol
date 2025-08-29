// reportecosecha.tsx
import { useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Divider, Alert, CircularProgress, Typography } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/ReporteProduccionViewer';
import { useReporteCosecha } from '../hooks/useReporteCosecha';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { FormatoReporte } from '../types/reportesProduccionTypes';

export default function ReporteCosecha() {
  const { cosechaId } = useParams<{ cosechaId: string }>();
  const id = useMemo(() => Number(cosechaId), [cosechaId]);

  const [filters] = useState<{ from?: string; to?: string; formato: FormatoReporte }>({ formato: 'json' });
  const { data, loading, error, refetch } = useReporteCosecha(id, filters.from, filters.to);

  const handleExport = useCallback(async (formato: FormatoReporte) => {
    if (!id) return;
    await reportesProduccionService.generarReporteCosecha({ cosecha_id: id, formato });
  }, [id]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Reporte de Cosecha
      </Typography>

      <ReportesProduccionToolbar
        from={filters.from}
        to={filters.to}
        formato={filters.formato}
        loading={loading}
        onRefresh={refetch}
        onExport={handleExport}
      />

      <Divider sx={{ my: 2 }} />
      {!id && <Alert severity="info">Proporcione un ID de cosecha en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <ReporteProduccionViewer
          data={data}
          title="Reporte de Cosecha"
        />
      )}
    </Box>
  );
}
