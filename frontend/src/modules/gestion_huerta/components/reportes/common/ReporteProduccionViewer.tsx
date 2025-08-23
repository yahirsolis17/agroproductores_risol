// frontend/src/modules/gestion_huerta/components/reportes/common/ReporteProduccionViewer.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  TableSortLabel,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Slide,
  Grow,
  alpha,
  CircularProgress,
  Fab,
  Zoom,
} from '@mui/material';
import { useTheme, styled, keyframes } from '@mui/material/styles';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  ReporteProduccionData,
  KPIData,
  SeriesDataPoint,
  TablaInversion,
  TablaVenta
} from '../../../types/reportesProduccionTypes';
import { formatCurrency, formatNumber } from '../../../../../global/utils/formatters';
import { parseLocalDateStrict } from '../../../../../global/utils/date';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  BarChart as BarChartIcon,
  Radar as RadarIcon,
  TableView,
  Download,
  Refresh,
  AreaChart as AreaChartIcon,
  KeyboardArrowUp,
} from '@mui/icons-material';

// --------------------------
// Animaciones personalizadas
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

// --------------------------
// Estilos personalizados
// --------------------------
const MainContainer = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
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
    zIndex: 1
  }
}));

const compact = new Intl.NumberFormat('es-MX', { notation: 'compact' }).format;

const StyledCard = styled(Card)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
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
    animation: `${glowAnimation} 2s infinite ease-in-out, ${floatAnimation} 3s infinite ease-in-out`
  }
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

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3.5),
  borderRadius: '20px',
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.85)
    : alpha(theme.palette.background.paper, 0.95),
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  transition: 'all 0.4s ease',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  '&:hover': {
    boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
    transform: 'translateY(-5px)'
  }
}));

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
    borderRadius: '2px'
  }
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderRadius: '16px',
  background: theme.palette.mode === 'dark' 
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
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }
  }
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
    animation: `${glowAnimation} 2s infinite ease-in-out`
  }
}));

// --------------------------
// Interfaces y tipos
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

type Order = 'asc' | 'desc';
type ChartType = 'line' | 'bar' | 'area' | 'radar';
type ViewMode = 'charts' | 'tables' | 'both';

// --------------------------
// Componentes personalizados
// --------------------------
const KPICard: React.FC<{ kpi: KPIData; index: number }> = ({ kpi, index }) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    if (!kpi.trend) return null;

    return kpi.trend.direction === 'up' ? (
      <TrendingUp color="success" sx={{ fontSize: 20 }} />
    ) : kpi.trend.direction === 'down' ? (
      <TrendingDown color="error" sx={{ fontSize: 20 }} />
    ) : null;
  };

  return (
    <Grow in timeout={800} style={{ transitionDelay: `${index * 100}ms` }}>
      <StyledCard>
        <CardContent sx={{ position: 'relative', padding: theme.spacing(3) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" component="div" color="text.secondary" sx={{ fontWeight: 500 }}>
              {kpi.label}
            </Typography>
            {getTrendIcon()}
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

          {kpi.trend && (
            <Chip
              size="medium"
              icon={kpi.trend.direction === 'up' ? <TrendingUp /> : kpi.trend.direction === 'down' ? <TrendingDown /> : undefined}
              label={`${kpi.trend.direction === 'up' ? '↗' : kpi.trend.direction === 'down' ? '↘' : '→'} ${formatNumber(kpi.trend.value)}%`}
              color={kpi.trend.direction === 'up' ? 'success' : kpi.trend.direction === 'down' ? 'error' : 'default'}
              variant="filled"
              sx={{ 
                fontWeight: 600,
                background: kpi.trend.direction === 'up' 
                  ? alpha(theme.palette.success.main, 0.15) 
                  : kpi.trend.direction === 'down' 
                  ? alpha(theme.palette.error.main, 0.15)
                  : alpha(theme.palette.info.main, 0.15),
                color: kpi.trend.direction === 'up' 
                  ? theme.palette.success.dark 
                  : kpi.trend.direction === 'down' 
                  ? theme.palette.error.dark
                  : theme.palette.info.dark
              }}
            />
          )}

          {/* Efecto de brillo en hover */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              opacity: 0,
              transition: 'opacity 0.3s ease',
              borderRadius: '20px 20px 0 0',
            }}
            className="card-glow"
          />
        </CardContent>
      </StyledCard>
    </Grow>
  );
};

const ChartSelector: React.FC<{
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}> = ({ chartType, onChartTypeChange }) => {
  const theme = useTheme();
  const chartTypes = [
    { type: 'line' as ChartType, icon: <ShowChart />, label: 'Línea' },
    { type: 'bar' as ChartType, icon: <BarChartIcon />, label: 'Barras' },
    { type: 'area' as ChartType, icon: <AreaChartIcon />, label: 'Área' },
    { type: 'radar' as ChartType, icon: <RadarIcon />, label: 'Radar' },
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      mb: 3,
      padding: theme.spacing(1.5),
      background: alpha(theme.palette.background.paper, 0.7),
      borderRadius: '16px',
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
    }}>
      {chartTypes.map((item) => (
        <Tooltip key={item.type} title={item.label} arrow>
          <IconButton
            color={chartType === item.type ? 'primary' : 'default'}
            onClick={() => onChartTypeChange(item.type)}
            size="large"
            sx={{
              margin: theme.spacing(0, 1),
              background: chartType === item.type ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: chartType === item.type 
                  ? alpha(theme.palette.primary.main, 0.2) 
                  : alpha(theme.palette.action.hover, 0.05)
              }
            }}
          >
            {item.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
};

// --------------------------
// Tabla: utilidades de ordenamiento (genéricas)
// --------------------------
function descendingComparator<T>(
  a: T,
  b: T,
  orderBy: keyof T,
  valueGetter?: (x: T) => number | string
) {
  const va = valueGetter ? valueGetter(a) : (a[orderBy] as unknown as number | string);
  const vb = valueGetter ? valueGetter(b) : (b[orderBy] as unknown as number | string);

  // Normalizar undefined/null
  const _va = (va ?? '') as any;
  const _vb = (vb ?? '') as any;

  if (_vb < _va) return -1;
  if (_vb > _va) return 1;
  return 0;
}

function getComparator<T>(
  order: Order,
  orderBy: keyof T,
  valueGetter?: (x: T) => number | string
): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy, valueGetter)
    : (a, b) => -descendingComparator(a, b, orderBy, valueGetter);
}

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number): T[] {
  const stabilized = array.map((el, index) => [el, index] as [T, number]);
  stabilized.sort((a, b) => {
    const cmp = comparator(a[0], b[0]);
    if (cmp !== 0) return cmp;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

// --------------------------
// Tablas específicas
// --------------------------
const InversionesTable: React.FC<{ inversiones: TablaInversion[] }> = ({ inversiones }) => {
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof TablaInversion>('fecha');

  const handleRequestSort = (property: keyof TablaInversion) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const rows = useMemo(() => {
    const comparator =
      orderBy === 'fecha'
        ? getComparator<TablaInversion>(order, orderBy, (x) => {
            const d = parseLocalDateStrict(x.fecha);
            const num = d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
            return num;
          })
        : getComparator<TablaInversion>(order, orderBy);
    return stableSort(inversiones, comparator);
  }, [inversiones, order, orderBy]);

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, background: alpha(theme.palette.background.paper, 0.7) }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TrendingUp sx={{ mr: 1, color: theme.palette.primary.main }} />
        Inversiones
      </Typography>
      <TableContainer>
        <Table size="medium" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={orderBy === 'fecha' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'fecha'}
                  direction={orderBy === 'fecha' ? order : 'asc'}
                  onClick={() => handleRequestSort('fecha')}
                  sx={{ fontWeight: 600 }}
                >
                  Fecha
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === 'categoria' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'categoria'}
                  direction={orderBy === 'categoria' ? order : 'asc'}
                  onClick={() => handleRequestSort('categoria')}
                  sx={{ fontWeight: 600 }}
                >
                  Categoría
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
              <TableCell align="right" sortDirection={orderBy === 'monto' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'monto'}
                  direction={orderBy === 'monto' ? order : 'asc'}
                  onClick={() => handleRequestSort('monto')}
                  sx={{ fontWeight: 600 }}
                >
                  Monto
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((inv) => {
              const d = parseLocalDateStrict(inv.fecha);
              const fechaStr = d instanceof Date && !isNaN(d.getTime())
                ? new Intl.DateTimeFormat('es-MX').format(d)
                : inv.fecha;

              return (
                <TableRow key={inv.id} hover sx={{ transition: 'background-color 0.2s ease' }}>
                  <TableCell>{fechaStr}</TableCell>
                  <TableCell>
                    <Chip 
                      label={inv.categoria} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{inv.descripcion}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {formatCurrency(inv.monto)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

const VentasTable: React.FC<{ ventas: TablaVenta[] }> = ({ ventas }) => {
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof TablaVenta>('fecha');

  const handleRequestSort = (property: keyof TablaVenta) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const rows = useMemo(() => {
    const comparator =
      orderBy === 'fecha'
        ? getComparator<TablaVenta>(order, orderBy, (x) => {
            const d = parseLocalDateStrict(x.fecha);
            const num = d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
            return num;
          })
        : getComparator<TablaVenta>(order, orderBy);
    return stableSort(ventas, comparator);
  }, [ventas, order, orderBy]);

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, background: alpha(theme.palette.background.paper, 0.7) }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BarChartIcon sx={{ mr: 1, color: theme.palette.success.main }} />
        Ventas
      </Typography>
      <TableContainer>
        <Table size="medium" stickyHeader sx={{ tableLayout: 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={orderBy === 'fecha' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'fecha'}
                  direction={orderBy === 'fecha' ? order : 'asc'}
                  onClick={() => handleRequestSort('fecha')}
                  sx={{ fontWeight: 600 }}
                >
                  Fecha
                </TableSortLabel>
              </TableCell>

              <TableCell align="right" sortDirection={orderBy === 'cantidad' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'cantidad'}
                  direction={orderBy === 'cantidad' ? order : 'asc'}
                  onClick={() => handleRequestSort('cantidad')}
                  sx={{ fontWeight: 600, display: 'inline-flex', justifyContent: 'flex-end' }}
                >
                  Cantidad de Cajas
                </TableSortLabel>
              </TableCell>

              <TableCell align="right" sortDirection={orderBy === 'precio_unitario' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'precio_unitario'}
                  direction={orderBy === 'precio_unitario' ? order : 'asc'}
                  onClick={() => handleRequestSort('precio_unitario')}
                  sx={{ fontWeight: 600, display: 'inline-flex', justifyContent: 'flex-end' }}
                >
                  Precio por Caja
                </TableSortLabel>
              </TableCell>

              <TableCell align="right" sortDirection={orderBy === 'total' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'total'}
                  direction={orderBy === 'total' ? order : 'asc'}
                  onClick={() => handleRequestSort('total')}
                  sx={{ fontWeight: 600, display: 'inline-flex', justifyContent: 'flex-end' }}
                >
                  Total
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((v) => {
              const d = parseLocalDateStrict(v.fecha);
              const fechaStr = d instanceof Date && !isNaN(d.getTime())
                ? new Intl.DateTimeFormat('es-MX').format(d)
                : v.fecha;

              return (
                <TableRow key={v.id} hover sx={{ transition: 'background-color 0.2s ease' }}>
                  <TableCell>{fechaStr}</TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>{formatNumber(v.cantidad)}</TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>{formatCurrency(v.precio_unitario)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, pr: 3 }}>
                    {formatCurrency(v.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

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
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [animated, setAnimated] = useState(false);

  // Efecto para activar animaciones después de la carga
  useEffect(() => {
    if (!loading && data) {
      setAnimated(true);
    }
  }, [loading, data]);

  // Colores para gráficas
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const renderChart = (chartData: SeriesDataPoint[], chartTitle: string, index: number) => {
    if (!chartData || chartData.length === 0) return null;

    // Preparar datos para el chart
    const preparedData = chartData.map((point) => {
      const d = parseLocalDateStrict(point.fecha);
      const label =
        d instanceof Date && !isNaN(d.getTime())
          ? new Intl.DateTimeFormat('es-MX', {
              day: '2-digit',
              month: 'short',
              year: '2-digit',
            }).format(d)
          : point.fecha;
      return {
        x: label,
        valor: Number(point.valor || 0),
        categoria: point.categoria || '',
        fullDate: d,
      };
    });

    // Tooltip personalizado
    const CustomTooltip: React.FC<{
      active?: boolean;
      payload?: Array<{ value: number }>;
      label?: string;
    }> = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <Paper elevation={3} sx={{ p: 2, background: alpha(theme.palette.background.default, 0.95) }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              {label}
            </Typography>
            <Typography variant="body2" color="primary">
              {chartTitle}:{' '}
              {payload[0].value < 1000 ? formatCurrency(payload[0].value) : `$${(payload[0].value / 1000).toFixed(1)}k`}
            </Typography>
          </Paper>
        );
      }
      return null;
    };

    // Renderizado condicional según tipo de gráfica
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={preparedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
              <XAxis dataKey="x" tick={{ fill: theme.palette.text.secondary }} />
                <YAxis
                  tickFormatter={(v) => (typeof v === 'number' ? `$${compact(v)}` : v)}
                  tick={{ fill: theme.palette.text.secondary }}
                />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="valor"
                name={chartTitle}
                fill={COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={preparedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id={`colorValor${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
              <XAxis dataKey="x" tick={{ fill: theme.palette.text.secondary }} />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="valor"
                name={chartTitle}
                stroke={COLORS[index % COLORS.length]}
                fill={`url(#colorValor${index})`}
                strokeWidth={2}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'radar': {
        // Agrupar por categoría si existe
        const radarData = preparedData.reduce((acc: Array<{ categoria: string; valor: number }>, curr) => {
          if (curr.categoria) {
            const existing = acc.find((item) => item.categoria === curr.categoria);
            if (existing) {
              existing.valor += curr.valor;
            } else {
              acc.push({ categoria: curr.categoria, valor: curr.valor });
            }
          }
          return acc;
        }, []);
        return radarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <PolarGrid stroke={alpha(theme.palette.divider, 0.3)} />
              <PolarAngleAxis dataKey="categoria" tick={{ fill: theme.palette.text.secondary }} />
              <PolarRadiusAxis
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
              <Radar
                name={chartTitle}
                dataKey="valor"
                stroke={COLORS[index % COLORS.length]}
                fill={alpha(COLORS[index % COLORS.length], 0.6)}
                animationDuration={1500}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
            <Typography color="text.secondary">Datos insuficientes para gráfico radar</Typography>
          </Box>
        );
      }

      default: // line
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={preparedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
              <XAxis dataKey="x" tick={{ fill: theme.palette.text.secondary }} />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                name={chartTitle}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={3}
                dot={{ r: 4, fill: COLORS[index % COLORS.length] }}
                activeDot={{ r: 6, fill: COLORS[index % COLORS.length] }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  // --------------------------
  // Estados de carga / error / vacío
  // --------------------------
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

  // --------------------------
  // Render principal
  // --------------------------
  return (
    <MainContainer>
      {/* Header con acciones */}
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
                  '&:hover': { background: alpha(theme.palette.primary.main, 0.2) }
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
                  '&:hover': { background: alpha(theme.palette.primary.main, 0.2) }
                }}
              >
                <Download />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Selector de vista */}
      <StyledTabs
        value={viewMode}
        onChange={(_, newValue) => setViewMode(newValue)}
        centered
        variant="fullWidth"
      >
        <Tab icon={<ShowChart />} iconPosition="start" label="Gráficas" value="charts" />
        <Tab icon={<TableView />} iconPosition="start" label="Tablas" value="tables" />
        <Tab icon={<BarChartIcon />} iconPosition="start" label="Completo" value="both" />
      </StyledTabs>

      {/* KPIs */}
      {(viewMode === 'charts' || viewMode === 'both') && data.kpis && data.kpis.length > 0 && (
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
            {data.kpis.map((kpi, index) => (
              <Box key={index}>
                <KPICard kpi={kpi} index={index} />
              </Box>
            ))}
          </AnimatedGrid>
        </Box>
      )}

      {/* Gráficas */}
      {(viewMode === 'charts' || viewMode === 'both') && data.series && (
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 4 }}>
            <SectionTitle variant="h4" fontWeight="700">
              Visualización de Datos
            </SectionTitle>
            <ChartSelector chartType={chartType} onChartTypeChange={setChartType} />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 4,
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'repeat(2, minmax(0, 1fr))',
              },
            }}
          >
            {data.series.inversiones && data.series.inversiones.length > 0 && (
              <Slide in={animated} direction="up" timeout={800}>
                <div>
                  <ChartContainer>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <TrendingUp sx={{ mr: 1, color: theme.palette.primary.main }} /> Inversiones por día
                    </Typography>
                    {renderChart(data.series.inversiones, 'Inversiones', 0)}
                  </ChartContainer>
                </div>
              </Slide>
            )}

            {data.series.ventas && data.series.ventas.length > 0 && (
              <Slide in={animated} direction="up" timeout={1000}>
                <div>
                  <ChartContainer>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <BarChartIcon sx={{ mr: 1, color: theme.palette.success.main }} /> Ventas por día
                    </Typography>
                    {renderChart(data.series.ventas, 'Ventas', 1)}
                  </ChartContainer>
                </div>
              </Slide>
            )}

            {data.series.ganancias && data.series.ganancias.length > 0 && (
              <Box
                sx={{
                  gridColumn: { xs: '1 / -1', lg: '1 / -1' },
                }}
              >
                <Slide in={animated} direction="up" timeout={1200}>
                  <div>
                    <ChartContainer>
                      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <ShowChart sx={{ mr: 1, color: theme.palette.warning.main }} /> Ganancias por día
                      </Typography>
                      {renderChart(data.series.ganancias, 'Ganancias', 2)}
                    </ChartContainer>
                  </div>
                </Slide>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Tablas */}
      {(viewMode === 'tables' || viewMode === 'both') && data.tablas && (
        <Box>
          <SectionTitle variant="h4" fontWeight="700">
            Detalles Tabulares
          </SectionTitle>

          {data.tablas.inversiones && data.tablas.inversiones.length > 0 && (
            <InversionesTable inversiones={data.tablas.inversiones} />
          )}
          {data.tablas.ventas && data.tablas.ventas.length > 0 && <VentasTable ventas={data.tablas.ventas} />}
        </Box>
      )}

      {/* Botón flotante para volver arriba */}
      <Zoom in={true}>
        <FloatingActionButton
          aria-label="Volver arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <KeyboardArrowUp />
        </FloatingActionButton>
      </Zoom>
    </MainContainer>
  );
}