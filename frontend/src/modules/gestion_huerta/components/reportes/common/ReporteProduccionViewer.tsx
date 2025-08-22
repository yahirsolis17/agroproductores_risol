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
import { ReportPayload, KPI, Serie, Tabla } from '../../../types/reportTypes.d';

interface Props {
  data?: ReportPayload;
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

const KPICard: React.FC<{ kpi: KPI }> = ({ kpi }) => (
  <Card elevation={2}>
    <CardContent>
      <Typography variant="h6" component="div" gutterBottom>
        {kpi.label}
      </Typography>
      <Typography variant="h4" color="primary" fontWeight="bold">
        {typeof kpi.value === 'number' && kpi.label.toLowerCase().includes('total')
          ? formatCurrency(kpi.value)
          : formatNumber(kpi.value)}
      </Typography>
    </CardContent>
  </Card>
);

const ChartComponent: React.FC<{ serie: Serie }> = ({ serie }) => {
  const chartData = serie.data.map(point => ({
    ...point,
    month: point.month,
    total: point.total,
    temp: point.temp || 0,
  }));

  if (serie.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Bar dataKey="total" fill="#8884d8" name={serie.label} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke="#8884d8" 
          strokeWidth={2}
          name={serie.label}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const TableComponent: React.FC<{ tabla: Tabla; title: string }> = ({ tabla, title }) => (
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {tabla.columns.map((column, index) => (
              <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tabla.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>
                  {typeof cell === 'number' && tabla.columns[cellIndex]?.toLowerCase().includes('total')
                    ? formatCurrency(cell)
                    : cell}
                </TableCell>
              ))}
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
          {data.kpis.map((kpi) => (
            <Box key={kpi.id} sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <KPICard kpi={kpi} />
            </Box>
          ))}
        </Box>
      )}

      {/* Charts */}
      {data.series && data.series.length > 0 && (
        <Box sx={{ mb: 4 }}>
          {data.series.map((serie) => (
            <Paper key={serie.id} elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {serie.label}
              </Typography>
              <ChartComponent serie={serie} />
            </Paper>
          ))}
        </Box>
      )}

      {/* Tables */}
      {data.tabla && (
        <Box>
          {/* Para reportes de cosecha que tienen inversiones y ventas */}
          {data.tabla.inversiones && data.tabla.ventas ? (
            <>
              <TableComponent tabla={data.tabla.inversiones} title="Inversiones" />
              <TableComponent tabla={data.tabla.ventas} title="Ventas" />
            </>
          ) : (
            /* Para reportes de temporada y perfil de huerta */
            <TableComponent tabla={data.tabla} title="Detalles" />
          )}
        </Box>
      )}
    </Box>
  );
}
