// frontend/src/modules/gestion_huerta/components/reportes/common/ReporteProduccionViewerTables.tsx
import React, { useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Chip,
  Box,
  TableFooter,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Tooltip,
  IconButton,
  LinearProgress,
  Divider,
} from '@mui/material';
import { keyframes, alpha, useTheme, styled } from '@mui/material/styles';
import {
  TrendingDown,
  LocalOffer,
  Inventory,
  InfoOutlined,
  EmojiEvents,
  CompareArrows,
} from '@mui/icons-material';
import {
  TablaInversion,
  TablaVenta,
  FilaComparativoCosecha,
  FilaResumenHistorico,
  AnalisisCategoria,
  AnalisisVariedad,
} from '../../types/reportesProduccionTypes';
import { parseLocalDateStrict, formatDateLongEs } from '../../../../global/utils/date';
import { formatCurrency, formatNumber } from '../../../../global/utils/formatters';

interface Props {
  inversiones?: TablaInversion[];
  ventas?: TablaVenta[];
  comparativo_cosechas?: FilaComparativoCosecha[];
  resumen_historico?: FilaResumenHistorico[];
  /** NUEVO: análisis calculados por backend */
  analisis_categorias?: AnalisisCategoria[];
  analisis_variedades?: AnalisisVariedad[];
}

type Order = 'asc' | 'desc';

/* ================= Animaciones ================= */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
const slideIn = keyframes`
  from { transform: translateX(-10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

/* ================= Estilos ================= */
const SummaryCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
    theme.palette.background.paper,
    0.95
  )} 100%)`,
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease',
  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' },
}));

const Block = styled(Paper, { shouldForwardProp: (prop) => prop !== 'delay' })<{ delay?: number }>(
  ({ theme, delay = 0 }) => ({
    padding: theme.spacing(0),
    marginBottom: theme.spacing(4),
    borderRadius: 16,
    background:
      theme.palette.mode === 'dark'
        ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
            theme.palette.background.paper,
            0.95
          )} 100%)`
        : `linear-gradient(145deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8f9fa', 0.98)} 100%)`,
    backgroundSize: '200% 200%',
    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
    transition: 'transform .25s ease, box-shadow .25s ease',
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    overflow: 'hidden',
    position: 'relative',
    animation: `${fadeIn} .4s ease-out ${delay}ms both`,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      backgroundSize: '200% 200%',
      opacity: 0.8,
      borderRadius: '4px 4px 0 0',
    },
  })
);

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 12,
  overflow: 'hidden',
  transition: 'all .3s ease',
  '&:hover': { boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}` },
}));

const StyledTable = styled(Table)(({ theme }) => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-head': {
    fontWeight: 700,
    fontSize: '0.9rem',
    background: alpha(theme.palette.background.paper, 0.95),
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    padding: theme.spacing(1.5),
    '&:first-of-type': { borderTopLeftRadius: 12 },
    '&:last-of-type': { borderTopRightRadius: 12 },
  },
  '& .MuiTableCell-body': {
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    transition: 'background-color .2s ease, color .2s ease',
  },
  '& .MuiTableRow-root': {
    transition: 'all .2s ease',
    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04), '& td': { fontWeight: 600 } },
    '&:last-child .MuiTableCell-body': { borderBottom: 'none' },
  },
}));

const StyledTableSortLabel = styled(TableSortLabel)(({ theme }) => ({
  '&.MuiTableSortLabel-root': {
    color: theme.palette.text.primary,
    '&:hover': { color: theme.palette.primary.main },
  },
  '&.Mui-active': { color: theme.palette.primary.main, '& .MuiTableSortLabel-icon': { color: theme.palette.primary.main } },
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600,
  borderRadius: 12,
  padding: theme.spacing(0.25, 0.5),
  transition: 'all .3s cubic-bezier(.4,0,.2,1)',
  animation: `${fadeIn} .5s ease-out`,
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' },
}));

const TableTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  display: 'inline-block',
  marginBottom: theme.spacing(2),
  position: 'relative',
  paddingLeft: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    height: '70%',
    width: 4,
    background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: 4,
  },
}));

/* ================= Helpers de orden ================= */
function descendingComparator<T>(a: T, b: T, orderBy: keyof T, valueGetter?: (x: T) => number | string) {
  const va = valueGetter ? valueGetter(a) : (a[orderBy] as any);
  const vb = valueGetter ? valueGetter(b) : (b[orderBy] as any);
  const _va = (va ?? '') as any;
  const _vb = (vb ?? '') as any;
  if (_vb < _va) return -1;
  if (_vb > _va) return 1;
  return 0;
}
function getComparator<T>(order: Order, orderBy: keyof T, valueGetter?: (x: T) => number | string) {
  return order === 'desc'
    ? (a: T, b: T) => descendingComparator(a, b, orderBy, valueGetter)
    : (a: T, b: T) => -descendingComparator(a, b, orderBy, valueGetter);
}
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number): T[] {
  const stabilized = array.map((el, index) => [el, index] as [T, number]);
  stabilized.sort((a, b) => {
    const cmp = comparator(a[0], b[0]);
    if (cmp !== 0) return cmp;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

/* =========================================================
   Inversiones
   ========================================================= */
const InversionesTable: React.FC<{ inversiones: TablaInversion[] }> = ({ inversiones }) => {
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof TablaInversion>('fecha');

  const rows = useMemo(() => {
    const comparator =
      orderBy === 'fecha'
        ? getComparator<TablaInversion>(order, orderBy, (x) => {
            const d = parseLocalDateStrict(x.fecha);
            return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
          })
        : getComparator<TablaInversion>(order, orderBy);
    return stableSort(inversiones, comparator);
  }, [inversiones, order, orderBy]);

  const subtotal = useMemo(() => inversiones.reduce((acc, it) => acc + Number(it?.monto || 0), 0), [inversiones]);

  const handleSort = (prop: keyof TablaInversion) => {
    const isAsc = orderBy === prop && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(prop);
  };

  // Distribución por categoría (barras)
  const categorias = useMemo(() => {
    const map = new Map<string, number>();
    inversiones.forEach((inv) => map.set(inv.categoria, (map.get(inv.categoria) || 0) + Number(inv.monto || 0)));
    return Array.from(map.entries()).map(([nombre, monto]) => ({
      nombre,
      monto,
      porcentaje: subtotal > 0 ? (monto / subtotal) * 100 : 0,
    }));
  }, [inversiones, subtotal]);

  return (
    <Block delay={100}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15), width: 48, height: 48 }}>
            <Inventory sx={{ color: theme.palette.primary.main }} />
          </Avatar>
        }
        title={<TableTitle variant="h5">Inversiones</TableTitle>}
        subheader="Detalle de todos los gastos e inversiones realizadas"
        action={
          <Tooltip title="Información sobre inversiones">
            <IconButton>
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 2 }}
      />

      <Box sx={{ px: 3, pb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Distribución por categoría:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          {categorias.map((cat, index) => (
            <Box key={cat.nombre} sx={{ animation: `${fadeIn} .5s ease-out ${index * 100}ms both` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2">{cat.nombre}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(cat.monto)} ({cat.porcentaje.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={cat.porcentaje}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  '& .MuiLinearProgress-bar': { backgroundColor: theme.palette.primary.main, borderRadius: 3 },
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      <CardContent sx={{ pt: 0 }}>
        <StyledTableContainer>
          <StyledTable size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={orderBy === 'fecha' ? order : false}>
                  <StyledTableSortLabel
                    active={orderBy === 'fecha'}
                    direction={orderBy === 'fecha' ? order : 'asc'}
                    onClick={() => handleSort('fecha')}
                  >
                    Fecha
                  </StyledTableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'categoria' ? order : false}>
                  <StyledTableSortLabel
                    active={orderBy === 'categoria'}
                    direction={orderBy === 'categoria' ? order : 'asc'}
                    onClick={() => handleSort('categoria')}
                  >
                    Categoría
                  </StyledTableSortLabel>
                </TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right" sortDirection={orderBy === 'monto' ? order : false}>
                  <StyledTableSortLabel
                    active={orderBy === 'monto'}
                    direction={orderBy === 'monto' ? order : 'asc'}
                    onClick={() => handleSort('monto')}
                  >
                    Monto
                  </StyledTableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((inv, index) => {
                const d = parseLocalDateStrict(inv.fecha);
                const fecha = d instanceof Date && !isNaN(d.getTime()) ? formatDateLongEs(d) : inv.fecha;
                return (
                  <TableRow key={inv.id} hover sx={{ animation: `${slideIn} .3s ease-out ${index * 50}ms both` }}>
                    <TableCell>{fecha}</TableCell>
                    <TableCell>
                      <StyledChip label={inv.categoria} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{inv.descripcion}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
                      }}
                    >
                      {formatCurrency(inv.monto)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Total Invertido
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatCurrency(subtotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </StyledTable>
        </StyledTableContainer>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            * <strong>Monto</strong>: inversión/gasto registrado para la fecha y categoría indicada.
          </Typography>
        </Box>
      </CardContent>
    </Block>
  );
};

/* =========================================================
   Ventas (incluye “gasto” si viene del backend)
   ========================================================= */
const VentasTable: React.FC<{ ventas: TablaVenta[] }> = ({ ventas }) => {
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof TablaVenta>('fecha');

  const rows = useMemo(() => {
    const comparator =
      orderBy === 'fecha'
        ? getComparator<TablaVenta>(order, orderBy, (x) => {
            const d = parseLocalDateStrict(x.fecha);
            return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
          })
        : getComparator<TablaVenta>(order, orderBy);
    return stableSort(ventas, comparator);
  }, [ventas, order, orderBy]);

  const subtotalCantidad = useMemo(() => ventas.reduce((acc, it) => acc + Number(it?.cantidad || 0), 0), [ventas]);
  const subtotalTotal = useMemo(() => ventas.reduce((acc, it) => acc + Number(it?.total || 0), 0), [ventas]);
  const subtotalGasto = useMemo(() => ventas.reduce((a, r) => a + Number(r?.gasto || 0), 0), [ventas]);
  const showGasto = subtotalGasto > 0;

  const handleSort = (prop: keyof TablaVenta) => {
    const isAsc = orderBy === prop && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(prop);
  };

  // ⚠️ Usado por tarjeta de resumen (evita TS6133)
  const precioPromedio = useMemo(() => (subtotalCantidad === 0 ? 0 : subtotalTotal / subtotalCantidad), [
    subtotalCantidad,
    subtotalTotal,
  ]);

  return (
    <Block delay={200}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), width: 48, height: 48 }}>
            <LocalOffer sx={{ color: theme.palette.success.main }} />
          </Avatar>
        }
        title={<TableTitle variant="h5">Ventas</TableTitle>}
        subheader="Detalle de todas las ventas realizadas"
        action={
          <Tooltip title="Información sobre ventas">
            <IconButton>
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 2 }}
      />

      {/* Tarjetas de resumen (usa precioPromedio) */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ width: { xs: '100%', sm: 'calc(33.333% - 16px)' } }}>
            <SummaryCard>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="overline">
                  Total Cajas Vendidas
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {formatNumber(subtotalCantidad)}
                </Typography>
              </CardContent>
            </SummaryCard>
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 'calc(33.333% - 16px)' } }}>
            <SummaryCard>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="overline">
                  Precio Promedio por Caja
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {formatCurrency(precioPromedio)}
                </Typography>
              </CardContent>
            </SummaryCard>
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 'calc(33.333% - 16px)' } }}>
            <SummaryCard>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="overline">
                  Total Vendido (Bruto)
                </Typography>
                <Typography variant="h5" fontWeight={800} color={theme.palette.success.main}>
                  {formatCurrency(subtotalTotal)}
                </Typography>
              </CardContent>
            </SummaryCard>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      <CardContent sx={{ pt: 0 }}>
        <StyledTableContainer>
          <StyledTable size="medium" stickyHeader sx={{ tableLayout: 'auto' }}>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={orderBy === 'fecha' ? order : false}>
                  <StyledTableSortLabel
                    active={orderBy === 'fecha'}
                    direction={orderBy === 'fecha' ? order : 'asc'}
                    onClick={() => handleSort('fecha')}
                  >
                    Fecha
                  </StyledTableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={orderBy === 'cantidad' ? order : false}>
                  <StyledTableSortLabel
                    active={orderBy === 'cantidad'}
                    direction={orderBy === 'cantidad' ? order : 'asc'}
                    onClick={() => handleSort('cantidad')}
                  >
                    Cantidad de Cajas
                  </StyledTableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={orderBy === 'precio_unitario' ? order : false}>
                  <StyledTableSortLabel
                    active={orderBy === 'precio_unitario'}
                    direction={orderBy === 'precio_unitario' ? order : 'asc'}
                    onClick={() => handleSort('precio_unitario')}
                  >
                    Precio por Caja
                  </StyledTableSortLabel>
                </TableCell>
                {showGasto && <TableCell align="right">Gasto</TableCell>}
                <TableCell align="right" sortDirection={orderBy === 'total' ? order : false}>
                  <StyledTableSortLabel
                    active={orderBy === 'total'}
                    direction={orderBy === 'total' ? order : 'asc'}
                    onClick={() => handleSort('total')}
                  >
                    Total
                  </StyledTableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((v, index) => {
                const d = parseLocalDateStrict(v.fecha);
                const fecha = d instanceof Date && !isNaN(d.getTime()) ? formatDateLongEs(d) : v.fecha;
                return (
                  <TableRow key={v.id} hover sx={{ animation: `${slideIn} .3s ease-out ${index * 50}ms both` }}>
                    <TableCell>{fecha}</TableCell>
                    <TableCell align="right" sx={{ pr: 3 }}>
                      {formatNumber(v.cantidad)}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 3 }}>
                      {formatCurrency(v.precio_unitario)}
                    </TableCell>
                    {showGasto && (
                      <TableCell align="right" sx={{ pr: 3 }}>
                        {v.gasto ? `-${formatCurrency(v.gasto)}` : '—'}
                      </TableCell>
                    )}
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        pr: 3,
                        color: theme.palette.mode === 'dark'
                          ? theme.palette.success.light
                          : theme.palette.success.dark,
                      }}
                    >
                      {formatCurrency(v.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell> </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatNumber(subtotalCantidad)}
                </TableCell>
                <TableCell />
                {showGasto && (
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    -{formatCurrency(subtotalGasto)}
                  </TableCell>
                )}
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatCurrency(subtotalTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </StyledTable>
        </StyledTableContainer>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            * <strong>Total (venta bruta)</strong> = Cantidad de Cajas × Precio por Caja. La{' '}
            <em>Ganancia Neta</em> considera además <strong>Gastos de venta</strong> e <strong>Inversiones</strong>.
          </Typography>
        </Box>
      </CardContent>
    </Block>
  );
};

/* =========================================================
   NUEVO — Análisis por Categoría (Inversiones)
   ========================================================= */
const AnalisisCategoriasBlock: React.FC<{ rows: AnalisisCategoria[] }> = ({ rows }) => {
  const theme = useTheme();
  const total = useMemo(() => rows.reduce((a, r) => a + Number(r.monto || 0), 0), [rows]);

  return (
    <Block delay={220}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15), width: 48, height: 48 }}>
            <Inventory sx={{ color: theme.palette.primary.main }} />
          </Avatar>
        }
        title={<TableTitle variant="h5">Análisis por Categoría (Inversiones)</TableTitle>}
        subheader="Participación de cada categoría en la inversión total"
        action={
          <Tooltip title="Suma por categoría vs total invertido">
            <IconButton>
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 2 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <StyledTableContainer>
          <StyledTable size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Categoría</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="right">% del total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.categoria}-${i}`} hover>
                  <TableCell>{r.categoria}</TableCell>
                  <TableCell align="right">{formatCurrency(r.monto)}</TableCell>
                  <TableCell align="right">{formatNumber(r.porcentaje)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatCurrency(total)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  100%
                </TableCell>
              </TableRow>
            </TableFooter>
          </StyledTable>
        </StyledTableContainer>
      </CardContent>
    </Block>
  );
};

/* =========================================================
   NUEVO — Análisis por Variedad (Ventas)
   ========================================================= */
const AnalisisVariedadesBlock: React.FC<{ rows: AnalisisVariedad[] }> = ({ rows }) => {
  const theme = useTheme();
  const totCajas = useMemo(() => rows.reduce((a, r) => a + Number(r.cajas || 0), 0), [rows]);
  const totVentas = useMemo(() => rows.reduce((a, r) => a + Number(r.total || 0), 0), [rows]);

  return (
    <Block delay={240}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), width: 48, height: 48 }}>
            <LocalOffer sx={{ color: theme.palette.success.main }} />
          </Avatar>
        }
        title={<TableTitle variant="h5">Análisis por Variedad (Ventas)</TableTitle>}
        subheader="Cajas, precio promedio y aporte por variedad"
        action={
          <Tooltip title="Suma por variedad y su participación en ventas">
            <IconButton>
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 2 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <StyledTableContainer>
          <StyledTable size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Variedad</TableCell>
                <TableCell align="right">Cajas</TableCell>
                <TableCell align="right">Precio Prom.</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">% del total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.variedad}-${i}`} hover>
                  <TableCell>{r.variedad}</TableCell>
                  <TableCell align="right">{formatNumber(r.cajas)}</TableCell>
                  <TableCell align="right">{formatCurrency(r.precio_prom)}</TableCell>
                  <TableCell align="right">{formatCurrency(r.total)}</TableCell>
                  <TableCell align="right">{formatNumber(r.porcentaje)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Totales
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatNumber(totCajas)}
                </TableCell>
                <TableCell />
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatCurrency(totVentas)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  100%
                </TableCell>
              </TableRow>
            </TableFooter>
          </StyledTable>
        </StyledTableContainer>
      </CardContent>
    </Block>
  );
};

/* =========================================================
   Comparativo por Cosecha (con gastos, ventas netas y orden por reciente)
   ========================================================= */
type CompKey =
  | 'cosecha'
  | 'inversion'
  | 'ventas'
  | 'gastos'
  | 'ventasNetas'
  | 'gananciaNeta'
  | 'roi'
  | 'cajas';

// Extrae orden numérico de “Cosecha 6”, “2023-2024”, “2024”, etc.
const cosechaOrder = (label: any, fallbackIndex: number): number => {
  const s = String(label ?? '');
  const nums = s.match(/\d{4}|\d+/g);
  if (!nums || !nums.length) return fallbackIndex;
  return Math.max(...nums.map((n) => parseInt(n, 10)));
};

const ComparativoCosechasTable: React.FC<{ rows: FilaComparativoCosecha[] }> = ({ rows }) => {
  const theme = useTheme();

  // Por defecto ordenar por cosecha: más reciente arriba (desc).
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<CompKey>('cosecha');

  const columns: Array<{ key: CompKey; label: string; align: 'left' | 'right' }> = [
    { key: 'cosecha', label: 'Cosecha', align: 'left' },
    { key: 'ventas', label: 'Ventas brutas', align: 'right' },
    { key: 'gastos', label: 'Gastos de venta', align: 'right' },
    { key: 'ventasNetas', label: 'Ventas netas', align: 'right' },
    { key: 'inversion', label: 'Inversión', align: 'right' },
    { key: 'gananciaNeta', label: 'Ganancia neta', align: 'right' },
    { key: 'roi', label: 'ROI (%)', align: 'right' },
    { key: 'cajas', label: 'Cajas', align: 'right' },
  ];

  const getGastos = (r: any) => Number(r?.gastos_venta ?? r?.gasto_venta ?? r?.gastos ?? 0);
  const getVentasNetas = (r: FilaComparativoCosecha) => Number(r.ventas || 0) - getGastos(r);
  const getGananciaNeta = (r: FilaComparativoCosecha) => getVentasNetas(r) - Number(r.inversion || 0);
  const getRoi = (r: FilaComparativoCosecha) => {
    const inv = Number(r.inversion || 0);
    if (!inv) return 0;
    return (getGananciaNeta(r) / inv) * 100;
  };

  const valueOf = (r: FilaComparativoCosecha, key: CompKey, idx: number): number | string => {
    switch (key) {
      case 'cosecha':
        return cosechaOrder(r.cosecha, idx);
      case 'inversion':
        return Number(r.inversion || 0);
      case 'ventas':
        return Number(r.ventas || 0);
      case 'gastos':
        return getGastos(r);
      case 'ventasNetas':
        return getVentasNetas(r);
      case 'gananciaNeta':
        return getGananciaNeta(r);
      case 'roi':
        return getRoi(r);
      case 'cajas':
        return Number(r.cajas || 0);
      default:
        return '';
    }
  };

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const ia = rows.indexOf(a);
      const ib = rows.indexOf(b);
      const va = valueOf(a, orderBy, ia);
      const vb = valueOf(b, orderBy, ib);
      if (typeof va === 'number' && typeof vb === 'number') {
        return order === 'desc' ? vb - va : va - vb;
      }
      const sa = String(va);
      const sb = String(vb);
      return order === 'desc' ? sb.localeCompare(sa) : sa.localeCompare(sb);
    });
    return arr;
  }, [rows, order, orderBy]);

  const handleSort = (key: CompKey) => {
    const isAsc = orderBy === key && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(key);
  };

  const mejorCosecha = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].reduce((best, cur) => (getRoi(cur) > getRoi(best) ? cur : best));
  }, [rows]);
  const peorCosecha = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].reduce((worst, cur) => (getRoi(cur) < getRoi(worst) ? cur : worst));
  }, [rows]);

  return (
    <Block delay={300}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.15), width: 48, height: 48 }}>
            <CompareArrows sx={{ color: theme.palette.info.main }} />
          </Avatar>
        }
        title={<TableTitle variant="h5">Comparativo por Cosecha</TableTitle>}
        subheader="Comparación del rendimiento entre diferentes cosechas"
        action={
          <Tooltip title="Información sobre comparativo">
            <IconButton>
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 2 }}
      />

      {mejorCosecha && peorCosecha && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 16px)' } }}>
              <SummaryCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmojiEvents sx={{ color: theme.palette.success.main, mr: 1 }} />
                    <Typography color="text.secondary" variant="overline">
                      Mejor Cosecha (ROI)
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800}>{mejorCosecha.cosecha}</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    ROI: {formatNumber(getRoi(mejorCosecha))}%
                  </Typography>
                </CardContent>
              </SummaryCard>
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 16px)' } }}>
              <SummaryCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingDown sx={{ color: theme.palette.error.main, mr: 1 }} />
                    <Typography color="text.secondary" variant="overline">
                      Cosecha con Menor ROI
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800}>{peorCosecha.cosecha}</Typography>
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    ROI: {formatNumber(getRoi(peorCosecha))}%
                  </Typography>
                </CardContent>
              </SummaryCard>
            </Box>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 1 }} />

      <CardContent sx={{ pt: 0 }}>
        <StyledTableContainer>
          <StyledTable size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.align}
                    sortDirection={orderBy === col.key ? order : false}
                  >
                    <StyledTableSortLabel
                      active={orderBy === col.key}
                      direction={orderBy === col.key ? order : 'asc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </StyledTableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {sorted.map((r, idx) => {
                const gastos = getGastos(r);
                const ventasNetas = getVentasNetas(r);
                const gananciaNeta = getGananciaNeta(r);
                const roi = getRoi(r);
                const pos = gananciaNeta >= 0;

                return (
                  <TableRow key={`${r.cosecha}-${idx}`} hover sx={{ animation: `${slideIn} .3s ease-out ${idx * 50}ms both` }}>
                    <TableCell>{r.cosecha}</TableCell>
                    <TableCell align="right">{formatCurrency(r.ventas)}</TableCell>
                    <TableCell align="right" sx={{ color: gastos ? theme.palette.error.main : 'inherit' }}>
                      {gastos ? `-${formatCurrency(gastos)}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(ventasNetas)}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(r.inversion)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        color: pos
                          ? theme.palette.mode === 'dark'
                            ? theme.palette.success.light
                            : theme.palette.success.dark
                          : theme.palette.mode === 'dark'
                          ? theme.palette.error.light
                          : theme.palette.error.dark,
                      }}
                    >
                      {formatCurrency(gananciaNeta)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color:
                          roi >= 0
                            ? theme.palette.mode === 'dark'
                              ? theme.palette.success.light
                              : theme.palette.success.dark
                            : theme.palette.mode === 'dark'
                            ? theme.palette.error.light
                            : theme.palette.error.dark,
                      }}
                    >
                      {formatNumber(roi)}
                    </TableCell>
                    <TableCell align="right">{formatNumber(r.cajas)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </StyledTable>
        </StyledTableContainer>

        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Cómo leer:</strong> Ventas <em>brutas</em> − Gastos de venta = <strong>Ventas netas</strong>. Luego,
            Ventas netas − Inversión = <strong>Ganancia neta</strong>. Si el backend no envía “Gastos de venta” por
            cosecha, se mostrará “—”.
          </Typography>
        </Box>
      </CardContent>
    </Block>
  );
};

/* =========================================================
   Panel
   ========================================================= */
export default function TablesPanel({
  inversiones,
  ventas,
  comparativo_cosechas,
  resumen_historico,
  analisis_categorias,
  analisis_variedades,
}: Props) {
  return (
    <>
      {/** Resumen histórico (Perfil de Huerta) */}
      {!!resumen_historico?.length && <ResumenHistoricoTable rows={resumen_historico} />}

      {!!inversiones?.length && <InversionesTable inversiones={inversiones} />}

      {/** NUEVO: Análisis por Categoría (Inversiones) */}
      {!!analisis_categorias?.length && <AnalisisCategoriasBlock rows={analisis_categorias} />}

      {!!ventas?.length && <VentasTable ventas={ventas} />}

      {/** NUEVO: Análisis por Variedad (Ventas) */}
      {!!analisis_variedades?.length && <AnalisisVariedadesBlock rows={analisis_variedades} />}

      {!!comparativo_cosechas?.length && <ComparativoCosechasTable rows={comparativo_cosechas} />}
    </>
  );
}

/* ================= Resumen Histórico (Perfil de Huerta) ================= */
const ResumenHistoricoTable: React.FC<{ rows: FilaResumenHistorico[] }> = ({ rows }) => {
  const theme = useTheme();
  return (
    <Block delay={100}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), width: 48, height: 48 }}>
            <Inventory sx={{ color: theme.palette.primary.main }} />
          </Avatar>
        }
        title={<TableTitle variant="h5">Resumen Histórico (Últimos Años)</TableTitle>}
        subheader="Inversión, ventas, ganancia, ROI, productividad y número de cosechas por año"
        sx={{ pb: 2 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <StyledTableContainer>
          <StyledTable size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Año</TableCell>
                <TableCell align="right">Ventas</TableCell>
                <TableCell align="right">Inversión</TableCell>
                <TableCell align="right">Ganancia</TableCell>
                <TableCell align="right">ROI</TableCell>
                <TableCell align="right">Productividad (cajas/ha)</TableCell>
                <TableCell align="right">Cosechas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={`${r.año}-${idx}`} hover>
                  <TableCell>{r.año}</TableCell>
                  <TableCell align="right">{formatCurrency(r.ventas)}</TableCell>
                  <TableCell align="right">{formatCurrency(r.inversion)}</TableCell>
                  <TableCell align="right">{formatCurrency(r.ganancia)}</TableCell>
                  <TableCell align="right">{formatNumber(r.roi)}%</TableCell>
                  <TableCell align="right">{formatNumber(r.productividad)}</TableCell>
                  <TableCell align="right">{formatNumber(r.cosechas_count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StyledTable>
        </StyledTableContainer>
      </CardContent>
    </Block>
  );
};
