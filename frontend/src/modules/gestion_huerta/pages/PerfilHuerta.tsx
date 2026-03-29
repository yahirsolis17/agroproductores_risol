import { useMemo, useCallback, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Box, Divider, Alert, CircularProgress } from '@mui/material';
import ReportesProduccionToolbar from '../components/reportes/ReportesProduccionToolbar';
import ReporteProduccionViewer from '../components/reportes/ReporteProduccionViewer';
import { reportesProduccionService } from '../services/reportesProduccionService';
import { useReportePerfilHuerta } from '../hooks/useReportePerfilHuerta';
import { FormatoReporte } from '../types/reportesProduccionTypes';
import { useDispatch } from 'react-redux';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

function useURLSearchParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ReportePerfilHuerta() {
  const { huertaId: huertaIdParam } = useParams<{ huertaId: string }>();
  const query = useURLSearchParams();
  const isRentada = query.get('rentada') === '1';
  const años = Number(query.get('años') || query.get('anios') || '5');

  const huertaId = !isRentada ? Number(huertaIdParam) : undefined;
  const huertaRentadaId = isRentada ? Number(huertaIdParam) : undefined;

  const { data, loading, error, refetch } = useReportePerfilHuerta(huertaId, huertaRentadaId, años);
  const dispatch = useDispatch();

  const handleExport = useCallback(async (formato: FormatoReporte) => {
    await reportesProduccionService.generarReportePerfilHuerta({
      formato,
      huerta_id: huertaId,
      huerta_rentada_id: huertaRentadaId,
      años,
      force_refresh: true,
    });
  }, [huertaId, huertaRentadaId, años]);

  useEffect(() => {
    const id = Number(huertaIdParam);
    const nameFromQS = query.get('huerta_nombre') || undefined;
    const nameFromData = data?.metadata?.infoHuerta?.huerta_nombre || undefined;
    const huertaName = nameFromQS || nameFromData || (id ? `#${id}` : 'Huerta');

    if (id) {
      dispatch(setBreadcrumbs(breadcrumbRoutes.reporteHuertaPerfil(id, huertaName)));
    }
    return () => {
      dispatch(clearBreadcrumbs());
    };
  }, [dispatch, huertaIdParam, query, data?.metadata?.infoHuerta?.huerta_nombre]);

  return (
    <Box sx={{ p: 2 }}>
      <ReportesProduccionToolbar
        loading={loading}
        onRefresh={refetch}
        onExport={handleExport}
        permExportPdf={['exportpdf_huerta', 'exportpdf_huertarentada']}
        permExportExcel={['exportexcel_huerta', 'exportexcel_huertarentada']}
      />

      <Divider sx={{ my: 2 }} />
      {!huertaIdParam && <Alert severity="info">Proporcione un id de huerta en la URL.</Alert>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <ReporteProduccionViewer
          data={data}
          title="Perfil de Huerta"
          subtitle={data.metadata?.infoHuerta?.huerta_nombre}
          onRefresh={refetch}
        />
      )}
    </Box>
  );
}
