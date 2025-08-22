// frontend/src/modules/gestion_huerta/components/reportes/common/KPICard.tsx
import { Card, CardContent, Typography, Box } from '@mui/material';
import { formatCurrency, formatNumber, formatPercentage } from '../../../../../global/utils/formatters';

type Mode = 'currency' | 'number' | 'percent';

interface Props {
  label: string;
  value: number;
  mode?: Mode;
}

const render = (v: number, mode?: Mode) => {
  if (mode === 'currency') return formatCurrency(v);
  if (mode === 'percent') return formatPercentage(v);
  return formatNumber(v);
};

export default function KPICard({ label, value, mode = 'number' }: Props) {
  return (
    <Card sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {render(value, mode)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
