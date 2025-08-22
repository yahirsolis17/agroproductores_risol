// frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Divider, Alert, CircularProgress } from '@mui/material';
import ReportToolbar from '../components/reportes/common/ReportToolbar';
import ReporteCosechaView from '../components/reportes/cosecha/ReporteCosechaView';
import { useReporteCosecha } from '../hooks/useReporteCosecha';

export default function ReporteCosecha() {
  const [params] = useSearchParams();
  const id = useMemo(() => Number(params.get('id') || ''), [params]);

  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const { data, loading, error, refetch } = useReporteCosecha(id, range.from, range.to);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Reporte por Cosecha</Typography>
      <ReportToolbar from={range.from} to={range.to} onChange={setRange} onRefresh={refetch} />
      <Divider sx={{ my: 2 }} />
      {!id && <Alert severity="info">Proporcione ?id=&lt;cosechaId&gt; en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && <ReporteCosechaView data={data} />}
    </Box>
  );
}
