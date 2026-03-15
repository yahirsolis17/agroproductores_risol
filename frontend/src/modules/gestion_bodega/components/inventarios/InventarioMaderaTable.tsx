// frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx
import { useEffect, useState, useRef } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Chip, Skeleton, Typography, Alert, Paper, Tooltip,
  IconButton, alpha, useTheme, LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import { m, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../../../global/store/store';
import {
  fetchInventarioMadera,
  setBodega,
  setTemporada,
  setPage as setReduxPage,
  setPageSize,
} from '../../../../global/store/inventariosSlice';

const rowVariants = {
  hidden:  { opacity: 0, y: 4 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.22, ease: 'easeOut' } }),
};

interface Props {
  bodegaId?: number;
  temporadaId?: number;
}

export default function InventarioMaderaTable({ bodegaId, temporadaId }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const madera = useAppSelector((s) => s.inventarios.madera);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const fetchRef = useRef(0); // cancela fetches obsoletos durante cambios rápidos

  // Un solo efecto: sincronizan filtros en Redux y luego despachan el fetch atómicamente
  useEffect(() => {
    if (!bodegaId || !temporadaId) return;
    const token = ++fetchRef.current;
    dispatch(setBodega(bodegaId));
    dispatch(setTemporada(temporadaId));
    dispatch(setReduxPage(page + 1));
    dispatch(setPageSize(rowsPerPage));
    // El fetch puede leer los filtros recién establecidos porque RTK los procesa sincrónicamente
    // antes de que el thunk se llame en el mismo microtask
    dispatch(fetchInventarioMadera()).catch(() => {
      if (fetchRef.current !== token) return; // respuesta obsoleta, ignorar
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaId, temporadaId, page, rowsPerPage]);

  const handleRefresh = () => {
    if (!bodegaId || !temporadaId) return;
    dispatch(fetchInventarioMadera());
  };

  const items = (madera?.items ?? []) as any[];
  const total = (madera?.meta as any)?.count ?? (madera?.meta as any)?.total ?? items.length;
  const isLoading = madera?.status === 'loading';
  const hasError = madera?.status === 'failed';
  const errorMsg = madera?.error;

  const stockColor = (actual: number, inicial: number) => {
    const ratio = inicial > 0 ? actual / inicial : 0;
    if (ratio > 0.5) return theme.palette.success.main;
    if (ratio > 0.15) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const columns = ['Proveedor', 'Fecha Compra', 'Stock Inicial', 'Stock Actual', 'Disponibilidad'];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Cajas de madera disponibles por compra (FIFO)
        </Typography>
        <Tooltip title="Actualizar inventario">
          <span>
            <IconButton size="small" onClick={handleRefresh} disabled={isLoading || !bodegaId}
              sx={{ '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) } }}
            >
              <RefreshIcon fontSize="small"
                sx={{
                  transition: 'transform 0.4s',
                  ...(isLoading && { animation: 'spin 1s linear infinite' }),
                }}
              />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {!bodegaId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Selecciona una bodega y temporada para ver el inventario.
        </Alert>
      )}

      {hasError && bodegaId && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} action={
          <IconButton size="small" color="inherit" onClick={handleRefresh}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        }>
          {typeof errorMsg === 'string' ? errorMsg : 'Error al cargar el inventario de madera.'}
        </Alert>
      )}

      {isLoading && <LinearProgress sx={{ mb: 1, borderRadius: 99 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
                {columns.map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25, whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: Math.min(rowsPerPage, 6) }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c}><Skeleton variant="text" sx={{ borderRadius: 1 }} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Box display="flex" flexDirection="column" alignItems="center" py={5} gap={1.5} color="text.secondary">
                      <WarehouseIcon sx={{ fontSize: 42, opacity: 0.25 }} />
                      <Typography variant="body2" fontWeight={500}>Sin inventario de madera registrado</Typography>
                      <Typography variant="caption">Registra compras de madera para verlas aquí</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((row, i) => {
                    const stockActual = Number(row.stock_actual ?? 0);
                    const stockInicial = Number(row.stock_inicial ?? row.cantidad_cajas ?? 0);
                    const color = stockColor(stockActual, stockInicial);
                    const hayStock = !!row.hay_stock;
                    const pct = stockInicial > 0 ? Math.min(100, Math.round((stockActual / stockInicial) * 100)) : 0;
                    return (
                      <TableRow
                        component={m.tr as any}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        key={row.id}
                        hover
                        sx={{ '&:last-child td': { border: 0 }, cursor: 'default' }}
                      >
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.proveedor_nombre ?? '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {row.creado_en ? new Date(row.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{stockInicial.toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight={700} color={color}>
                              {stockActual.toLocaleString()}
                            </Typography>
                            <Box flex={1} minWidth={60}>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  height: 5, borderRadius: 99,
                                  backgroundColor: alpha(color, 0.15),
                                  '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 99 },
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={hayStock ? 'Con stock' : 'Agotado'}
                            size="small"
                            sx={{
                              fontWeight: 700, fontSize: '0.7rem', height: 22, borderRadius: 1.5,
                              backgroundColor: hayStock ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.grey[400], 0.15),
                              color: hayStock ? theme.palette.success.dark : theme.palette.text.secondary,
                              border: `1px solid ${hayStock ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.divider, 0.3)}`,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > rowsPerPage && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Filas:"
            sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}
          />
        )}
      </Paper>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Box>
  );
}
