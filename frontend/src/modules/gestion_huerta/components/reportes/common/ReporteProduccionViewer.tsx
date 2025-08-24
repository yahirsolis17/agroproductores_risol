// frontend/src/modules/gestion_huerta/components/reportes/common/ReporteProduccionViewer.tsx
import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { useTheme, styled, keyframes } from '@mui/material/styles';
import {
  ReporteProduccionData,
  KPIData,
} from '../../../types/reportesProduccionTypes';
import { formatCurrency, formatNumber } from '../../../../../global/utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  TableView,
  BarChart as BarChartIcon,
  Download,
  Refresh,
  KeyboardArrowUp,
} from '@mui/icons-material';

// NUEVO: paneles separados
import ChartsPanel from './ReporteProduccionViewerCharts';
import TablesPanel from './ReporteProduccionViewerTables';

// --------------------------
// Animaciones y estilos
// --------------------------
const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 150, 136, 0.5); }
  50% { box-shadow: 0 0 20px rgba(0, 150, 136, 0.8); }
  100% { box-shadow: 0 0 5px rgba(0, 150, 136, 0.5); }
`;

const fadeInScale = keyframes`
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
`;

const MainContainer = styled(Paper)(({ theme }) => ({
  background:
    theme.palette.mode === 'dark'
      ? `linear-gradient(160deg, ${alpha(theme.palette.background.default, 0.95)} 0%, ${alpha(
          theme.palette.background.paper,
          0.98
        )} 100%)`
      : `linear-gradient(160deg, ${alpha('#f8fafc', 0.95)} 0%, ${alpha('#ffffff', 0.98)} 100%)`,
  backdropFilter: 'blur(12px)',
  borderRadius: '24px',
  padding: theme.spacing(4),
  margin: theme.spacing(2),
  boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.06)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  animation: `${fadeInScale} 0.6s ease-out`,
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
  backdropFilter: 'blur(10px)',
  borderRadius: '20px',
  transition: 'all 0.3s ease-in-out',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  animation: `${fadeInScale} 0.5s ease-out`,
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 15px 30px rgba(0,0,0,0.12)',
    borderColor: alpha(theme.palette.primary.main, 0.4),
    animation: `${glowAnimation} 2s infinite ease-in-out, ${floatAnimation} 3s infinite ease-in-out`,
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
  animation: `${floatAnimation} 4s infinite ease-in-out`,
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
    animation: `${glowAnimation} 2s infinite ease-in-out`,
  },
}));

// --------------------------
// Props y tipos locales
// --------------------------
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

// --------------------------
// KPI Card (se queda aquí)
// --------------------------
const KPICard: React.FC<{ kpi: KPIData; index: number }> = ({ kpi, index }) => {
  const theme = useTheme();

  const trendIcon =
    kpi.trend?.direction === 'up' ? (
      <TrendingUp color="success" sx={{ fontSize: 20 }} />
    ) : kpi.trend?.direction === 'down' ? (
      <TrendingDown color="error" sx={{ fontSize: 20 }} />
    ) : null;

  return (
    <Grow in timeout={800} style={{ transitionDelay: `${index * 100}ms` }}>
      <StyledCard>
        <CardContent sx={{ position: 'relative', p: theme.spacing(3) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              {kpi.label}
            </Typography>
            {trendIcon}
          </Box>

          <Typography variant="h3" color="primary" fontWeight="700" sx={{ mb: 2 }}>
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

// --------------------------
// Componente principal
// --------------------------
export default function ReporteProduccionViewer({
  data,
  loading = false,
  error,
  title,
  subtitle,
  onRefresh,
  onExport,
}: Props) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!loading && data) setAnimated(true);
  }, [loading, data]);

  // Estados de carga / error / vacío
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

  // Render principal
  return (
    <MainContainer>
      {/* Header */}
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
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar datos">
            <span>
              <IconButton
                onClick={onRefresh}
                color="primary"
                size="large"
                disabled={!onRefresh}
                sx={{
                  background: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': { background: alpha(theme.palette.primary.main, 0.2) },
                }}
              >
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Exportar reporte">
            <span>
              <IconButton
                onClick={onExport}
                color="primary"
                size="large"
                disabled={!onExport}
                sx={{
                  background: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': { background: alpha(theme.palette.primary.main, 0.2) },
                }}
              >
                <Download />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Selector de vista */}
      <StyledTabs value={viewMode} onChange={(_, v) => setViewMode(v)} centered variant="fullWidth">
        <Tab icon={<ShowChart />} iconPosition="start" label="Gráficas" value="charts" />
        <Tab icon={<TableView />} iconPosition="start" label="Tablas" value="tables" />
        <Tab icon={<BarChartIcon />} iconPosition="start" label="Completo" value="both" />
      </StyledTabs>

      {/* KPIs */}
      {(viewMode === 'charts' || viewMode === 'both') && data.kpis?.length ? (
        <Box sx={{ mb: 6 }}>
          <SectionTitle variant="h4" fontWeight="700">
            Indicadores Clave
          </SectionTitle>
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
        </Box>
      ) : null}

      {/* Gráficas */}
      {(viewMode === 'charts' || viewMode === 'both') && (
        <ChartsPanel series={data.series} animated={animated} />
      )}

      {/* Tablas */}
      {(viewMode === 'tables' || viewMode === 'both') && (
        <Box>
          <SectionTitle variant="h4" fontWeight="700">
            Detalles Tabulares
          </SectionTitle>
          <TablesPanel
            inversiones={data.tablas?.inversiones}
            ventas={data.tablas?.ventas}
            comparativo_cosechas={data.tablas?.comparativo_cosechas}
          />
        </Box>
      )}

      {/* Botón flotante volver arriba */}
      <Zoom in>
        <FloatingActionButton aria-label="Volver arriba" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <KeyboardArrowUp />
        </FloatingActionButton>
      </Zoom>
    </MainContainer>
  );
}
