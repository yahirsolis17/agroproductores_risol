// frontend/modules/gestion_huerta/components/reportes/common/ReportChart.tsx
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { Serie } from '../../../types/reportTypes';

interface Props {
  serie: Serie;
}

const ReportChart: React.FC<Props> = ({ serie }) => (
  <ResponsiveContainer width="100%" height={300}>
    {serie.type === 'bar' ? (
      <BarChart data={serie.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="y" fill="#8884d8" />
      </BarChart>
    ) : (
      <LineChart data={serie.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="y" stroke="#82ca9d" />
      </LineChart>
    )}
  </ResponsiveContainer>
);

export default ReportChart;

