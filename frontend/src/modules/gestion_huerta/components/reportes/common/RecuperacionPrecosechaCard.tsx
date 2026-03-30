import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  AccountBalanceWallet,
  CheckCircleOutline,
  HourglassBottom,
  Timeline,
  TrendingUp,
} from '@mui/icons-material';

import type { RecuperacionPrecosechaData } from '../../../types/reportesProduccionTypes';
import { formatCurrency, formatNumber } from '../../../../../global/utils/formatters';

interface Props {
  data?: RecuperacionPrecosechaData;
}

const labelByState: Record<RecuperacionPrecosechaData['estado'], 'default' | 'warning' | 'success' | 'info'> = {
  sin_precosecha: 'default',
  sin_recuperacion: 'warning',
  recuperando: 'info',
  recuperada: 'success',
  con_excedente: 'success',
};

const RecuperacionPrecosechaCard: React.FC<Props> = ({ data }) => {
  const theme = useTheme();

  if (!data) return null;

  const percentage = Math.max(0, Math.min(Number(data.porcentaje || 0), 100));
  const progressColor =
    data.estado === 'sin_recuperacion'
      ? theme.palette.warning.main
      : data.estado === 'recuperando'
        ? theme.palette.info.main
        : theme.palette.success.main;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        mb: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        background:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.9)
            : `linear-gradient(160deg, ${alpha('#fff8ec', 0.9)} 0%, ${alpha('#eef7ff', 0.9)} 100%)`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800} color="primary">
              Recuperacion de PreCosecha
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Esta recuperacion se calcula con la ganancia operativa acumulada de la temporada.
            </Typography>
          </Box>
          <Chip
            icon={
              data.estado === 'con_excedente' || data.estado === 'recuperada'
                ? <CheckCircleOutline />
                : data.estado === 'recuperando'
                  ? <Timeline />
                  : <HourglassBottom />
            }
            color={labelByState[data.estado]}
            label={data.estado_label}
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />}
        >
          <Box sx={{ flex: 1 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Precosecha invertida
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {formatCurrency(data.total_invertido)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Ganancia operativa acumulada
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {formatCurrency(data.ganancia_operativa_acumulada)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWallet color="success" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Recuperado hasta hoy
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="success.main">
                    {formatCurrency(data.recuperado)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HourglassBottom color="warning" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pendiente por recuperar
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="warning.main">
                    {formatCurrency(data.pendiente)}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Avance de recuperacion
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {formatNumber(percentage)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    mt: 1,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: alpha(progressColor, 0.15),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      backgroundColor: progressColor,
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="info" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Excedente post-precosecha
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="info.main">
                    {formatCurrency(data.excedente)}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary">
          {data.formula}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default RecuperacionPrecosechaCard;
