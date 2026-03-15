import React, { Suspense, lazy, memo, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fab,
  Grow,
  LinearProgress,
  Stack,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Zoom,
  alpha,
  useMediaQuery,
} from '@mui/material';
import { keyframes, styled, useTheme } from '@mui/material/styles';
import {
  BarChart as BarChartIcon,
  ExpandMore,
  HelpOutline,
  InfoOutlined,
  KeyboardArrowUp,
  Refresh,
  ShowChart,
  TableView,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';
import type { ReporteBodegaData, ReporteBodegaKPI } from '../../types/reportesBodegaTypes';

const ChartsPanel = lazy(() => import('./ReporteBodegaViewerCharts.tsx'));
const TablesPanel = lazy(() => import('./ReporteBodegaViewerTables.tsx'));

type ViewMode = 'charts' | 'tables' | 'both';

interface Props {
  data?: ReporteBodegaData | null;
  loading?: boolean;
  error?: string | null;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

const fadeInScale = keyframes`
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
`;

const MainContainer = styled(Paper)(({ theme }) => ({
  background:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha('#ffffff', 0.98),
  borderRadius: '24px',
  padding: theme.spacing(4),
  margin: theme.spacing(2),
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  border: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
  animation: `${fadeInScale} 0.4s ease-out`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '6px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: '24px 24px 0 0',
    zIndex: 1,
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  background:
    theme.palette.mode === 'dark'
      ? `linear-gradient(145deg, ${alpha(theme.palette.primary.dark, 0.25)} 0%, ${alpha(
          theme.palette.secondary.dark,
          0.25
        )} 100%)`
      : `linear-gradient(145deg, ${alpha(theme.palette.primary.light, 0.15)} 0%, ${alpha(
          theme.palette.secondary.light,
          0.15
        )} 100%)`,
  borderRadius: '20px',
  transition: 'all 0.3s ease-in-out',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  animation: `${fadeInScale} 0.3s ease-out`,
  '&:hover': {
    transform: 'translateY(-6px) scale(1.01)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
    borderColor: alpha(theme.palette.primary.main, 0.3),
  },
}));

const AnimatedGrid = styled(Box)({
  '& > *': {
    animation: 'fadeIn 0.6s ease-out',
    animationFillMode: 'both',
  },
  '@keyframes fadeIn': {
    '0%': { opacity: 0, transform: 'translateY(30px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
});

const SectionTitle = styled(Typography)(({ theme }) => ({
  position: 'relative',
  paddingBottom: theme.spacing(1.5),
  marginBottom: theme.spacing(4),
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '60px',
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: '2px',
  },
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderRadius: '16px',
  background:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.7)
      : alpha(theme.palette.grey[100], 0.8),
  padding: theme.spacing(1),
  marginBottom: theme.spacing(4),
  '& .MuiTab-root': {
    borderRadius: '12px',
    fontWeight: 600,
    textTransform: 'none',
    fontSize: '0.95rem',
    transition: 'all 0.3s ease',
    minHeight: '48px',
    '&.Mui-selected': {
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      color: theme.palette.common.white,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
  },
}));

const FloatingActionButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(3),
  right: theme.spacing(3),
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: 'white',
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
  },
}));

const HeaderInfoBlock = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: theme.spacing(2),
  rowGap: 4,
  padding: theme.spacing(1.5, 2),
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
  background: alpha(theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff', 0.85),
}));

const InfoLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.text.secondary,
  fontSize: 12,
}));

const InfoValue = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  fontSize: 13,
}));

const KPI_COLORS: Record<string, string> = {
  recepciones: '#16a34a',
  cajas_campo: '#d97706',
  cajas_empacadas: '#2563eb',
  cajas_despachadas: '#7c3aed',
  camiones: '#0891b2',
  eficiencia: '#059669',
  gasto_madera: '#b45309',
  gasto_consumibles: '#6366f1',
  gasto_total: '#dc2626',
  semanas: '#6366f1',
};

type KpiKind = 'count' | 'currency' | 'percent';

interface EnrichedKpi {
  id: string;
  label: string;
  valueDisplay: string;
  helper: string;
  chip: string;
  progress: number;
  color: string;
  trend: {
    direction: 'up' | 'down' | 'neutral';
    value?: number;
  };
}

const KPI_LABEL_OVERRIDES: Record<string, string> = {
  recepciones: 'Recepciones activas',
  cajas_campo: 'Cajas recibidas (campo)',
  cajas_empacadas: 'Cajas empacadas',
  cajas_despachadas: 'Cajas despachadas',
  camiones: 'Camiones de salida',
  eficiencia: 'Eficiencia de empaque',
  gasto_madera: 'Gasto en madera',
  gasto_consumibles: 'Gasto en consumibles',
  gasto_total: 'Gasto total operativo',
  semanas: 'Semanas operadas',
};

const KPI_RENDER_ORDER = [
  'semanas',
  'recepciones',
  'cajas_campo',
  'cajas_empacadas',
  'cajas_despachadas',
  'camiones',
  'eficiencia',
  'gasto_madera',
  'gasto_consumibles',
  'gasto_total',
];

const KPICard = memo(function KPICard({
  kpi,
  index,
  prefersReducedMotion,
}: {
  kpi: EnrichedKpi;
  index: number;
  prefersReducedMotion: boolean;
}) {
  const theme = useTheme();
  const trendIcon =
    kpi.trend?.direction === 'up' ? (
      <TrendingUp color="success" sx={{ fontSize: 20 }} />
    ) : kpi.trend?.direction === 'down' ? (
      <TrendingDown color="error" sx={{ fontSize: 20 }} />
    ) : null;

  return (
    <Grow in timeout={prefersReducedMotion ? 0 : 650} style={{ transitionDelay: prefersReducedMotion ? '0ms' : `${index * 70}ms` }}>
      <StyledCard>
        <CardContent sx={{ position: 'relative', p: theme.spacing(3) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                fontSize: '0.9rem',
              }}
            >
              {kpi.label}
            </Typography>
            {trendIcon}
          </Box>

          <Typography
            variant="h3"
            fontWeight="700"
            sx={{
              mb: 1.25,
              color: kpi.color,
              fontSize: { xs: '1.65rem', sm: '1.9rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
            }}
          >
            {kpi.valueDisplay}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
              {kpi.helper}
            </Typography>
            <Chip
              size="small"
              label={kpi.chip}
              sx={{
                height: 22,
                fontWeight: 700,
                bgcolor: alpha(kpi.color, 0.12),
                color: kpi.color,
              }}
            />
          </Box>

          <LinearProgress
            variant="determinate"
            value={kpi.progress}
            sx={{
              height: 6,
              borderRadius: 99,
              backgroundColor: alpha(kpi.color, 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 99,
                backgroundColor: kpi.color,
                transition: prefersReducedMotion ? 'none' : 'transform .7s ease',
              },
            }}
          />
        </CardContent>
      </StyledCard>
    </Grow>
  );
});

function resolveTemporadaLabel(data: ReporteBodegaData): string {
  const temporada = data.metadata?.temporada as Record<string, unknown> | undefined;
  if (!temporada) return '-';

  const direct = temporada.anio ?? temporada.year;
  if (typeof direct === 'number' || typeof direct === 'string') {
    return String(direct);
  }

  const fallback = Object.entries(temporada).find(
    ([key, value]) => key !== 'id' && (typeof value === 'number' || typeof value === 'string')
  );
  return fallback ? String(fallback[1]) : '-';
}

function toNumber(value: number | string | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value);
}

function buildKpiNumericMap(kpis?: ReporteBodegaKPI[]): Record<string, number> {
  const map: Record<string, number> = {};
  if (!Array.isArray(kpis)) return map;

  for (const kpi of kpis) {
    const id = String(kpi?.id || '').trim();
    if (!id) continue;
    map[id] = toNumber(kpi.value);
  }
  return map;
}

function hasMetricSource(
  totals: Record<string, number | string> | undefined,
  kpiValues: Record<string, number>,
  key: string
): boolean {
  if (totals && Object.prototype.hasOwnProperty.call(totals, key)) return true;
  return Object.prototype.hasOwnProperty.call(kpiValues, key);
}

function readMetric(
  totals: Record<string, number | string> | undefined,
  kpiValues: Record<string, number>,
  key: string,
  fallback = 0
): number {
  if (totals && Object.prototype.hasOwnProperty.call(totals, key)) {
    return toNumber(totals[key]);
  }
  if (Object.prototype.hasOwnProperty.call(kpiValues, key)) {
    return kpiValues[key];
  }
  return fallback;
}

export default function ReporteBodegaViewer({
  data,
  loading = false,
  error,
  title,
  subtitle,
  onRefresh,
}: Props) {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const kpiNumericMap = useMemo(() => buildKpiNumericMap(data?.kpis), [data?.kpis]);

  const headerRows = useMemo(() => {
    if (!data) return [] as Array<[string, string]>;

    const rows: Array<[string, string]> = [
      ['Bodega:', data.metadata?.bodega?.nombre || 'General'],
      ['Temporada:', resolveTemporadaLabel(data)],
      ['Reporte:', data.metadata?.tipo || 'bodega'],
    ];

    if (data.rango?.iso) {
      rows.push(['Semana ISO:', data.rango.iso]);
    }

    if (data.rango?.desde && data.rango?.hasta) {
      rows.push(['Periodo:', `${data.rango.desde} - ${data.rango.hasta}`]);
    }

    if (data.metadata?.fecha_generacion) {
      rows.push(['Generado:', data.metadata.fecha_generacion]);
    }

    return rows;
  }, [data]);

  const derived = useMemo(() => {
    const totals = data?.totales;
    const cajasCampo = readMetric(totals, kpiNumericMap, 'cajas_campo');
    const cajasEmpacadas = readMetric(totals, kpiNumericMap, 'cajas_empacadas');
    const cajasDespachadas = readMetric(totals, kpiNumericMap, 'cajas_despachadas');
    const gastoMadera = readMetric(totals, kpiNumericMap, 'gasto_madera');
    const gastoConsumibles = readMetric(totals, kpiNumericMap, 'gasto_consumibles');
    const gastoTotal = hasMetricSource(totals, kpiNumericMap, 'gasto_total')
      ? readMetric(totals, kpiNumericMap, 'gasto_total')
      : gastoMadera + gastoConsumibles;

    const eficienciaCalc = cajasCampo > 0 ? (cajasEmpacadas / cajasCampo) * 100 : 0;
    const eficienciaFromPayload = hasMetricSource(totals, kpiNumericMap, 'eficiencia_empaque')
      ? readMetric(totals, kpiNumericMap, 'eficiencia_empaque')
      : readMetric(totals, kpiNumericMap, 'eficiencia', Number.NaN);
    const eficiencia = Number.isFinite(eficienciaFromPayload) ? eficienciaFromPayload : eficienciaCalc;
    const despachoVsEmpaque = cajasEmpacadas > 0 ? (cajasDespachadas / cajasEmpacadas) * 100 : 0;
    const costoPorCajaEmpacada = cajasEmpacadas > 0 ? gastoTotal / cajasEmpacadas : 0;

    return {
      cajasCampo,
      cajasEmpacadas,
      cajasDespachadas,
      gastoTotal,
      eficiencia,
      eficienciaCalc,
      despachoVsEmpaque,
      costoPorCajaEmpacada,
    };
  }, [data?.totales, kpiNumericMap]);

  const normalizedKpis = useMemo<EnrichedKpi[]>(() => {
    if (!data) return [];

    const totals = data.totales;
    const recepciones = readMetric(totals, kpiNumericMap, 'recepciones');
    const cajasCampo = readMetric(totals, kpiNumericMap, 'cajas_campo');
    const cajasEmpacadas = readMetric(totals, kpiNumericMap, 'cajas_empacadas');
    const cajasDespachadas = readMetric(totals, kpiNumericMap, 'cajas_despachadas');
    const camiones = readMetric(totals, kpiNumericMap, 'camiones');
    const semanas = readMetric(totals, kpiNumericMap, 'semanas');
    const gastoMadera = readMetric(totals, kpiNumericMap, 'gasto_madera');
    const gastoConsumibles = readMetric(totals, kpiNumericMap, 'gasto_consumibles');
    const gastoTotal = derived.gastoTotal;

    const kindFor = (id: string, label: string): KpiKind => {
      if (id.includes('gasto') || /gasto|monto|costo|total/i.test(label)) return 'currency';
      if (id === 'eficiencia' || /eficiencia|%/i.test(label)) return 'percent';
      return 'count';
    };

    const referenceFor = (id: string, kind: KpiKind): number => {
      if (kind === 'percent') return 100;
      if (kind === 'currency') return Math.max(gastoTotal, gastoMadera, gastoConsumibles, 1);
      switch (id) {
        case 'cajas_empacadas':
          return Math.max(cajasCampo, 1);
        case 'cajas_despachadas':
          return Math.max(cajasEmpacadas, 1);
        case 'camiones':
          return Math.max(Math.ceil(cajasDespachadas / 120), 1);
        case 'semanas':
          return Math.max(semanas, 1);
        default:
          return Math.max(cajasCampo, cajasEmpacadas, cajasDespachadas, camiones, semanas, 1);
      }
    };

    const helperFor = (id: string): string => {
      switch (id) {
        case 'recepciones':
          return `${formatCount(cajasCampo)} cajas recibidas en el periodo`;
        case 'cajas_campo':
          return 'Base de entrada para empaque';
        case 'cajas_empacadas':
          return `${formatPercent(derived.eficienciaCalc)} vs cajas de campo`;
        case 'cajas_despachadas':
          return `${formatPercent(derived.despachoVsEmpaque)} del empaque ya despachado`;
        case 'camiones':
          return camiones > 0
            ? `${formatCount(Math.round(cajasDespachadas / Math.max(camiones, 1)))} cajas por camion (prom.)`
            : 'Sin despachos confirmados';
        case 'eficiencia':
          return 'Conversion neta de campo a empaque';
        case 'gasto_madera':
          return gastoTotal > 0 ? `${formatPercent((gastoMadera / gastoTotal) * 100)} del gasto operativo` : 'Sin gasto acumulado';
        case 'gasto_consumibles':
          return gastoTotal > 0 ? `${formatPercent((gastoConsumibles / gastoTotal) * 100)} del gasto operativo` : 'Sin gasto acumulado';
        case 'gasto_total':
          return `${formatCurrency(derived.costoPorCajaEmpacada)} por caja empacada`;
        case 'semanas':
          return 'Semanas cerradas en la temporada';
        default:
          return 'Indicador operativo del periodo seleccionado';
      }
    };

    const chipFor = (kind: KpiKind): string => {
      if (kind === 'currency') return 'MXN';
      if (kind === 'percent') return 'Eficiencia';
      return 'Operacion';
    };

    const calcTrend = (id: string, currentValue: number): { direction: 'up' | 'down' | 'neutral'; value?: number } => {
      if (id === 'eficiencia') {
        if (currentValue >= 90) return { direction: 'up', value: currentValue };
        if (currentValue < 75) return { direction: 'down', value: currentValue };
        return { direction: 'neutral', value: currentValue };
      }
      if (id.startsWith('gasto_')) {
        if (currentValue > 0 && id !== 'gasto_total') return { direction: 'up' };
        return { direction: 'neutral' };
      }
      if (currentValue > 0) return { direction: 'up' };
      return { direction: 'neutral' };
    };

    const rawKpisById = new Map<string, ReporteBodegaKPI>();
    for (const kpi of data.kpis || []) {
      const id = String(kpi?.id || '').trim();
      if (!id || rawKpisById.has(id)) continue;
      rawKpisById.set(id, kpi);
    }

    const hasSourceForId = (id: string): boolean => {
      if (rawKpisById.has(id)) return true;
      switch (id) {
        case 'eficiencia':
          return (
            hasMetricSource(totals, kpiNumericMap, 'eficiencia_empaque') ||
            hasMetricSource(totals, kpiNumericMap, 'eficiencia') ||
            derived.cajasCampo > 0 ||
            derived.cajasEmpacadas > 0
          );
        case 'gasto_total':
          return (
            hasMetricSource(totals, kpiNumericMap, 'gasto_total') ||
            hasMetricSource(totals, kpiNumericMap, 'gasto_madera') ||
            hasMetricSource(totals, kpiNumericMap, 'gasto_consumibles')
          );
        default:
          return hasMetricSource(totals, kpiNumericMap, id);
      }
    };

    const valueForSynthetic = (id: string): number => {
      switch (id) {
        case 'semanas':
          return semanas;
        case 'recepciones':
          return recepciones;
        case 'cajas_campo':
          return cajasCampo;
        case 'cajas_empacadas':
          return cajasEmpacadas;
        case 'cajas_despachadas':
          return cajasDespachadas;
        case 'camiones':
          return camiones;
        case 'eficiencia':
          return derived.eficiencia;
        case 'gasto_madera':
          return gastoMadera;
        case 'gasto_consumibles':
          return gastoConsumibles;
        case 'gasto_total':
          return gastoTotal;
        default:
          return readMetric(totals, kpiNumericMap, id);
      }
    };

    const orderedIds = [
      ...KPI_RENDER_ORDER.filter((id) => hasSourceForId(id)),
      ...Array.from(rawKpisById.keys()).filter((id) => !KPI_RENDER_ORDER.includes(id)),
    ];

    return orderedIds.map((id) => {
      const sourceKpi = rawKpisById.get(id);
      const sourceLabel = String(sourceKpi?.label || '').trim();
      const kind = kindFor(id, sourceLabel);
      const valueNumber = sourceKpi ? toNumber(sourceKpi.value) : valueForSynthetic(id);
      const valueDisplay =
        kind === 'currency'
          ? formatCurrency(valueNumber)
          : kind === 'percent'
          ? formatPercent(valueNumber)
          : formatCount(valueNumber);

      const reference = referenceFor(id, kind);
      const progress = Math.max(0, Math.min(100, (valueNumber / Math.max(reference, 1)) * 100));

      return {
        id,
        label: KPI_LABEL_OVERRIDES[id] || sourceLabel || id,
        valueDisplay,
        helper: helperFor(id),
        chip: chipFor(kind),
        progress,
        color: KPI_COLORS[id] || theme.palette.primary.main,
        trend: sourceKpi?.trend || calcTrend(id, valueNumber),
      } satisfies EnrichedKpi;
    });
  }, [data, derived, kpiNumericMap, theme.palette.primary.main]);

  if (loading) {
    return (
      <MainContainer>
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Cargando reporte de bodega...
          </Typography>
        </Box>
      </MainContainer>
    );
  }

  if (error) {
    return (
      <MainContainer>
        <Box sx={{ p: 3 }}>
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 3,
              background: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
              '& .MuiAlert-icon': { color: theme.palette.error.main },
            }}
            action={
              onRefresh ? (
                <Tooltip title="Reintentar">
                  <IconButton color="inherit" size="small" onClick={onRefresh}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
              ) : undefined
            }
          >
            {error}
          </Alert>
        </Box>
      </MainContainer>
    );
  }

  if (!data) {
    return (
      <MainContainer>
        <Box sx={{ p: 3 }}>
          <Alert
            severity="info"
            sx={{
              borderRadius: 3,
              background: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.main,
              '& .MuiAlert-icon': { color: theme.palette.info.main },
            }}
          >
            No hay datos disponibles para mostrar.
          </Alert>
        </Box>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 4,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="800" color="primary">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {subtitle}
            </Typography>
          ) : null}

          <HeaderInfoBlock>
            {headerRows.map(([label, value], index) => (
              <React.Fragment key={`${label}-${index}`}>
                <InfoLabel>{label}</InfoLabel>
                <InfoValue>{value}</InfoValue>
              </React.Fragment>
            ))}
          </HeaderInfoBlock>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Tooltip title="Ver guia operativa de calculos">
              <span>
                <Button
                  size="small"
                  startIcon={<HelpOutline />}
                  onClick={() => {
                    const el = document.getElementById('bodega-guia-metricas');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  sx={(t) => ({
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    color: t.palette.primary.main,
                  })}
                >
                  Guia de calculo
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Ver como leer los indicadores de eficiencia y gasto">
              <span>
                <Button
                  size="small"
                  startIcon={<InfoOutlined />}
                  onClick={() => {
                    const el = document.getElementById('bodega-kpis');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  sx={(t) => ({
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    color: t.palette.secondary.main,
                  })}
                >
                  Ver KPIs
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      <StyledTabs value={viewMode} onChange={(_, value) => setViewMode(value)} centered variant="fullWidth">
        <Tab icon={<ShowChart />} iconPosition="start" label="Graficas" value="charts" />
        <Tab icon={<TableView />} iconPosition="start" label="Tablas" value="tables" />
        <Tab icon={<BarChartIcon />} iconPosition="start" label="Completo" value="both" />
      </StyledTabs>

      {(viewMode === 'charts' || viewMode === 'both') && normalizedKpis.length ? (
        <Box sx={{ mb: 6 }}>
          <SectionTitle id="bodega-kpis" variant="h4" fontWeight="700">
            Indicadores clave
          </SectionTitle>

          <Box id="bodega-guia-metricas" sx={{ mb: 3 }}>
            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>Como interpretar el reporte semanal/temporada</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Eficiencia de empaque</strong> = Cajas empacadas / Cajas de campo ={' '}
                    {derived.cajasEmpacadas.toLocaleString()} / {derived.cajasCampo.toLocaleString()} ={' '}
                    <strong>{formatPercent(derived.eficienciaCalc)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Despacho sobre empaque</strong> = Cajas despachadas / Cajas empacadas ={' '}
                    {derived.cajasDespachadas.toLocaleString()} / {derived.cajasEmpacadas.toLocaleString()} ={' '}
                    <strong>{formatPercent(derived.despachoVsEmpaque)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Costo por caja empacada</strong> = Gasto total / Cajas empacadas = {formatCurrency(derived.gastoTotal)} /{' '}
                    {derived.cajasEmpacadas.toLocaleString()} = <strong>{formatCurrency(derived.costoPorCajaEmpacada)}</strong>
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>

          <AnimatedGrid
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {normalizedKpis.map((kpi, index) => (
              <Box key={`${kpi.id}-${index}`}>
                <KPICard kpi={kpi} index={index} prefersReducedMotion={prefersReducedMotion} />
              </Box>
            ))}
          </AnimatedGrid>
        </Box>
      ) : null}

      {(viewMode === 'charts' || viewMode === 'both') && (
        <Suspense fallback={<CircularProgress size={24} />}>
          <ChartsPanel series={data.series} />
        </Suspense>
      )}

      {(viewMode === 'tables' || viewMode === 'both') && (
        <Box>
          <SectionTitle variant="h4" fontWeight="700">
            Detalles tabulares
          </SectionTitle>
          <Suspense fallback={<CircularProgress size={24} />}>
            <TablesPanel tablas={data.tablas} />
          </Suspense>
        </Box>
      )}

      <Zoom in>
        <FloatingActionButton aria-label="Volver arriba" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <KeyboardArrowUp />
        </FloatingActionButton>
      </Zoom>
    </MainContainer>
  );
}
