// frontend/src/modules/gestion_huerta/components/reportes/common/ReporteProduccionViewer.tsx
import React from 'react';
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
  Skeleton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
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

interface Props {
  data?: ReporteProduccionData;
  loading?: boolean;
  error?: string;
  title: string;
  subtitle?: string;
}

const KPICard: React.FC<{ kpi: KPIData }> = ({ kpi }) => (
  <Card elevation={2}>
    <CardContent>
      <Typography variant="h6" component="div" gutterBottom>
        {kpi.label}
      </Typography>
      <Typography variant="h4" color="primary" fontWeight="bold">
        {kpi.format === 'currency' && typeof kpi.value === 'number'
          ? formatCurrency(kpi.value)
          : kpi.format === 'percentage' && typeof kpi.value === 'number'
          ? `${formatNumber(kpi.value)}%`
          : typeof kpi.value === 'number'
          ? formatNumber(kpi.value)
          : kpi.value}
      </Typography>
      {kpi.trend && (
        <Typography
          variant="body2"
          color={
            kpi.trend.direction === 'up'
              ? 'success.main'
              : kpi.trend.direction === 'down'
              ? 'error.main'
              : 'text.secondary'
          }
        >
          {kpi.trend.direction === 'up' ? '↗' : kpi.trend.direction === 'down' ? '↘' : '→'} {formatNumber(kpi.trend.value)}%
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ChartComponent: React.FC<{ data: SeriesDataPoint[]; title: string; type?: 'line' | 'bar' }> = ({ data, title, type = 'line' }) => {
  const theme = useTheme();
  const color = theme.palette.primary.main;

  // Preparar datos para el chart con etiqueta "dd MMM yy"
  const chartData = (data || []).map(point => {
    const d = parseLocalDateStrict(point.fecha);
    const label = isNaN(d.getTime())
      ? point.fecha
      : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }).format(d);
    return {
      x: label,
      valor: Number(point.valor || 0),
      categoria: point.categoria || '',
    };
  });

  const currencyTooltip = (value: any) => formatCurrency(Number(value));
  const yTick = (v: number) => (Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`);

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" />
          <YAxis tickFormatter={yTick} />
          <RTooltip formatter={currencyTooltip as any} />
          <Legend />
          <Bar dataKey="valor" name={title} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis tickFormatter={yTick} />
        <RTooltip formatter={currencyTooltip as any} />
        <Legend />
        <Line type="monotone" dataKey="valor" name={title} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const InversionesTable: React.FC<{ inversiones: TablaInversion[] }> = ({ inversiones }) => (
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Typography variant="h6" gutterBottom>Inversiones</Typography>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Categoría</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">Monto</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {inversiones.map((inv) => {
            const d = parseLocalDateStrict(inv.fecha);
            return (
              <TableRow key={inv.id}>
                <TableCell>{isNaN(d.getTime()) ? inv.fecha : new Intl.DateTimeFormat('es-MX').format(d)}</TableCell>
                <TableCell>{inv.categoria}</TableCell>
                <TableCell>{inv.descripcion}</TableCell>
                <TableCell align="right">{formatCurrency(inv.monto)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

const VentasTable: React.FC<{ ventas: TablaVenta[] }> = ({ ventas }) => (
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Typography variant="h6" gutterBottom>Ventas</Typography>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">Cantidad</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">Precio Unitario</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Comprador</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ventas.map((v) => {
            const d = parseLocalDateStrict(v.fecha);
            return (
              <TableRow key={v.id}>
                <TableCell>{isNaN(d.getTime()) ? v.fecha : new Intl.DateTimeFormat('es-MX').format(d)}</TableCell>
                <TableCell align="right">{formatNumber(v.cantidad)}</TableCell>
                <TableCell align="right">{formatCurrency(v.precio_unitario)}</TableCell>
                <TableCell align="right">{formatCurrency(v.total)}</TableCell>
                <TableCell>{v.comprador || '-'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

export default function ReporteProduccionViewer({ data, loading = false, error, title, subtitle }: Props) {
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          {[1,2,3,4].map((i) => (<Box key={i} sx={{ flex: '1 1 250px', minWidth: '250px' }}><Skeleton variant="rectangular" height={120} /></Box>))}
        </Box>
        <Skeleton variant="rectangular" height={300} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={200} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No hay datos disponibles para mostrar.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>{title}</Typography>
        {subtitle && <Typography variant="subtitle1" color="text.secondary">{subtitle}</Typography>}
      </Box>

      {/* KPIs */}
      {!!data.kpis?.length && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          {data.kpis.map((kpi, i) => (
            <Box key={i} sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <KPICard kpi={kpi} />
            </Box>
          ))}
        </Box>
      )}

      {/* Charts */}
      {data.series && (
        <Box sx={{ mb: 4 }}>
          {!!data.series.inversiones?.length && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Inversiones por día (totales)</Typography>
              <ChartComponent data={data.series.inversiones} title="Inversiones" type="bar" />
            </Paper>
          )}
          {!!data.series.ventas?.length && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Ventas por día (totales)</Typography>
              <ChartComponent data={data.series.ventas} title="Ventas" type="line" />
            </Paper>
          )}
          {!!data.series.ganancias?.length && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Ganancias por día (totales)</Typography>
              <ChartComponent data={data.series.ganancias} title="Ganancias" type="line" />
            </Paper>
          )}
        </Box>
      )}

      {/* Tables */}
      {data.tablas && (
        <Box>
          {!!data.tablas.inversiones?.length && <InversionesTable inversiones={data.tablas.inversiones} />}
          {!!data.tablas.ventas?.length && <VentasTable ventas={data.tablas.ventas} />}
        </Box>
      )}
    </Box>
  );
}
