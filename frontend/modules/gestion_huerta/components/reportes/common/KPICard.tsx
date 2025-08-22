// frontend/modules/gestion_huerta/components/reportes/common/KPICard.tsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import type { KPI } from '../../../types/reportTypes';

interface Props {
  kpi: KPI;
}

const KPICard: React.FC<Props> = ({ kpi }) => (
  <Card sx={{ minWidth: 200 }} variant="outlined">
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {kpi.label}
      </Typography>
      <Typography variant="h5" color="primary">
        {kpi.value.toLocaleString('es-MX')}
      </Typography>
      {kpi.hint && (
        <Typography variant="caption" color="text.secondary">
          {kpi.hint}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default KPICard;

