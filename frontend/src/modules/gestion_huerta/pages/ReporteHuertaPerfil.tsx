// frontend/src/modules/gestion_huerta/pages/ReporteHuertaPerfil.tsx
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Divider, Alert, CircularProgress } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/common/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/common/ReporteProduccionViewer';
import { useReporteHuertaPerfil } from '../hooks/useReporteHuertaPerfil';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { FormatoReporte } from '../types/reportesProduccionTypes';

export default function ReporteHuertaPerfil() {
  const { huertaId } = useParams<{ huertaId: string }>();
  const id = useMemo(() => Number(huertaId), [huertaId]);

  const [filters, setFilters] = useState<{ from?: string; to?: string; formato: FormatoReporte }>({
    formato: 'json'
  });
  const { data, loading, error, refetch } = useReporteHuertaPerfil(id, filters.from, filters.to);

  const handleExport = async (formato: FormatoReporte) => {
    if (!id) return;
    
    try {
      await reportesProduccionService.generarReportePerfilHuerta({
        huerta_id: id,
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
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Perfil Histórico de Huerta</Typography>
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
      {!id && <Alert severity="info">Proporcione un huertaId en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && <ReporteProduccionViewer data={data} title="Perfil Histórico de Huerta" />}
    </Box>
  );
}
