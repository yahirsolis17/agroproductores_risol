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
} from '@mui/material';
import { keyframes, alpha, useTheme, styled } from '@mui/material/styles';
import { BarChart as BarChartIcon, TrendingUp } from '@mui/icons-material';
import {
  TablaInversion,
  TablaVenta,
  FilaComparativoCosecha,
} from '../../../types/reportesProduccionTypes';
import { parseLocalDateStrict } from '../../../../../global/utils/date';
import { formatCurrency, formatNumber } from '../../../../../global/utils/formatters';

interface Props {
  inversiones?: TablaInversion[];
  ventas?: TablaVenta[];
  comparativo_cosechas?: FilaComparativoCosecha[];
}

type Order = 'asc' | 'desc';

// Animaciones personalizadas
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { transform: translateX(-10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(0,0,0,0.1); }
  50% { box-shadow: 0 0 20px rgba(0,0,0,0.15); }
  100% { box-shadow: 0 0 5px rgba(0,0,0,0.1); }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Componentes estilizados
const Block = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'delay'
})<{ delay?: number }>(({ theme, delay = 0 }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: 16,
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
    : `linear-gradient(145deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8f9fa', 0.98)} 100%)`,
  backgroundSize: '200% 200%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  overflow: 'hidden',
  position: 'relative',
  animation: `${fadeIn} 0.6s ease-out ${delay}ms both, ${glow} 3s ease-in-out infinite`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    backgroundSize: '200% 200%',
    animation: `${gradientShift} 4s ease infinite`,
    opacity: 0.8,
    borderRadius: '4px 4px 0 0'
  },
  '&:hover': {
    boxShadow: '0 15px 45px rgba(0,0,0,0.15)',
    transform: 'translateY(-6px)',
    '&::before': {
      opacity: 1
    }
  }
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 12,
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`
  }
}));

const StyledTable = styled(Table)(({ theme }) => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-head': {
    fontWeight: 700,
    fontSize: '0.9rem',
    background: alpha(theme.palette.background.paper, 0.6),
    backdropFilter: 'blur(10px)',
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    padding: theme.spacing(1.5),
    '&:first-of-type': {
      borderTopLeftRadius: 12
    },
    '&:last-of-type': {
      borderTopRightRadius: 12
    }
  },
  '& .MuiTableCell-body': {
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    transition: 'all 0.2s ease',
    animation: `${slideIn} 0.3s ease-out`
  },
  '& .MuiTableRow-root': {
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.03),
      transform: 'translateX(4px)',
      boxShadow: `inset 4px 0 0 ${alpha(theme.palette.primary.main, 0.5)}`
    },
    '&:last-child .MuiTableCell-body': {
      borderBottom: 'none'
    }
  }
}));

const StyledTableSortLabel = styled(TableSortLabel)(({ theme }) => ({
  '&.MuiTableSortLabel-root': {
    color: theme.palette.text.primary,
    '&:hover': {
      color: theme.palette.primary.main,
    }
  },
  '&.Mui-active': {
    color: theme.palette.primary.main,
    '& .MuiTableSortLabel-icon': {
      color: theme.palette.primary.main,
    }
  }
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600,
  borderRadius: 12,
  padding: theme.spacing(0.25, 0.5),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${fadeIn} 0.5s ease-out`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
  }
}));

const TableTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  display: 'inline-block',
  marginBottom: theme.spacing(3),
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
    borderRadius: 4
  }
}));

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

  const subtotal = useMemo(
    () => inversiones.reduce((acc, it) => acc + Number(it?.monto || 0), 0),
    [inversiones]
  );

  const handleSort = (prop: keyof TablaInversion) => {
    const isAsc = orderBy === prop && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(prop);
  };

  return (
    <Block delay={100}>
      <TableTitle variant="h5" gutterBottom>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TrendingUp sx={{ mr: 1 }} />
          Inversiones
        </Box>
      </TableTitle>
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
              const fecha = d instanceof Date && !isNaN(d.getTime()) ? new Intl.DateTimeFormat('es-MX').format(d) : inv.fecha;
              return (
                <TableRow 
                  key={inv.id} 
                  hover
                  sx={{ 
                    animation: `${slideIn} 0.3s ease-out ${index * 50}ms both`,
                    '&:hover': {
                      '& td': {
                        fontWeight: 600
                      }
                    }
                  }}
                >
                  <TableCell>{fecha}</TableCell>
                  <TableCell>
                    <StyledChip 
                      label={inv.categoria} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>{inv.descripcion}</TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 500,
                      color: theme.palette.mode === 'dark' 
                        ? theme.palette.primary.light 
                        : theme.palette.primary.dark
                    }}
                  >
                    {formatCurrency(inv.monto)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          {/* Subtotal Inversiones */}
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} align="right" sx={{ fontWeight: 700 }}>
                Subtotal
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatCurrency(subtotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </StyledTable>
      </StyledTableContainer>

      {/* Aclaración de columnas */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          * <strong>Monto</strong>: inversión/gasto registrado para la fecha y categoría indicada.
        </Typography>
      </Box>
    </Block>
  );
};

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

  const subtotalCantidad = useMemo(
    () => ventas.reduce((acc, it) => acc + Number(it?.cantidad || 0), 0),
    [ventas]
  );
  const subtotalTotal = useMemo(
    () => ventas.reduce((acc, it) => acc + Number(it?.total || 0), 0),
    [ventas]
  );

  const handleSort = (prop: keyof TablaVenta) => {
    const isAsc = orderBy === prop && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(prop);
  };

  return (
    <Block delay={200}>
      <TableTitle variant="h5" gutterBottom>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BarChartIcon sx={{ mr: 1, color: theme.palette.success.main }} />
          Ventas
        </Box>
      </TableTitle>
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
              const fecha = d instanceof Date && !isNaN(d.getTime()) ? new Intl.DateTimeFormat('es-MX').format(d) : v.fecha;
              return (
                <TableRow 
                  key={v.id} 
                  hover
                  sx={{ 
                    animation: `${slideIn} 0.3s ease-out ${index * 50}ms both`,
                    '&:hover': {
                      '& td': {
                        fontWeight: 600
                      }
                    }
                  }}
                >
                  <TableCell>{fecha}</TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>
                    {formatNumber(v.cantidad)}
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>
                    {formatCurrency(v.precio_unitario)}
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 600, 
                      pr: 3,
                      color: theme.palette.mode === 'dark' 
                        ? theme.palette.success.light 
                        : theme.palette.success.dark
                    }}
                  >
                    {formatCurrency(v.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          {/* Subtotales Ventas */}
          <TableFooter>
            <TableRow>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Subtotal
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatNumber(subtotalCantidad)}
              </TableCell>
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatCurrency(subtotalTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </StyledTable>
      </StyledTableContainer>

      {/* Aclaración de columnas */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          * <strong>Total (venta bruta)</strong> = Cantidad de Cajas × Precio por Caja.
          La <em>Ganancia Neta</em> que ves en los reportes considera además los <strong>Gastos de venta</strong> e <strong>Inversiones</strong>.
        </Typography>
      </Box>
    </Block>
  );
};

const ComparativoCosechasTable: React.FC<{ rows: FilaComparativoCosecha[] }> = ({ rows }) => {
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof FilaComparativoCosecha>('ganancia');

  const sorted = useMemo(
    () => stableSort(rows, getComparator<FilaComparativoCosecha>(order, orderBy)),
    [rows, order, orderBy]
  );

  const handleSort = (prop: keyof FilaComparativoCosecha) => {
    const isAsc = orderBy === prop && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(prop);
  };

  return (
    <Block delay={300}>
      <TableTitle variant="h5" gutterBottom>
        Comparativo por Cosecha
      </TableTitle>
      <StyledTableContainer>
        <StyledTable size="medium" stickyHeader>
          <TableHead>
            <TableRow>
              {[
                { key: 'cosecha', label: 'Cosecha' },
                { key: 'inversion', label: 'Inversión' },
                { key: 'ventas', label: 'Ventas' },
                { key: 'ganancia', label: 'Ganancia' },
                { key: 'roi', label: 'ROI (%)' },
                { key: 'cajas', label: 'Cajas' },
              ].map((c) => (
                <TableCell 
                  key={c.key} 
                  align={c.key !== 'cosecha' ? 'right' : 'left'}
                  sortDirection={orderBy === (c.key as keyof FilaComparativoCosecha) ? order : false}
                >
                  <StyledTableSortLabel
                    active={orderBy === (c.key as keyof FilaComparativoCosecha)}
                    direction={orderBy === (c.key as keyof FilaComparativoCosecha) ? order : 'asc'}
                    onClick={() => handleSort(c.key as keyof FilaComparativoCosecha)}
                  >
                    {c.label}
                  </StyledTableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((r, idx) => (
              <TableRow 
                key={`${r.cosecha}-${idx}`} 
                hover
                sx={{ 
                  animation: `${slideIn} 0.3s ease-out ${idx * 50}ms both`,
                  '&:hover': {
                    '& td': {
                      fontWeight: 600
                    }
                  }
                }}
              >
                <TableCell>{r.cosecha}</TableCell>
                <TableCell align="right">{formatCurrency(r.inversion)}</TableCell>
                <TableCell align="right">{formatCurrency(r.ventas)}</TableCell>
                <TableCell 
                  align="right" 
                  sx={{ 
                    fontWeight: 600,
                    color: r.ganancia >= 0 
                      ? (theme.palette.mode === 'dark' ? theme.palette.success.light : theme.palette.success.dark)
                      : (theme.palette.mode === 'dark' ? theme.palette.error.light : theme.palette.error.dark)
                  }}
                >
                  {formatCurrency(r.ganancia)}
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{
                    color: r.roi >= 0 
                      ? (theme.palette.mode === 'dark' ? theme.palette.success.light : theme.palette.success.dark)
                      : (theme.palette.mode === 'dark' ? theme.palette.error.light : theme.palette.error.dark)
                  }}
                >
                  {formatNumber(r.roi)}
                </TableCell>
                <TableCell align="right">{formatNumber(r.cajas)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
    </Block>
  );
};

export default function TablesPanel({ inversiones, ventas, comparativo_cosechas }: Props) {
  return (
    <>
      {!!inversiones?.length && <InversionesTable inversiones={inversiones} />}
      {!!ventas?.length && <VentasTable ventas={ventas} />}
      {!!comparativo_cosechas?.length && <ComparativoCosechasTable rows={comparativo_cosechas} />}
    </>
  );
}
