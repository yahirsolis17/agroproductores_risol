import React, { useMemo, useState, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, Stack, Chip, keyframes, alpha, useTheme, styled } from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
} from 'recharts';
import {
  ShowChart,
  BarChart as BarChartIcon,
  AreaChart as AreaChartIcon,
  Radar as RadarIcon,
  CompareArrows,
} from '@mui/icons-material';
import { SeriesDataPoint } from '../../../types/reportesProduccionTypes';
import { parseLocalDateStrict } from '../../../../../global/utils/date';
import { formatCurrencyFull } from '../../../../../global/utils/formatters';

type ChartType = 'line' | 'bar' | 'area' | 'radar';

interface Props {
  series: {
    inversiones?: SeriesDataPoint[];
    ventas?: SeriesDataPoint[];
    ganancias?: SeriesDataPoint[];
  };
  animated?: boolean;
}

// Animaciones
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`0%{transform:scale(1)}50%{transform:scale(1.02)}100%{transform:scale(1)}`;
const glow = keyframes`0%{box-shadow:0 0 5px rgba(0,0,0,.1)}50%{box-shadow:0 0 20px rgba(0,0,0,.15)}100%{box-shadow:0 0 5px rgba(0,0,0,.1)}`;
const gradientShift = keyframes`0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}`;

// Estilos
const ChartContainer = styled(Paper, { shouldForwardProp: (p) => p !== 'delay' })<{delay?:number}>(({ theme, delay=0 }) => ({
  padding: theme.spacing(3.5),
  borderRadius: 20,
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
    : `linear-gradient(145deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8f9fa', 0.98)} 100%)`,
  backgroundSize: '200% 200%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  transition: 'all .4s cubic-bezier(.175,.885,.32,1.1)',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  overflow: 'hidden',
  position: 'relative',
  animation: `${fadeIn} .6s ease-out ${delay}ms both, ${glow} 3s ease-in-out infinite`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    backgroundSize: '200% 200%',
    animation: `${gradientShift} 4s ease infinite`,
    opacity: .8, borderRadius: '4px 4px 0 0'
  },
  '&:hover': { boxShadow: '0 15px 45px rgba(0,0,0,.15)', transform: 'translateY(-6px)' }
}));

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
    left: 0, top: '50%', transform: 'translateY(-50%)',
    height: '70%', width: 4,
    background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: 4
  }
}));

const SelectorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(1.5),
  gap: theme.spacing(0.5),
  borderRadius: 16,
  background: alpha(theme.palette.background.paper, 0.7),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  animation: `${fadeIn} .5s ease-out 200ms both`
}));

const StyledIconButton = styled(IconButton, { shouldForwardProp: (p)=>p!=='isActive' })<{isActive?:boolean}>(({ theme, isActive }) => ({
  margin: theme.spacing(0.25),
  background: isActive ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, .15)} 0%, ${alpha(theme.palette.primary.dark,.1)} 100%)` : 'transparent',
  border: isActive ? `1px solid ${alpha(theme.palette.primary.main,.2)}` : '1px solid transparent',
  borderRadius: 12,
  transition: 'all .3s cubic-bezier(.4,0,.2,1)',
  transform: isActive ? 'translateY(-2px)' : 'none',
  boxShadow: isActive ? '0 5px 15px rgba(0,0,0,.1)' : 'none',
  '&:hover': {
    background: isActive ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main,.25)} 0%, ${alpha(theme.palette.primary.dark,.2)} 100%)` : alpha(theme.palette.action.hover,.05),
    transform: 'translateY(-2px)', boxShadow: '0 5px 15px rgba(0,0,0,.1)'
  }
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600, borderRadius: 12, padding: theme.spacing(0.5),
  transition: 'all .3s cubic-bezier(.4,0,.2,1)',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 5px 15px rgba(0,0,0,.1)' }
}));

const formatLabel = (s: string) => {
  const d = parseLocalDateStrict(s);
  if (d instanceof Date && !isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }).format(d);
  }
  return s;
};

const usePrepared = (input?: SeriesDataPoint[]) =>
  useMemo(
    () =>
      (input || []).map(p => ({
        x: formatLabel(p.fecha),
        rawX: p.fecha,
        valor: Number(p.valor || 0),
        categoria: p.categoria || '',
      })),
    [input]
  );

// Tooltip full
const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }> = ({
  active, payload, label,
}) => {
  const theme = useTheme();
  if (!active || !payload || !payload.length) return null;

  return (
    <Paper elevation={8} sx={{
      p: 1.5,
      background: alpha(theme.palette.background.default, 0.95),
      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
      borderRadius: 12,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      animation: `${fadeIn} .2s ease-out`,
      maxWidth: 260
    }}>
      <Typography variant="body2" fontWeight={700} gutterBottom sx={{ color: theme.palette.text.primary, wordBreak: 'break-word' }}>
        {label}
      </Typography>
      {payload.map((entry, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <Box sx={{
            width: 12, height: 12, borderRadius: '50%',
            background: entry.color, mr: 1,
            boxShadow: `0 0 0 3px ${alpha(entry.color, 0.2)}`
          }}/>
          <Typography variant="body2" sx={{ color: entry.color, fontWeight: 600 }}>
            {formatCurrencyFull(Number(entry.value || 0))}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

const ChartSelector: React.FC<{
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  compare: boolean;
  onToggleCompare: () => void;
  hasDual: boolean;
}> = ({ chartType, onChartTypeChange, compare, onToggleCompare, hasDual }) => {
  const items = [
    { type: 'line' as ChartType, icon: <ShowChart />, label: 'Línea' },
    { type: 'bar' as ChartType, icon: <BarChartIcon />, label: 'Barras' },
    { type: 'area' as ChartType, icon: <AreaChartIcon />, label: 'Área' },
    { type: 'radar' as ChartType, icon: <RadarIcon />, label: 'Radar' },
  ];
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
      <SelectorContainer>
        {items.map((it) => (
          <Tooltip key={it.type} title={it.label} arrow placement="top">
            <StyledIconButton isActive={chartType === it.type} onClick={() => onChartTypeChange(it.type)} size="medium">
              {it.icon}
            </StyledIconButton>
          </Tooltip>
        ))}
      </SelectorContainer>
      <Tooltip title={hasDual ? 'Comparar Inversiones vs Ventas' : 'Comparación no disponible'} arrow placement="top">
        <span>
          <StyledChip
            icon={<CompareArrows />}
            label={compare ? 'Comparando' : 'Comparar'}
            color={compare ? 'primary' : 'default'}
            variant={compare ? 'filled' : 'outlined'}
            onClick={hasDual ? onToggleCompare : undefined}
            sx={{ cursor: hasDual ? 'pointer' : 'not-allowed', opacity: hasDual ? 1 : 0.5, animation: compare ? `${pulse} 2s infinite` : 'none' }}
          />
        </span>
      </Tooltip>
    </Stack>
  );
};

export default function ChartsPanel({ series, animated = true }: Props) {
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartType>('line');
  const [compare, setCompare] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const COLORS = useMemo(
    () => [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main,
    ],
    [theme]
  );

  const inv = usePrepared(series.inversiones);
  const ven = usePrepared(series.ventas);
  const gan = usePrepared(series.ganancias);

  const hasInv = inv.length > 0;
  const hasVen = ven.length > 0;
  const hasGan = gan.length > 0;
  const hasAny = hasInv || hasVen || hasGan;
  const hasDual = hasInv && hasVen;

  // merge inv vs ven por X
  const mergedDual = useMemo(() => {
    if (!hasDual) return [];
    const map = new Map<string, any>();
    inv.forEach(p => map.set(p.x, { x: p.x, inv: p.valor }));
    ven.forEach(p => {
      const ex = map.get(p.x) || { x: p.x };
      ex.ven = p.valor;
      map.set(p.x, ex);
    });
    return Array.from(map.values());
  }, [hasDual, inv, ven]);

  // Formato de ticks compacto
  const axFmt = (v: any) => {
    if (typeof v !== 'number') return String(v);
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    const body = abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : `${abs}`;
    return `${sign}$${body}`;
  };

  const yTick = { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 };
  const xTick = { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 };

  const anim = {
    isAnimationActive: animated && mounted,
    animationDuration: 900,
    animationEasing: 'ease-out' as const,
    animationBegin: 200,
  };

  const gridColor = alpha(theme.palette.divider, 0.2);

  // --- Dominio dinámico + 0 forzado ---
  const expandDomain = (min: number, max: number): [number, number] => {
    const range = Math.max(1, max - min);
    const pad = Math.max(1, Math.round(range * 0.1));
    let lo = min - pad;
    let hi = max + pad;
    if (lo > 0) lo = 0;
    if (hi < 0) hi = 0;
    return [lo, hi];
  };

  const getDomainForSingle = (data: any[], key: string): [number, number] => {
    const vals = data.map(d => Number(d?.[key] ?? 0)).filter((n) => Number.isFinite(n));
    if (!vals.length) return [-1, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return expandDomain(min, max);
  };

  const getDomainForDual = (data: any[]): [number, number] => {
    const vals: number[] = [];
    data.forEach(d => {
      if (Number.isFinite(d.inv)) vals.push(Number(d.inv));
      if (Number.isFinite(d.ven)) vals.push(Number(d.ven));
    });
    if (!vals.length) return [-1, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return expandDomain(min, max);
  };

  // ticks "bonitos" que siempre incluyen 0
  const niceStep = (raw: number) => {
    if (!isFinite(raw) || raw <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const base = raw / pow;
    const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    return niceBase * pow;
  };
  const buildTicks = (min: number, max: number, target = 6): number[] => {
    const span = Math.max(1, max - min);
    const step = niceStep(span / Math.max(2, target - 1));
    let start = Math.floor(min / step) * step;
    let end = Math.ceil(max / step) * step;
    if (start > 0) start = 0;
    if (end < 0) end = 0;
    const ticks: number[] = [];
    for (let t = start; t <= end + 1e-9; t += step) ticks.push(+t.toFixed(6));
    if (!ticks.some(v => Math.abs(v) < 1e-9)) {
      ticks.push(0);
      ticks.sort((a,b)=>a-b);
    }
    return ticks;
  };

  const renderSingle = (data: any[], title: string, color: string, key: string) => {
    const [yMin, yMax] = getDomainForSingle(data, key);
    const yTicks = buildTicks(yMin, yMax);
    const zeroLine = <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />;

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={axFmt} tick={yTick} axisLine={false} tickLine={false} domain={[yMin, yMax]} ticks={yTicks} />
              {zeroLine}
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
              <Bar dataKey={key} name={title} fill={color} radius={[6, 6, 0, 0]} {...anim} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={data} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
              <defs>
                <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={axFmt} tick={yTick} axisLine={false} tickLine={false} domain={[yMin, yMax]} ticks={yTicks} />
              {zeroLine}
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
              <Area
                type="monotone"
                dataKey={key}
                name={title}
                stroke={color}
                fill={`url(#grad-${key})`}
                strokeWidth={2.8}
                dot={{ r: 4, fill: color, strokeWidth: 2, stroke: theme.palette.background.paper }}
                activeDot={{ r: 6, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 }}
                {...anim}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'radar': {
        const radarData = (data || []).reduce((acc: any[], cur: any) => {
          const cat = cur.categoria || cur.x || '';
          const ex = acc.find((i) => i.categoria === cat);
          if (ex) ex.valor += cur[key];
          else acc.push({ categoria: cat, valor: cur[key] });
          return acc;
        }, []);
        if (!radarData.length)
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 380 }}>
              <Typography color="text.secondary">Datos insuficientes para gráfico radar</Typography>
            </Box>
          );
        return (
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey="categoria" tick={{ ...xTick, fontSize: 11 }} />
              <PolarRadiusAxis tickFormatter={axFmt} tick={yTick} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  background: alpha(theme.palette.background.default, 0.95),
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                }}
                formatter={(v: number) => [formatCurrencyFull(v), 'Valor']}
              />
              <Radar name={title} dataKey="valor" stroke={color} fill={alpha(color, 0.5)} strokeWidth={2} {...anim} />
            </RadarChart>
          </ResponsiveContainer>
        );
      }
      default:
        return (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={data} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={axFmt} tick={yTick} axisLine={false} tickLine={false} domain={getDomainForSingle(data, key)} ticks={buildTicks(...getDomainForSingle(data, key))} />
              <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
              <Line type="monotone" dataKey={key} name={title} stroke={color} strokeWidth={3}
                dot={{ r: 4, fill: color, strokeWidth: 2, stroke: theme.palette.background.paper }}
                activeDot={{ r: 6, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 }}
                {...anim}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderDual = () => {
    if (!hasDual) return null;
    const [c1, c2] = COLORS;
    const [yMin, yMax] = getDomainForDual(mergedDual);
    const yTicks = buildTicks(yMin, yMax);

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={mergedDual} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={axFmt} tick={yTick} axisLine={false} tickLine={false} domain={[yMin, yMax]} ticks={yTicks} />
            <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
            <Bar dataKey="inv" name="Inversiones" fill={c1} radius={[6, 6, 0, 0]} {...anim} />
            <Bar dataKey="ven" name="Ventas" fill={c2} radius={[6, 6, 0, 0]} {...anim} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={mergedDual} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
            <defs>
              <linearGradient id="grad-inv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c1} stopOpacity={0.8} />
                <stop offset="95%" stopColor={c1} stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="grad-ven" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c2} stopOpacity={0.8} />
                <stop offset="95%" stopColor={c2} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={axFmt} tick={yTick} axisLine={false} tickLine={false} domain={[yMin, yMax]} ticks={yTicks} />
            <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
            <Area type="monotone" dataKey="inv" name="Inversiones" stroke={c1} fill="url(#grad-inv)" strokeWidth={2.8}
              dot={{ r: 4, fill: c1, strokeWidth: 2, stroke: theme.palette.background.paper }} {...anim} />
            <Area type="monotone" dataKey="ven" name="Ventas" stroke={c2} fill="url(#grad-ven)" strokeWidth={2.8}
              dot={{ r: 4, fill: c2, strokeWidth: 2, stroke: theme.palette.background.paper }} {...anim} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={mergedDual} margin={{ top: 20, right: 28, left: 12, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="x" tick={xTick} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={axFmt} tick={yTick} axisLine={false} tickLine={false} domain={[yMin, yMax]} ticks={yTicks} />
          <ReferenceLine y={0} stroke={alpha(theme.palette.text.secondary, 0.35)} strokeDasharray="4 4" />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend iconSize={12} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
          <Line type="monotone" dataKey="inv" name="Inversiones" stroke={c1} strokeWidth={3}
            dot={{ r: 4, fill: c1, strokeWidth: 2, stroke: theme.palette.background.paper }}
            activeDot={{ r: 6, fill: c1, stroke: theme.palette.background.paper, strokeWidth: 2 }} {...anim} />
          <Line type="monotone" dataKey="ven" name="Ventas" stroke={c2} strokeWidth={3}
            dot={{ r: 4, fill: c2, strokeWidth: 2, stroke: theme.palette.background.paper }}
            activeDot={{ r: 6, fill: c2, stroke: theme.palette.background.paper, strokeWidth: 2 }} {...anim} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (!hasAny) {
    return (
      <ChartContainer>
        <Typography variant="body1" color="text.secondary">
          No hay series para mostrar (aún). Si usas reporte de Temporada y tu backend no envía series mensuales, ahora se generarán a partir del comparativo por cosecha.
        </Typography>
      </ChartContainer>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <ChartSelector
        chartType={chartType}
        onChartTypeChange={setChartType}
        compare={compare}
        onToggleCompare={() => setCompare(v => !v)}
        hasDual={hasDual}
      />

      {compare && hasDual && (
        <ChartContainer delay={100}>
          <ChartTitle variant="h5" gutterBottom>
            Comparativa Inversiones vs Ventas
          </ChartTitle>
          {renderDual()}
        </ChartContainer>
      )}

      {!compare && hasInv && (
        <ChartContainer delay={200}>
          <ChartTitle variant="h5" gutterBottom>
            Inversiones
          </ChartTitle>
          {renderSingle(inv, 'Inversiones', COLORS[0], 'valor')}
        </ChartContainer>
      )}

      {!compare && hasVen && (
        <ChartContainer delay={300}>
          <ChartTitle variant="h5" gutterBottom>
            Ventas
          </ChartTitle>
          {renderSingle(ven, 'Ventas', COLORS[1], 'valor')}
        </ChartContainer>
      )}

      {!compare && hasGan && (
        <ChartContainer delay={400}>
          <ChartTitle variant="h5" gutterBottom>
            Ganancias
          </ChartTitle>
          {renderSingle(gan, 'Ganancias', COLORS[2], 'valor')}
        </ChartContainer>
      )}
    </Box>
  );
}
