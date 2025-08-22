// frontend/src/modules/gestion_huerta/components/reportes/common/ReportChart.tsx
import { Card, CardContent, Typography } from '@mui/material';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { Serie } from '../../../types/reportTypes';
import { formatCurrency } from '../../../../../global/utils/formatters';

interface Props {
  title: string;
  serie: Serie;
}

export default function ReportChart({ title, serie }: Props) {
  const isLine = serie.type === 'line';

  return (
    <Card sx={{ height: 360, borderRadius: 3 }}>
      <CardContent sx={{ height: '100%' }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          {isLine ? (
            <LineChart data={serie.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="total" />
            </LineChart>
          ) : (
            <BarChart data={serie.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="total" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
