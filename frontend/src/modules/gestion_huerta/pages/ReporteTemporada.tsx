// reportetemporada.tsx
import { useMemo, useCallback, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Divider, Alert, CircularProgress } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/ReporteProduccionViewer';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { useReporteTemporada } from '../hooks/useReporteTemporada';
import { FormatoReporte } from '../types/reportesProduccionTypes';
import { useDispatch } from 'react-redux';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

export default function ReporteTemporada() {
  const { temporadaId } = useParams<{ temporadaId: string }>();
  const id = useMemo(() => Number(temporadaId), [temporadaId]);
  const { data, loading, error, refetch } = useReporteTemporada(id);
  const dispatch = useDispatch();
  const { search } = useLocation();

  const handleExport = useCallback(async (formato: FormatoReporte) => {
    if (!id) return;
    await reportesProduccionService.generarReporteTemporada({ temporada_id: id, formato });
  }, [id]);

  // Breadcrumbs: Huerta seleccionada / Temporada / Reporte de Temporada
  useEffect(() => {
    const qs = new URLSearchParams(search);
    const huertaId = Number(qs.get('huerta_id') || '');
    const huertaName = qs.get('huerta_nombre') || data?.metadata?.infoHuerta?.huerta_nombre || '';
    const añoFromQS = Number(qs.get('año') || '');
    const añoFromData = data?.metadata?.periodo?.inicio
      ? new Date(data.metadata.periodo.inicio).getFullYear()
      : undefined;
    const año = añoFromQS || añoFromData;
    const tipo = (qs.get('tipo') as 'propia' | 'rentada' | null) || undefined;
    const propietario = qs.get('propietario') || data?.metadata?.infoHuerta?.propietario || undefined;

    if (huertaId && año && id) {
      dispatch(setBreadcrumbs(
        breadcrumbRoutes.reporteTemporada(
          huertaId,
          huertaName || `#${huertaId}`,
          año,
          id,
          { tipo, propietario }
        )
      ));
    }
    return () => { dispatch(clearBreadcrumbs()); };
  }, [dispatch, search, id, data?.metadata?.infoHuerta?.huerta_nombre, data?.metadata?.periodo?.inicio]);

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
