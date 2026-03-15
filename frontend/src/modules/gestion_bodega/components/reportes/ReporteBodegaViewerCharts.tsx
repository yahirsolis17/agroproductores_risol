import { memo, useEffect, useMemo, useState } from 'react';
import { Box, Chip, IconButton, Paper, Stack, Tooltip, Typography, LinearProgress } from '@mui/material';
import { alpha, keyframes, styled, useTheme } from '@mui/material/styles';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AreaChart as AreaChartIcon, BarChart as BarChartIcon, CompareArrows, Radar as RadarIcon, ShowChart } from '@mui/icons-material';
import type { ReporteSeries, ReporteSeriesPoint, ReporteSeriesPointPie, ReporteSeriesPointXY } from '../../types/reportesBodegaTypes';

type ChartType = 'line' | 'bar' | 'area' | 'radar';

interface Props {
  series?: ReporteSeries[];
}

interface NumericPoint {
  x: string;
  value: number;
}

interface NumericSeries {
  id: string;
  label: string;
  data: NumericPoint[];
}

interface PieSeries {
  id: string;
  label: string;
  data: Array<{ name: string; value: number }>;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ChartContainer = styled(Paper, { shouldForwardProp: (prop) => prop !== 'delay' })<{ delay?: number }>(
  ({ theme, delay = 0 }) => ({
    padding: theme.spacing(3.5),
    borderRadius: 20,
    background:
      theme.palette.mode === 'dark'
        ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
        : `linear-gradient(145deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8f9fa', 0.98)} 100%)`,
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
    transition: 'transform .25s ease, box-shadow .25s ease',
    position: 'relative',
    overflow: 'hidden',
    animation: `${fadeIn} .4s ease-out ${delay}ms both`,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      borderRadius: '4px 4px 0 0',
    },
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 28px rgba(0,0,0,.1)',
    },
  })
);

const ChartTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  display: 'inline-block',
  marginBottom: theme.spacing(2),
  position: 'relative',
  paddingLeft: theme.spacing(1),
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    height: '70%',
    width: 4,
    background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: 4,
  },
}));

const SelectorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(1.5),
  gap: theme.spacing(0.5),
  borderRadius: 16,
  background: alpha(theme.palette.background.paper, 0.7),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
}));

const StyledIconButton = styled(IconButton, { shouldForwardProp: (prop) => prop !== 'active' })<{ active?: boolean }>(
  ({ theme, active }) => ({
    margin: theme.spacing(0.25),
    background: active ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
    border: active ? `1px solid ${alpha(theme.palette.primary.main, 0.25)}` : '1px solid transparent',
    borderRadius: 12,
    transition: 'all .2s ease',
    '&:hover': { background: active ? alpha(theme.palette.primary.main, 0.22) : alpha(theme.palette.action.hover, 0.08) },
  })
);

const StyledChip = styled(Chip)(({ theme }) => ({
  fontWeight: 700,
  borderRadius: 12,
  borderColor: alpha(theme.palette.primary.main, 0.35),
  color: theme.palette.primary.main,
}));

function isXYPoint(point: ReporteSeriesPoint): point is ReporteSeriesPointXY {
  return Object.prototype.hasOwnProperty.call(point, 'x') && Object.prototype.hasOwnProperty.call(point, 'y');
}

function isPiePoint(point: ReporteSeriesPoint): point is ReporteSeriesPointPie {
  return Object.prototype.hasOwnProperty.call(point, 'name') && Object.prototype.hasOwnProperty.call(point, 'value');
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

function formatLabel(raw: string): string {
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(date);
  }
  return raw;
}

function looksMoney(label: string): boolean {
  return /(gasto|costo|monto|importe|precio|valor)/i.test(label);
}

function formatValue(value: number, label: string, compact = false): string {
  if (looksMoney(label)) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : 0,
    }).format(value);
  }
  return new Intl.NumberFormat('es-MX', {
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; color?: string; name?: string }>;
  label?: string;
}) {
  const theme = useTheme();
  if (!active || !payload || !payload.length) return null;
  return (
    <Paper
      elevation={8}
      sx={{
        p: 1.5,
        background: alpha(theme.palette.background.default, 0.95),
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        borderRadius: 12,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Typography variant="body2" fontWeight={700} gutterBottom>
        {label}
      </Typography>
      {payload.map((item, idx) => {
        const name = String(item.name ?? 'Valor');
        const value = toNumber(item.value);
        return (
          <Typography key={`${name}-${idx}`} variant="body2" sx={{ color: item.color || theme.palette.text.primary, fontWeight: 700 }}>
            {name}: {formatValue(value, name)}
          </Typography>
        );
      })}
    </Paper>
  );
});

function DistributionBars({ data }: { data: Array<{ name: string; value: number }> }) {
  if (!data.length) return null;
  const total = data.reduce((acc, row) => acc + row.value, 0) || 1;
  const colors = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#6366f1', '#059669'];
  return (
    <Box display="grid" gap={1.25}>
      {data.map((row, index) => {
        const pct = (row.value / total) * 100;
        const color = colors[index % colors.length];
        return (
          <Box key={`${row.name}-${index}`} display="grid" gridTemplateColumns="160px 1fr auto" gap={1.5} alignItems="center">
            <Typography variant="body2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.name}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 10,
                borderRadius: 99,
                backgroundColor: alpha(color, 0.1),
                '& .MuiLinearProgress-bar': { borderRadius: 99, backgroundColor: color },
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}>
              {row.value.toLocaleString()} ({pct.toFixed(1)}%)
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default function ReporteBodegaViewerCharts({ series = [] }: Props) {
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartType>('line');
  const [compare, setCompare] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const numericSeries = useMemo<NumericSeries[]>(
    () =>
      series
        .filter((serie) => serie.type !== 'pie')
        .map((serie) => ({
          id: serie.id,
          label: serie.label,
          data: (serie.data || [])
            .filter(isXYPoint)
            .map((point) => ({ x: formatLabel(String(point.x)), value: toNumber(point.y) }))
            .filter((point) => Boolean(point.x)),
        }))
        .filter((serie) => serie.data.length),
    [series]
  );

  const pieSeries = useMemo<PieSeries[]>(
    () =>
      series
        .filter((serie) => serie.type === 'pie')
        .map((serie) => ({
          id: serie.id,
          label: serie.label,
          data: (serie.data || [])
            .filter(isPiePoint)
            .map((point) => ({ name: String(point.name), value: toNumber(point.value) }))
            .filter((point) => Boolean(point.name)),
        }))
        .filter((serie) => serie.data.length),
    [series]
  );

  const hasDual = numericSeries.length >= 2;
  const colors = useMemo(
    () => [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main],
    [theme]
  );

  const dualData = useMemo(() => {
    if (!hasDual) return [] as Array<{ x: string; a: number; b: number }>;
    const [a, b] = numericSeries;
    const map = new Map<string, { x: string; a: number; b: number }>();
    a.data.forEach((point) => map.set(point.x, { x: point.x, a: point.value, b: 0 }));
    b.data.forEach((point) => {
      const base = map.get(point.x) || { x: point.x, a: 0, b: 0 };
      base.b = point.value;
      map.set(point.x, base);
    });
    return Array.from(map.values());
  }, [hasDual, numericSeries]);

  const animation = useMemo(
    () => ({ isAnimationActive: mounted, animationDuration: 900, animationEasing: 'ease-out' as const, animationBegin: 200 }),
    [mounted]
  );

  const gridColor = alpha(theme.palette.divider, 0.2);
  const yTick = { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 };
  const xTick = { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 };

  if (!numericSeries.length && !pieSeries.length) {
    return (
      <ChartContainer>
        <Typography color="text.secondary">No hay graficas disponibles.</Typography>
      </ChartContainer>
    );
  }

  const renderNumeric = (label: string, data: NumericPoint[], color: string) => {
    const values = data.map((d) => d.value);
    const min = values.length ? Math.min(...values, 0) : 0;
    const max = values.length ? Math.max(...values, 0) : 1;
    const domain: [number, number] = [min - Math.max(1, Math.round((max - min) * 0.1)), max + Math.max(1, Math.round((max - min) * 0.1))];

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatValue(toNumber(v), label, true)} tick={yTick} axisLine={false} tickLine={false} domain={domain} />
            <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
            <Bar dataKey="value" name={label} fill={color} radius={[6, 6, 0, 0]} {...animation} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={data} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
            <defs>
              <linearGradient id={`grad-${label.replace(/[^a-zA-Z0-9_-]/g, '_')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatValue(toNumber(v), label, true)} tick={yTick} axisLine={false} tickLine={false} domain={domain} />
            <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
            <Area
              type="monotone"
              dataKey="value"
              name={label}
              stroke={color}
              fill={`url(#grad-${label.replace(/[^a-zA-Z0-9_-]/g, '_')})`}
              strokeWidth={2.8}
              dot={{ r: 4, fill: color, strokeWidth: 2, stroke: theme.palette.background.paper }}
              activeDot={{ r: 6, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 }}
              {...animation}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'radar') {
      const radarData = data.map((point) => ({ categoria: point.x, value: point.value }));
      return (
        <ResponsiveContainer width="100%" height={380}>
          <RadarChart data={radarData} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="categoria" tick={{ ...xTick, fontSize: 11 }} />
            <PolarRadiusAxis tickFormatter={(v) => formatValue(toNumber(v), label, true)} tick={yTick} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Radar name={label} dataKey="value" stroke={color} fill={alpha(color, 0.45)} strokeWidth={2} {...animation} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={data} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatValue(toNumber(v), label, true)} tick={yTick} axisLine={false} tickLine={false} domain={domain} />
          <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
          <Line
            type="monotone"
            dataKey="value"
            name={label}
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, fill: color, strokeWidth: 2, stroke: theme.palette.background.paper }}
            activeDot={{ r: 6, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 }}
            {...animation}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderDual = () => {
    if (!hasDual) return null;
    const [left, right] = numericSeries;
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={dualData} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatValue(toNumber(v), 'total', true)} tick={yTick} axisLine={false} tickLine={false} />
            <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
            <Bar dataKey="a" name={left.label} fill={colors[0]} radius={[6, 6, 0, 0]} {...animation} />
            <Bar dataKey="b" name={right.label} fill={colors[1]} radius={[6, 6, 0, 0]} {...animation} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={dualData} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatValue(toNumber(v), 'total', true)} tick={yTick} axisLine={false} tickLine={false} />
          <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
          <Line type="monotone" dataKey="a" name={left.label} stroke={colors[0]} strokeWidth={3} dot={{ r: 4 }} {...animation} />
          <Line type="monotone" dataKey="b" name={right.label} stroke={colors[1]} strokeWidth={3} dot={{ r: 4 }} {...animation} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between" gap={1.5}>
        <SelectorContainer>
          <Tooltip title="Linea">
            <StyledIconButton active={chartType === 'line'} onClick={() => setChartType('line')}>
              <ShowChart />
            </StyledIconButton>
          </Tooltip>
          <Tooltip title="Barras">
            <StyledIconButton active={chartType === 'bar'} onClick={() => setChartType('bar')}>
              <BarChartIcon />
            </StyledIconButton>
          </Tooltip>
          <Tooltip title="Area">
            <StyledIconButton active={chartType === 'area'} onClick={() => setChartType('area')}>
              <AreaChartIcon />
            </StyledIconButton>
          </Tooltip>
          <Tooltip title="Radar">
            <StyledIconButton active={chartType === 'radar'} onClick={() => setChartType('radar')}>
              <RadarIcon />
            </StyledIconButton>
          </Tooltip>
        </SelectorContainer>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Tooltip title={hasDual ? 'Comparar dos series numericas' : 'Comparacion no disponible'}>
            <span>
              <StyledChip
                icon={<CompareArrows />}
                label={compare ? 'Comparando' : 'Comparar'}
                color={compare ? 'primary' : 'default'}
                variant={compare ? 'filled' : 'outlined'}
                onClick={hasDual ? () => setCompare((v) => !v) : undefined}
                sx={{ cursor: hasDual ? 'pointer' : 'not-allowed', opacity: hasDual ? 1 : 0.5 }}
              />
            </span>
          </Tooltip>
          <StyledChip label={`${numericSeries.length} series`} variant="outlined" />
          <StyledChip label={`${pieSeries.length} distribuciones`} variant="outlined" color="info" />
        </Stack>
      </Stack>

      {compare && hasDual ? (
        <ChartContainer delay={100}>
          <ChartTitle variant="h5">Comparativa de series</ChartTitle>
          {renderDual()}
        </ChartContainer>
      ) : (
        numericSeries.map((serie, index) => (
          <ChartContainer key={serie.id} delay={120 + index * 90}>
            <ChartTitle variant="h5">{serie.label}</ChartTitle>
            {renderNumeric(serie.label, serie.data, colors[index % colors.length])}
          </ChartContainer>
        ))
      )}

      {pieSeries.map((serie, index) => (
        <ChartContainer key={serie.id} delay={240 + index * 90}>
          <ChartTitle variant="h5">{serie.label}</ChartTitle>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={serie.data} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={xTick} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatValue(toNumber(v), serie.label, true)} tick={yTick} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
              <Bar dataKey="value" name={serie.label} fill={theme.palette.info.main} radius={[6, 6, 0, 0]} {...animation} />
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ mt: 2.5 }}>
            <DistributionBars data={serie.data} />
          </Box>
        </ChartContainer>
      ))}
    </Box>
  );
}
