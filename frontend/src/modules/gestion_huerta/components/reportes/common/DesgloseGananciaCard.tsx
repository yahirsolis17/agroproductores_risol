// frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx
import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  Avatar,
  Paper,
  Grid,
  LinearProgress,
  useTheme
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  InfoOutlined,
  TrendingUp,
  TrendingDown,
  Calculate,
  EmojiEvents,
  LocalOffer,
  ShoppingCart,
  Inventory,
  Agriculture
} from '@mui/icons-material';
import { formatCurrency, formatNumber } from '../../../../../global/utils/formatters';

interface Props {
  /** Totales "brutos" */
  ventasTotales?: number;
  gastosVenta?: number;
  inversionTotal?: number;

  /** Si no vienen, se calculan */
  ventasNetas?: number;
  gananciaNetaCalculada?: number;
  roiCalculado?: number;

  /** KPIs informados por backend (opcionales, para comparar) */
  gananciaNetaKpi?: number;
  roiKpi?: number;

  /** UI */
  title?: string;
  subtitle?: string;
  dense?: boolean;
  onOpenGlosario?: () => void;
}

const CardRoot = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  background:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.9)
      : `linear-gradient(160deg, ${alpha('#f5fdf0', 0.5)} 0%, ${alpha('#f0f8ff', 0.7)} 100%)`,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  overflow: 'visible',
}));

const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  backgroundColor: alpha(theme.palette.background.paper, 0.7),
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  marginBottom: theme.spacing(2),
}));

const ValueHighlight = styled(Typography)(({ theme }) => ({
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 800,
  fontSize: '1.4rem',
  color: theme.palette.text.primary,
  textAlign: 'right',
  background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
  padding: theme.spacing(0.5, 1),
  borderRadius: 8,
}));

const KpiIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0.5, 1),
  borderRadius: 16,
  backgroundColor: alpha(theme.palette.info.main, 0.1),
  fontSize: '0.75rem',
  fontWeight: 600,
  marginTop: theme.spacing(0.5),
}));

const ProgressBarWithLabel = ({ value, max, positive }) => {
  const theme = useTheme();
  const percentage = Math.min(100, Math.max(0, (Math.abs(value) / Math.abs(max)) * 100));
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: alpha(positive ? theme.palette.success.main : theme.palette.error.main, 0.2),
            '& .MuiLinearProgress-bar': {
              backgroundColor: positive ? theme.palette.success.main : theme.palette.error.main,
              borderRadius: 4,
            }
          }}
        />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">
          {`${percentage.toFixed(0)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

const DesgloseGananciaCard: React.FC<Props> = ({
  ventasTotales = 0,
  gastosVenta = 0,
  inversionTotal = 0,
  ventasNetas,
  gananciaNetaCalculada,
  gananciaNetaKpi,
  roiCalculado,
  roiKpi,
  title = '¿Cómo se calcula tu ganancia?',
  subtitle,
  dense = false,
  onOpenGlosario,
}) => {
  const theme = useTheme();

  const netas = useMemo(
    () => (typeof ventasNetas === 'number' ? ventasNetas : (ventasTotales || 0) - (gastosVenta || 0)),
    [ventasNetas, ventasTotales, gastosVenta]
  );

  const ganancia = useMemo(
    () =>
      typeof gananciaNetaCalculada === 'number'
        ? gananciaNetaCalculada
        : netas - (inversionTotal || 0),
    [gananciaNetaCalculada, netas, inversionTotal]
  );

  const roi = useMemo(() => {
    const base =
      typeof roiCalculado === 'number'
        ? roiCalculado
        : inversionTotal
        ? (ganancia / inversionTotal) * 100
        : 0;
    const rounded = Number.isFinite(base) ? Math.round(base * 100) / 100 : 0;
    return rounded;
  }, [roiCalculado, ganancia, inversionTotal]);

  const isPositive = ganancia >= 0;

  return (
    <CardRoot elevation={0}>
      <CardHeader
        avatar={<Agriculture color="primary" />}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant={dense ? 'h6' : 'h5'} fontWeight={800} color="primary">
              {title}
            </Typography>
            <Chip
              icon={isPositive ? <TrendingUp /> : <TrendingDown />}
              label={isPositive ? '¡Ganancia!' : 'Pérdida'}
              color={isPositive ? 'success' : 'error'}
              variant="filled"
              sx={{ fontWeight: 800, fontSize: dense ? '0.8rem' : '0.9rem' }}
            />
          </Box>
        }
        subheader={
          subtitle || (
            <Typography variant="body2" color="text.secondary">
              Sigue el proceso paso a paso para entender cómo se calcula tu ganancia neta
            </Typography>
          )
        }
        action={
          <Tooltip title="Explicación de términos">
            <IconButton
              onClick={onOpenGlosario}
              size="small"
              color="primary"
              disabled={!onOpenGlosario}
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                }
              }}
            >
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0 }}>
        {/* Paso 1: Ventas netas */}
        <SectionPaper elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, mr: 1.5 }}>
              <Typography variant="body2" fontWeight="bold">1</Typography>
            </Avatar>
            <Typography variant="h6" fontWeight={600}>Ventas Netas</Typography>
          </Box>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingCart color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight={500}>
                  Ventas Totales
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <ValueHighlight>
                {formatCurrency(ventasTotales)}
              </ValueHighlight>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalOffer color="error" sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight={500}>
                  Gastos de Venta
                </Typography>
              </Box>
              <ProgressBarWithLabel value={gastosVenta} max={ventasTotales} positive={false} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ValueHighlight sx={{ color: 'error.main' }}>
                -{formatCurrency(gastosVenta)}
              </ValueHighlight>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1.5 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Inventory color="success" sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight={600}>
                  Ventas Netas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <ValueHighlight sx={{ color: 'success.main', fontSize: '1.6rem' }}>
                {formatCurrency(netas)}
              </ValueHighlight>
            </Grid>
          </Grid>
        </SectionPaper>

        {/* Paso 2: Ganancia Neta */}
        <SectionPaper elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, mr: 1.5 }}>
              <Typography variant="body2" fontWeight="bold">2</Typography>
            </Avatar>
            <Typography variant="h6" fontWeight={600}>Ganancia Neta</Typography>
          </Box>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Inventory color="success" sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight={500}>
                  Ventas Netas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <ValueHighlight sx={{ color: 'success.main' }}>
                {formatCurrency(netas)}
              </ValueHighlight>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingCart color="error" sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight={500}>
                  Inversión Total
                </Typography>
              </Box>
              <ProgressBarWithLabel value={inversionTotal} max={netas} positive={false} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ValueHighlight sx={{ color: 'error.main' }}>
                -{formatCurrency(inversionTotal)}
              </ValueHighlight>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1.5 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmojiEvents 
                  sx={{ 
                    mr: 1,
                    color: isPositive ? 'success.main' : 'error.main'
                  }} 
                />
                <Typography variant="body1" fontWeight={700}>
                  Ganancia Neta
                </Typography>
              </Box>
              {typeof gananciaNetaKpi === 'number' && (
                <KpiIndicator>
                  Meta: {formatCurrency(gananciaNetaKpi)}
                </KpiIndicator>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <ValueHighlight 
                sx={{ 
                  color: isPositive ? 'success.main' : 'error.main',
                  fontSize: '2rem'
                }}
              >
                {formatCurrency(ganancia)}
              </ValueHighlight>
            </Grid>
          </Grid>
        </SectionPaper>

        {/* ROI Section */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mt: 2,
          p: 2,
          borderRadius: 3,
          backgroundColor: alpha(isPositive ? theme.palette.success.main : theme.palette.error.main, 0.1)
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Calculate sx={{ mr: 1, color: isPositive ? 'success.main' : 'error.main' }} />
            <Box>
              <Typography variant="body1" fontWeight={700}>
                Retorno de Inversión (ROI)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cada $1 invertido generó ${(roi/100).toFixed(2)}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ textAlign: 'right' }}>
            <Typography 
              variant="h5" 
              fontWeight={800} 
              color={isPositive ? 'success.main' : 'error.main'}
            >
              {formatNumber(roi)}%
            </Typography>
            {typeof roiKpi === 'number' && (
              <Typography variant="caption" color="text.secondary">
                Meta: {formatNumber(roiKpi)}%
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </CardRoot>
  );
};

export default DesgloseGananciaCard;