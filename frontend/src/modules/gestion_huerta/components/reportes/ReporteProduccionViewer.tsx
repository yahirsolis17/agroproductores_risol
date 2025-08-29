// frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx
import React, { useState, Suspense, lazy } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  alpha,
  CircularProgress,
  Fab,
  Zoom,
  Card,
  CardContent,
  Grow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Stack,
} from '@mui/material';
import { useTheme, styled, keyframes } from '@mui/material/styles';
import {
  ReporteProduccionData,
  KPIData,
} from '../../types/reportesProduccionTypes';
import { formatCurrency, formatNumber } from '../../../../global/utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  TableView,
  BarChart as BarChartIcon,
  Refresh,
  KeyboardArrowUp,
  ExpandMore,
  InfoOutlined,
  HelpOutline,
} from '@mui/icons-material';

// Paneles (lazy) para reducir carga inicial y mejorar fluidez
const ChartsPanel = lazy(() => import('./ReporteProduccionViewerCharts'));
const TablesPanel = lazy(() => import('./ReporteProduccionViewerTables'));

// Componentes auxiliares
import DesgloseGananciaCard from './common/DesgloseGananciaCard';
import GlosarioFinanzasModal from './common/GlosarioFinanzasModal';

// --------------------------
// Animaciones y estilos
// --------------------------

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

// Bloque compacto de información de cabecera (no invasivo)
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

interface Props {
  data?: ReporteProduccionData;
  loading?: boolean;
  error?: string;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

type ViewMode = 'charts' | 'tables' | 'both';

const KPICard: React.FC<{ kpi: KPIData; index: number }> = ({ kpi, index }) => {
  const theme = useTheme();

  const trendIcon =
    kpi.trend?.direction === 'up' ? (
      <TrendingUp color="success" sx={{ fontSize: 20 }} />
    ) : kpi.trend?.direction === 'down' ? (
      <TrendingDown color="error" sx={{ fontSize: 20 }} />
    ) : null;

  const isProductividad = /productividad/i.test(kpi.label);
  const isGanancia = /ganancia/i.test(kpi.label);
  const numericValue = typeof kpi.value === 'number' ? kpi.value : NaN;
  const kpiColor =
    isGanancia && !Number.isNaN(numericValue)
      ? numericValue < 0
        ? theme.palette.error.main
        : theme.palette.success.main
      : theme.palette.primary.main;

  return (
    <Grow in timeout={800} style={{ transitionDelay: `${index * 100}ms` }}>
      <StyledCard>
        <CardContent sx={{ position: 'relative', p: theme.spacing(3) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {kpi.label}
              {isProductividad && (
                <Tooltip title="Cajas por hectárea (cajas/ha). Ayuda a comparar productividad entre huertas de distinto tamaño.">
                  <InfoOutlined sx={{ fontSize: 18, color: theme.palette.info.main }} />
                </Tooltip>
              )}
            </Typography>
            {trendIcon}
          </Box>

          <Typography variant="h3" fontWeight="700" sx={{ mb: 2, color: kpiColor }}>
            {kpi.format === 'currency' && typeof kpi.value === 'number'
              ? formatCurrency(kpi.value)
              : kpi.format === 'percentage' && typeof kpi.value === 'number'
              ? `${formatNumber(kpi.value)}%`
              : typeof kpi.value === 'number'
              ? formatNumber(kpi.value)
              : kpi.value}
          </Typography>
        </CardContent>
      </StyledCard>
    </Grow>
  );
};

export default function ReporteProduccionViewer({
  data,
  loading = false,
  error,
  title,
  subtitle,
  onRefresh,
}: Props) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [glosarioOpen, setGlosarioOpen] = useState(false);

  if (loading) {
    return (
      <MainContainer>
        <Box
          sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}
        >
          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Cargando reporte de producción...
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
              onRefresh && (
                <IconButton color="inherit" size="small" onClick={onRefresh}>
                  <Refresh />
                </IconButton>
              )
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

  // Helpers para el panel explicativo (se calculan en el Viewer, sin tocar el hook)
  const getKpiVal = (re: RegExp) =>
    Number(data.kpis?.find(k => re.test(k.label))?.value ?? 0);
  const inversionTotal = getKpiVal(/invers/i);
  const ventasTotales  = getKpiVal(/venta[s]? total/i);
  const gastosVenta    = getKpiVal(/gastos?.*venta/i);
  const ventasNetas    = ventasTotales - (Number.isFinite(gastosVenta) ? gastosVenta : 0);
  const gananciaNetaKpi = getKpiVal(/ganancia\s*neta/i);
  const gananciaNetaCalc = ventasNetas - inversionTotal;
  const roiKpi = getKpiVal(/\broi\b|roi\s*temporada/i);
  const roiCalc = inversionTotal ? (gananciaNetaCalc / inversionTotal) * 100 : 0;

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
          <Typography variant="h2" component="h1" gutterBottom fontWeight="800" color="primary">
            {title}
          </Typography>
        {subtitle && (
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {subtitle}
          </Typography>
        )}

        {/* Cabecera compacta de datos de huerta (no invasiva) */}
        {!!data?.metadata?.infoHuerta && (
          <HeaderInfoBlock>
            {(() => {
              const info = data.metadata.infoHuerta as any;
              const tipo = data.metadata?.entidad?.tipo;
              const formatHa = (n?: number | string) => {
                const v = typeof n === 'number' ? n : Number(n ?? 0);
                return Number.isFinite(v) ? `${v.toFixed(2)} ha` : '';
              };
              const periodo = (() => {
                const fi = info.fecha_inicio || data.metadata?.periodo?.inicio || '';
                const ff = info.fecha_fin || data.metadata?.periodo?.fin || '';
                return `${fi || ''} - ${ff || ''}`.trim();
              })();
              const temporada = (info.temporada_año ?? info['temporada_a��o'] ?? '') as any;
              const rows: Array<[string, string]> = [
                ['Huerta:', `${info.huerta_nombre || ''} (${info.huerta_tipo || ''})`],
                ['Ubicación:', info.ubicacion || ''],
                ['Propietario:', info.propietario || ''],
                ['Temporada:', String(temporada || '')],
              ];
              if (tipo === 'cosecha') rows.push(['Cosecha:', info.cosecha_nombre || '']);
              rows.push(['Período:', periodo]);
              rows.push(['Hectáreas:', formatHa(info.hectareas)]);
              return rows.map(([k, v], idx) => (
                <React.Fragment key={`${k}-${idx}`}>
                  <InfoLabel>{k}</InfoLabel>
                  <InfoValue>{v}</InfoValue>
                </React.Fragment>
              ));
            })()}
          </HeaderInfoBlock>
        )}
          {/* Accesos rápidos de ayuda */}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Tooltip title="Ver glosario financiero">
              <span>
                <Button
                  size="small"
                  startIcon={<HelpOutline />}
                  onClick={() => setGlosarioOpen(true)}
                  sx={(t)=>({
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    color: t.palette.primary.main
                  })}
                >
                  Glosario
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="¿Cómo se calculan las cifras? Abre el desglose de ganancia.">
              <span>
                <Button
                  size="small"
                  startIcon={<InfoOutlined />}
                  onClick={() => {
                    const el = document.getElementById('ganancia-desglose');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  sx={(t)=>({
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    color: t.palette.secondary.main
                  })}
                >
                  Ver desglose
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
        </Box>
      </Box>

      <StyledTabs value={viewMode} onChange={(_, v) => setViewMode(v)} centered variant="fullWidth">
        <Tab icon={<ShowChart />} iconPosition="start" label="Gráficas" value="charts" />
        <Tab icon={<TableView />} iconPosition="start" label="Tablas" value="tables" />
        <Tab icon={<BarChartIcon />} iconPosition="start" label="Completo" value="both" />
      </StyledTabs>

      {(viewMode === 'charts' || viewMode === 'both') && data.kpis?.length ? (
        <Box sx={{ mb: 6 }}>
          <SectionTitle variant="h4" fontWeight="700">
            Indicadores Clave
          </SectionTitle>

          {/* Card didáctica: Desglose de Ganancia */}
          <Box id="ganancia-desglose" sx={{ mb: 3 }}>
          <DesgloseGananciaCard
            title="Cómo se obtiene tu ganancia"
            subtitle={subtitle}
            ventasTotales={ventasTotales}
            gastosVenta={gastosVenta}
            inversionTotal={inversionTotal}
            ventasNetas={ventasNetas}
            gananciaNetaCalculada={gananciaNetaCalc}
            gananciaNetaKpi={Number.isFinite(gananciaNetaKpi) ? gananciaNetaKpi : undefined}
            roiCalculado={roiCalc}
            roiKpi={Number.isFinite(roiKpi) ? roiKpi : undefined}
            onOpenGlosario={() => setGlosarioOpen(true)}
          />

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
            {data.kpis.map((kpi, i) => (
              <Box key={`${kpi.label}-${i}`}>
                <KPICard kpi={kpi} index={i} />
              </Box>
            ))}
          </AnimatedGrid>

          {/* Leyenda/indicadores de color para coincidir con ChartsPanel */}
          <Box
            sx={{
              mt: 3,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
            }}
          >
          </Box>

          {/* Panel explicativo adicional */}
          <Box sx={{ mt: 2 }}>
            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>¿Cómo se calculan?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Ventas netas</strong> = Ventas totales − Gastos de venta = {formatCurrency(ventasTotales)} − {formatCurrency(gastosVenta)} = <strong>{formatCurrency(ventasNetas)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Ganancia neta</strong> = Ventas netas − Inversión total = {formatCurrency(ventasNetas)} − {formatCurrency(inversionTotal)} = <strong>{formatCurrency(gananciaNetaCalc)}</strong>
                    {Number.isFinite(gananciaNetaKpi) && (
                      <Typography component="span" variant="body2" color="text.secondary"> &nbsp;(KPI informado: {formatCurrency(gananciaNetaKpi)})</Typography>
                    )}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ROI</strong> = (Ganancia neta / Inversión total) × 100 = {formatCurrency(gananciaNetaCalc)} / {formatCurrency(inversionTotal)} × 100 =&nbsp;
                    <strong>{formatNumber(roiCalc)}</strong>%
                    {Number.isFinite(roiKpi) && (
                      <Typography component="span" variant="body2" color="text.secondary"> &nbsp;(KPI informado: {formatNumber(roiKpi)}%)</Typography>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Productividad</strong> = Cajas por hectárea (cajas/ha). Si tu huerta es más grande/pequeña, esta métrica permite comparar de forma justa.
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
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
            Detalles Tabulares
          </SectionTitle>
          <Suspense fallback={<CircularProgress size={24} />}>
            <TablesPanel
              inversiones={data.tablas?.inversiones}
              ventas={data.tablas?.ventas}
              comparativo_cosechas={data.tablas?.comparativo_cosechas}
            />
          </Suspense>
        </Box>
      )}

      <Zoom in>
        <FloatingActionButton aria-label="Volver arriba" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <KeyboardArrowUp />
        </FloatingActionButton>
      </Zoom>

      {/* Glosario financiero */}
      <GlosarioFinanzasModal open={glosarioOpen} onClose={() => setGlosarioOpen(false)} />
    </MainContainer>
  );
}
