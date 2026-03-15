import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Tab, Tabs, Typography, alpha, useTheme } from '@mui/material';
import { AnimatePresence, m } from 'framer-motion';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReporteBodegaViewer from './ReporteBodegaViewer';
import ReportesToolbar, { type ReporteExportFormat } from './ReportesToolbar';
import { useReportesBodega } from '../../hooks/useReportesBodega';
import reportesBodegaService from '../../services/reportesBodegaService';
import { useAuth } from '../../../gestion_usuarios/context/AuthContext';

type ReportTab = 'SEMANAL' | 'TEMPORADA';

interface Props {
  bodegaId?: number;
  temporadaId?: number;
  semanaIso?: string;
  fechaDesde?: string;
}

const panelVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.18, ease: 'easeIn' } },
};

function currentIsoWeekCode(): string {
  const now = new Date();
  return isoWeekCodeFromDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function isoWeekCodeFromDate(year: number, month: number, day: number): string {
  const utc = new Date(Date.UTC(year, month - 1, day));
  const isoDay = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - isoDay);

  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((utc.getTime() - yearStart.getTime()) / 86400000) + 1;
  const week = Math.ceil(diffDays / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function isoWeekCodeFromDateString(value?: string): string | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  return isoWeekCodeFromDate(year, month, day);
}

const ReportesTabs: React.FC<Props> = ({ bodegaId, temporadaId, semanaIso, fechaDesde }) => {
  const theme = useTheme();
  const { hasPerm } = useAuth();
  const [tab, setTab] = useState<ReportTab>('SEMANAL');
  const [exportError, setExportError] = useState<string | null>(null);

  const { semanalData, temporadaData, isLoading, error, fetchSemanal, fetchTemporada, clearError } = useReportesBodega();

  const effectiveIsoSemana = useMemo(() => {
    if (semanaIso && semanaIso !== 'MANUAL') return semanaIso;
    const selectedWeekIso = isoWeekCodeFromDateString(fechaDesde);
    if (selectedWeekIso) return selectedWeekIso;
    return currentIsoWeekCode();
  }, [semanaIso, fechaDesde]);

  const handleRefresh = useCallback(() => {
    setExportError(null);
    clearError();

    if (!bodegaId || !temporadaId) return;

    if (tab === 'SEMANAL') {
      fetchSemanal({
        bodega: bodegaId,
        temporada: temporadaId,
        iso_semana: effectiveIsoSemana,
      });
      return;
    }

    fetchTemporada({ bodega: bodegaId, temporada: temporadaId });
  }, [
    bodegaId,
    temporadaId,
    tab,
    effectiveIsoSemana,
    fetchSemanal,
    fetchTemporada,
    clearError,
  ]);

  useEffect(() => {
    if (!bodegaId || !temporadaId) return;
    handleRefresh();
  }, [bodegaId, temporadaId, effectiveIsoSemana, tab, handleRefresh]);

  const handleExport = useCallback(
    async (formato: ReporteExportFormat) => {
      setExportError(null);
      if (!bodegaId || !temporadaId) return;

      if (tab === 'SEMANAL') {
        const response = await reportesBodegaService.generarReporteSemanal({
          bodega: bodegaId,
          temporada: temporadaId,
          iso_semana: effectiveIsoSemana,
          formato,
        });
        if (!response.success) {
          setExportError(response.message || 'No se pudo exportar el reporte semanal');
        }
        return;
      }

      const response = await reportesBodegaService.generarReporteTemporada({
        bodega: bodegaId,
        temporada: temporadaId,
        formato,
      });
      if (!response.success) {
        setExportError(response.message || 'No se pudo exportar el reporte de temporada');
      }
    },
    [bodegaId, temporadaId, tab, effectiveIsoSemana]
  );

  const subtitle =
    tab === 'SEMANAL'
      ? `Analisis de semana ${effectiveIsoSemana}`
      : 'Consolidado acumulado de la temporada';

  const canExportPdf = hasPerm('exportpdf_cierresemanal');
  const canExportExcel = hasPerm('exportexcel_cierresemanal');

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
          Reportes de bodega
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500} mt={0.25}>
          Flujo equivalente a reportes de gestion huerta, adaptado a semana y temporada de bodega
        </Typography>
      </Box>

      <ReportesToolbar
        loading={isLoading}
        onRefresh={handleRefresh}
        onExport={handleExport}
        showExportButtons={Boolean(bodegaId && temporadaId)}
        canExportPdf={canExportPdf}
        canExportExcel={canExportExcel}
        pdfTooltip="No tienes permiso para exportar reportes a PDF"
        excelTooltip="No tienes permiso para exportar reportes a Excel"
      />

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value as ReportTab)}
        TabIndicatorProps={{
          style: {
            height: 3,
            borderRadius: '3px 3px 0 0',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
          },
        }}
        sx={{
          mt: 2,
          mb: 3,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          minHeight: 48,
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: theme.palette.text.secondary,
            px: 3,
            gap: 1,
            borderRadius: '12px 12px 0 0',
            transition: 'all 0.3s ease',
            '&.Mui-selected': {
              color: theme.palette.primary.main,
              fontWeight: 800,
              background: alpha(theme.palette.primary.main, 0.04),
            },
          },
        }}
      >
        <Tab value="SEMANAL" label="Reporte semanal" icon={<CalendarTodayIcon fontSize="small" />} iconPosition="start" />
        <Tab value="TEMPORADA" label="Reporte temporada" icon={<TrendingUpIcon fontSize="small" />} iconPosition="start" />
      </Tabs>

      <AnimatePresence mode="wait" initial={false}>
        <Box
          key={tab}
          component={m.div}
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <ReporteBodegaViewer
            data={tab === 'SEMANAL' ? semanalData : temporadaData}
            title={tab === 'SEMANAL' ? 'Reporte semanal' : 'Reporte de temporada'}
            subtitle={subtitle}
            loading={isLoading}
            error={exportError || error}
            onRefresh={handleRefresh}
          />
        </Box>
      </AnimatePresence>
    </Box>
  );
};

export default ReportesTabs;
