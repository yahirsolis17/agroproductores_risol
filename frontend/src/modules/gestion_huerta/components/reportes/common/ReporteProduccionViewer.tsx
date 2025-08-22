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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ReporteProduccionData, KPIData, SeriesDataPoint, TablaInversion, TablaVenta } from '../../../types/reportesProduccionTypes';

interface Props {
  data?: ReporteProduccionData;
  loading?: boolean;
  error?: string;
  title: string;
  subtitle?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-MX').format(value);
};

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
          ? `${kpi.value}%`
          : typeof kpi.value === 'number'
          ? formatNumber(kpi.value)
          : kpi.value}
      </Typography>
      {kpi.trend && (
        <Typography 
          variant="body2" 
          color={kpi.trend.direction === 'up' ? 'success.main' : kpi.trend.direction === 'down' ? 'error.main' : 'text.secondary'}
        >
          {kpi.trend.direction === 'up' ? '↗' : kpi.trend.direction === 'down' ? '↘' : '→'} {kpi.trend.value}%
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ChartComponent: React.FC<{ data: SeriesDataPoint[]; title: string; type?: 'line' | 'bar' }> = ({ data, title, type = 'line' }) => {
  const chartData = data.map(point => ({
    fecha: new Date(point.fecha).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
    valor: point.valor,
    categoria: point.categoria || '',
  }));

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Bar dataKey="valor" fill="#8884d8" name={title} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" />
        <YAxis />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="valor" 
          stroke="#8884d8" 
          strokeWidth={2}
          name={title}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const InversionesTable: React.FC<{ inversiones: TablaInversion[] }> = ({ inversiones }) => (
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Typography variant="h6" gutterBottom>
      Inversiones
    </Typography>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Categoría</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Monto</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {inversiones.map((inversion) => (
            <TableRow key={inversion.id}>
              <TableCell>{new Date(inversion.fecha).toLocaleDateString('es-MX')}</TableCell>
              <TableCell>{inversion.categoria}</TableCell>
              <TableCell>{inversion.descripcion}</TableCell>
              <TableCell>{formatCurrency(inversion.monto)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

const VentasTable: React.FC<{ ventas: TablaVenta[] }> = ({ ventas }) => (
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Typography variant="h6" gutterBottom>
      Ventas
    </Typography>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Precio Unitario</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Comprador</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ventas.map((venta) => (
            <TableRow key={venta.id}>
              <TableCell>{new Date(venta.fecha).toLocaleDateString('es-MX')}</TableCell>
              <TableCell>{formatNumber(venta.cantidad)}</TableCell>
              <TableCell>{formatCurrency(venta.precio_unitario)}</TableCell>
              <TableCell>{formatCurrency(venta.total)}</TableCell>
              <TableCell>{venta.comprador || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

export default function ReporteProduccionViewer({
  data,
  loading = false,
  error,
  title,
  subtitle,
}: Props) {
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <Skeleton variant="rectangular" height={120} />
            </Box>
          ))}
        </Box>
        
        <Skeleton variant="rectangular" height={300} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={200} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No hay datos disponibles para mostrar.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="subtitle1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* KPIs */}
      {data.kpis && data.kpis.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          {data.kpis.map((kpi, index) => (
            <Box key={index} sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <KPICard kpi={kpi} />
            </Box>
          ))}
        </Box>
      )}

      {/* Charts */}
      {data.series && (
        <Box sx={{ mb: 4 }}>
          {data.series.inversiones && data.series.inversiones.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Inversiones por Período
              </Typography>
              <ChartComponent data={data.series.inversiones} title="Inversiones" type="bar" />
            </Paper>
          )}
          {data.series.ventas && data.series.ventas.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ventas por Período
              </Typography>
              <ChartComponent data={data.series.ventas} title="Ventas" type="line" />
            </Paper>
          )}
          {data.series.ganancias && data.series.ganancias.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ganancias por Período
              </Typography>
              <ChartComponent data={data.series.ganancias} title="Ganancias" type="line" />
            </Paper>
          )}
        </Box>
      )}

      {/* Tables */}
      {data.tablas && (
        <Box>
          {data.tablas.inversiones && data.tablas.inversiones.length > 0 && (
            <InversionesTable inversiones={data.tablas.inversiones} />
          )}
          {data.tablas.ventas && data.tablas.ventas.length > 0 && (
            <VentasTable ventas={data.tablas.ventas} />
          )}
        </Box>
      )}
    </Box>
  );
}
