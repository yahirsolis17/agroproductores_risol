import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  CardHeader,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { alpha, keyframes, styled } from '@mui/material/styles';
import { AttachMoney, Dataset, Inventory, LocalShipping } from '@mui/icons-material';
import type { ReporteTable } from '../../types/reportesBodegaTypes';

interface Props {
  tablas?: Record<string, ReporteTable>;
}

const TABLE_META: Record<
  string,
  { title: string; subtitle: string; color: string; icon: React.ReactNode }
> = {
  recepciones: {
    title: 'Recepciones',
    subtitle: 'Llegada de fruta del campo',
    color: '#16a34a',
    icon: <Inventory />,
  },
  empaques: {
    title: 'Empaques',
    subtitle: 'Clasificacion por material y calidad',
    color: '#2563eb',
    icon: <Inventory />,
  },
  camiones: {
    title: 'Camiones de salida',
    subtitle: 'Despachos de la semana',
    color: '#7c3aed',
    icon: <LocalShipping />,
  },
  gastos: {
    title: 'Gastos operativos',
    subtitle: 'Compras de madera y consumibles',
    color: '#dc2626',
    icon: <AttachMoney />,
  },
  clasificacion: {
    title: 'Clasificacion acumulada',
    subtitle: 'Consolidado de temporada',
    color: '#2563eb',
    icon: <Dataset />,
  },
  por_semana: {
    title: 'Comparativo semanal',
    subtitle: 'Evolucion de la temporada',
    color: '#7c3aed',
    icon: <Dataset />,
  },
};

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { transform: translateX(-10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

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
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    overflow: 'hidden',
    position: 'relative',
    animation: `${fadeIn} .4s ease-out ${delay}ms both`,
  })
);

const StyledTableContainer = styled(TableContainer)({
  borderRadius: 0,
  overflow: 'hidden',
});

const StyledTable = styled(Table)(({ theme }) => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-head': {
    fontWeight: 700,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    background: alpha(theme.palette.background.paper, 0.95),
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    padding: theme.spacing(1.5),
  },
  '& .MuiTableCell-body': {
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    fontVariantNumeric: 'tabular-nums',
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    '& td': { fontWeight: 600 },
  },
}));

function fallbackTitleFromKey(key: string): string {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toSortableNumber(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

const GenericBodegaTable: React.FC<{
  keyName: string;
  table: ReporteTable;
  delay: number;
}> = ({ keyName, table, delay }) => {
  const [orderBy, setOrderBy] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const meta = TABLE_META[keyName] || {
    title: fallbackTitleFromKey(keyName),
    subtitle: 'Detalle del reporte',
    color: '#2563eb',
    icon: <Dataset />,
  };

  const numericColumns = useMemo(() => {
    return table.columns
      .map((_, colIndex) => {
        const numbers = table.rows
          .map((row) => toSortableNumber(row[colIndex] as string | number))
          .filter((value): value is number => value !== null);
        return {
          colIndex,
          isNumeric: numbers.length >= Math.ceil(table.rows.length * 0.6),
        };
      })
      .filter((item) => item.isNumeric)
      .map((item) => item.colIndex);
  }, [table.columns, table.rows]);

  const sortedRows = useMemo(() => {
    const sorted = [...table.rows];
    sorted.sort((a, b) => {
      const va = a[orderBy];
      const vb = b[orderBy];
      const na = toSortableNumber(va as string | number);
      const nb = toSortableNumber(vb as string | number);
      if (na !== null && nb !== null) {
        return order === 'asc' ? na - nb : nb - na;
      }
      const sa = String(va ?? '');
      const sb = String(vb ?? '');
      return order === 'asc' ? sa.localeCompare(sb, 'es') : sb.localeCompare(sa, 'es');
    });
    return sorted;
  }, [table.rows, orderBy, order]);

  const summaryMetric = useMemo(() => {
    const metricColumn = numericColumns[0];
    if (metricColumn === undefined) return null;

    const rows = table.rows
      .map((row) => ({
        label: String(row[0] ?? ''),
        value: toSortableNumber(row[metricColumn] as string | number) || 0,
      }))
      .filter((row) => row.label);

    const total = rows.reduce((acc, row) => acc + row.value, 0);
    if (!rows.length || total <= 0) return null;

    return {
      column: table.columns[metricColumn] || 'Valor',
      total,
      rows: rows.slice(0, 8),
    };
  }, [numericColumns, table.columns, table.rows]);

  const selectedColumnTotal = useMemo(() => {
    if (!numericColumns.includes(orderBy)) return null;
    return sortedRows.reduce((acc, row) => acc + (toSortableNumber(row[orderBy] as string | number) || 0), 0);
  }, [numericColumns, orderBy, sortedRows]);

  return (
    <Block delay={delay}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: alpha(meta.color, 0.15), width: 48, height: 48, color: meta.color }}>
            {meta.icon}
          </Avatar>
        }
        title={
          <Typography variant="h5" sx={{ fontWeight: 700, color: meta.color }}>
            {meta.title}
          </Typography>
        }
        subheader={meta.subtitle}
        action={
          <Chip
            label={`${table.rows.length} registros`}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: alpha(meta.color, 0.1),
              color: meta.color,
              mt: 1,
              mr: 1,
            }}
          />
        }
        sx={{ pb: 1, pt: 2, px: 3 }}
      />

      <Box px={3} pb={2} pt={0}>
        {summaryMetric ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: meta.color }}>
              Distribucion rapida: {summaryMetric.column}
            </Typography>
            <Box display="grid" gap={1}>
              {summaryMetric.rows.map((row, index) => {
                const pct = summaryMetric.total > 0 ? (row.value / summaryMetric.total) * 100 : 0;
                return (
                  <Box key={`${keyName}-dist-${index}`} display="grid" gridTemplateColumns="150px 1fr auto" gap={1.25} alignItems="center">
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {row.label}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 8,
                        borderRadius: 99,
                        backgroundColor: alpha(meta.color, 0.12),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 99,
                          backgroundColor: meta.color,
                        },
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 88, textAlign: 'right', fontWeight: 700 }}>
                      {row.value.toLocaleString()} ({pct.toFixed(1)}%)
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : null}

        <StyledTableContainer>
          <StyledTable size="small">
            <TableHead>
              <TableRow>
                {table.columns.map((col, index) => (
                  <TableCell key={`${keyName}-head-${index}`} align={index === 0 ? 'left' : 'right'}>
                    <TableSortLabel
                      active={orderBy === index}
                      direction={orderBy === index ? order : 'asc'}
                      onClick={() => {
                        if (orderBy === index) {
                          setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setOrderBy(index);
                          setOrder(numericColumns.includes(index) ? 'desc' : 'asc');
                        }
                      }}
                    >
                      {col}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.map((row, rowIndex) => (
                <TableRow key={`${keyName}-row-${rowIndex}`} sx={{ animation: `${slideIn} .3s ease-out ${rowIndex * 30}ms both` }}>
                  {row.map((cell, colIndex) => (
                    <TableCell key={`${keyName}-cell-${rowIndex}-${colIndex}`} align={colIndex === 0 ? 'left' : 'right'}>
                      {String(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            {selectedColumnTotal !== null ? (
              <TableFooter>
                <TableRow>
                  {table.columns.map((_, colIndex) => (
                    <TableCell key={`${keyName}-foot-${colIndex}`} align={colIndex === 0 ? 'left' : 'right'} sx={{ fontWeight: 700 }}>
                      {colIndex === 0 ? 'Total columna ordenada' : colIndex === orderBy ? selectedColumnTotal.toLocaleString() : ''}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            ) : null}
          </StyledTable>
        </StyledTableContainer>
      </Box>
    </Block>
  );
};

export default function ReporteBodegaViewerTables({ tablas = {} }: Props) {
  const entries = Object.entries(tablas).filter(([, table]) => table && table.rows?.length);

  if (!entries.length) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography color="text.secondary">No hay tablas disponibles para este reporte.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {entries.map(([keyName, table], index) => (
        <GenericBodegaTable key={keyName} keyName={keyName} table={table} delay={100 + index * 60} />
      ))}
    </Box>
  );
}
