// frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Divider, Alert, CircularProgress } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/common/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/common/ReporteProduccionViewer';
import { useReporteCosecha } from '../hooks/useReporteCosecha';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { FormatoReporte } from '../types/reportesProduccionTypes';

export default function ReporteCosecha() {
  const [params] = useSearchParams();
  const id = useMemo(() => Number(params.get('id') || ''), [params]);

  const [filters, setFilters] = useState<{ from?: string; to?: string; formato: FormatoReporte }>({
    formato: 'json'
  });
  const { data, loading, error, refetch } = useReporteCosecha(id, filters.from, filters.to);

  const handleExport = async (formato: FormatoReporte) => {
    if (!id) return;
    
    try {
      await reportesProduccionService.generarReporteCosecha({
        cosecha_id: id,
        fecha_inicio: filters.from,
        fecha_fin: filters.to,
        formato
      });
    } catch (error) {
      console.error('Error al exportar reporte:', error);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Reporte por Cosecha</Typography>
      <ReportesProduccionToolbar 
        from={filters.from} 
        to={filters.to} 
        formato={filters.formato}
        loading={loading}
        onChange={setFilters} 
        onRefresh={refetch}
        onExport={handleExport}
      />
      <Divider sx={{ my: 2 }} />
      {!id && <Alert severity="info">Proporcione ?id=&lt;cosechaId&gt; en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && <ReporteProduccionViewer data={data} title="Reporte de Cosecha" />}
    </Box>
  );
}
