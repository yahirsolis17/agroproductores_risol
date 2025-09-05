// reportecosecha.tsx
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Divider, Alert, CircularProgress, Typography } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/ReporteProduccionViewer';
import { useReporteCosecha } from '../hooks/useReporteCosecha';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { FormatoReporte } from '../types/reportesProduccionTypes';
import { useDispatch } from 'react-redux';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

export default function ReporteCosecha() {
  const { cosechaId } = useParams<{ cosechaId: string }>();
  const id = useMemo(() => Number(cosechaId), [cosechaId]);
  const { search } = useLocation();

  const [filters] = useState<{ from?: string; to?: string; formato: FormatoReporte }>({ formato: 'json' });
  const { data, loading, error, refetch } = useReporteCosecha(id, filters.from, filters.to);
  const dispatch = useDispatch();

  const handleExport = useCallback(async (formato: FormatoReporte) => {
    if (!id) return;
    await reportesProduccionService.generarReporteCosecha({ cosecha_id: id, formato });
  }, [id]);

  // Breadcrumbs: Huerta seleccionada / Temporada / Cosechas / Reporte de Cosecha
  useEffect(() => {
    const qs = new URLSearchParams(search);
    const huertaId = Number(qs.get('huerta_id') || '');
    const temporadaId = Number(qs.get('temporada_id') || '');
    const huertaName = qs.get('huerta_nombre') || data?.metadata?.infoHuerta?.huerta_nombre || '';
    const cosechaNombre = qs.get('cosecha_nombre') || data?.metadata?.infoHuerta?.cosecha_nombre || undefined;
    const añoFromQS = Number(qs.get('año') || '');
    const añoFromData = data?.metadata?.periodo?.inicio
      ? new Date(data.metadata.periodo.inicio).getFullYear()
      : undefined;
    const año = añoFromQS || añoFromData;
    const tipo = (qs.get('tipo') as 'propia' | 'rentada' | null) || undefined;
    const propietario = qs.get('propietario') || data?.metadata?.infoHuerta?.propietario || undefined;

    if (huertaId && temporadaId && id && año) {
      dispatch(setBreadcrumbs(
        breadcrumbRoutes.reporteCosecha(
          huertaId,
          huertaName || `#${huertaId}`,
          año,
          temporadaId,
          id,
          { tipo, propietario, cosechaNombre }
        )
      ));
    }
    return () => { dispatch(clearBreadcrumbs()); };
  }, [dispatch, search, id, data?.metadata?.infoHuerta?.huerta_nombre, data?.metadata?.periodo?.inicio]);

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
