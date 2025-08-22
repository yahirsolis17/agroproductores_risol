// frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Divider, Alert, CircularProgress } from '@mui/material';
import ReportToolbar from '../components/reportes/common/ReportToolbar';
import ReporteTemporadaView from '../components/reportes/temporada/ReporteTemporadaView';
import { useReporteTemporada } from '../hooks/useReporteTemporada';

export default function ReporteTemporada() {
  const [params] = useSearchParams();
  const id = useMemo(() => Number(params.get('id') || ''), [params]);

  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const { data, loading, error, refetch } = useReporteTemporada(id, range.from, range.to);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Reporte por Temporada</Typography>
      <ReportToolbar from={range.from} to={range.to} onChange={setRange} onRefresh={refetch} />
      <Divider sx={{ my: 2 }} />
      {!id && <Alert severity="info">Proporcione ?id=&lt;temporadaId&gt; en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && <ReporteTemporadaView data={data} />}
    </Box>
  );
}
