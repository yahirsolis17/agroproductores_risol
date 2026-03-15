// frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Chip, Skeleton, Typography, Alert, Paper, Tooltip,
  IconButton, alpha, useTheme, LinearProgress, Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import { m, AnimatePresence } from 'framer-motion';
import CompraMaderaFormModal from './CompraMaderaFormModal';
import AbonoMaderaModal from './AbonoMaderaModal';
import { gastosService } from '../../services/gastosService';
import { useAppDispatch, useAppSelector } from '../../../../global/store/store';
import {
  fetchComprasMadera,
  setBodega,
  setTemporada,
  setPage as setReduxPage,
  setPageSize,
} from '../../../../global/store/gastosSlice';

const rowVariants = {
  hidden:  { opacity: 0, y: 4 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.22, ease: 'easeOut' } }),
};

interface Props {
  bodegaId?: number;
  temporadaId?: number;
}

export default function CompraMaderaTable({ bodegaId, temporadaId }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const comprasMadera = useAppSelector((s) => s.gastos.comprasMadera);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const fetchRef = useRef(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [abonosOpen, setAbonosOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<any>(null);

  useEffect(() => {
    if (!bodegaId || !temporadaId) return;
    ++fetchRef.current;
    dispatch(setBodega(bodegaId));
    dispatch(setTemporada(temporadaId));
    dispatch(setReduxPage(page + 1));
    dispatch(setPageSize(rowsPerPage));
    dispatch(fetchComprasMadera());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaId, temporadaId, page, rowsPerPage]);

  const handleRefresh = useCallback(() => {
    if (bodegaId && temporadaId) dispatch(fetchComprasMadera());
  }, [bodegaId, temporadaId, dispatch]);

  const handleCreate = useCallback(async (payload: any) => {
    setFormBusy(true);
    try {
      await gastosService.compras.create(payload);
      handleRefresh();
    } finally {
      setFormBusy(false);
    }
  }, [handleRefresh]);

  const handleUpdate = useCallback(async (id: number, payload: any) => {
    setFormBusy(true);
    try {
      await gastosService.compras.update(id, payload);
      handleRefresh();
    } finally {
      setFormBusy(false);
    }
  }, [handleRefresh]);

  const items = (comprasMadera?.items ?? []) as any[];
  const total = (comprasMadera?.meta as any)?.count ?? (comprasMadera?.meta as any)?.total ?? items.length;
  const isLoading = comprasMadera?.status === 'loading';
  const hasError = comprasMadera?.status === 'failed';
  const errorMsg = comprasMadera?.error;

  const saldoColor = (saldo: number, montoTotal: number) => {
    if (montoTotal === 0) return theme.palette.text.secondary;
    const ratio = saldo / montoTotal;
    if (ratio <= 0.05) return theme.palette.success.main;
    if (ratio <= 0.4)  return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const columns = ['Proveedor', 'Cajas', 'Total', 'Saldo Pendiente', 'Estado', ''];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Compras de cajas de madera registradas en la temporada
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
            disabled={!bodegaId || !temporadaId}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2 }}
          >
            Nueva Compra
          </Button>
          <Tooltip title="Actualizar">
            <span>
              <IconButton size="small" onClick={handleRefresh} disabled={isLoading || !bodegaId}
                sx={{ '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) } }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {!bodegaId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Selecciona una bodega y temporada para ver las compras de madera.
        </Alert>
      )}

      {hasError && bodegaId && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} action={
          <IconButton size="small" color="inherit" onClick={handleRefresh}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        }>
          {typeof errorMsg === 'string' ? errorMsg : 'Error al cargar compras de madera.'}
        </Alert>
      )}

      {isLoading && <LinearProgress sx={{ mb: 1, borderRadius: 99 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
                {columns.map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25 }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: Math.min(rowsPerPage, 6) }).map((_, i) => (
                  <TableRow key={i}>{columns.map((c) => <TableCell key={c}><Skeleton variant="text" /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Box display="flex" flexDirection="column" alignItems="center" py={5} gap={1.5} color="text.secondary">
                      <ReceiptLongIcon sx={{ fontSize: 42, opacity: 0.25 }} />
                      <Typography variant="body2" fontWeight={500}>Sin compras de madera registradas</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((row, i) => {
                    const saldo = Number(row.saldo ?? 0);
                    const monto = Number(row.monto_total ?? 0);
                    const color = saldoColor(saldo, monto);
                    const pagado = saldo <= 0 || (monto > 0 && saldo / monto <= 0.05);
                    const saldoPct = monto > 0 ? Math.round((saldo / monto) * 100) : 0;
                    return (
                      <TableRow
                        component={m.tr as any}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        key={row.id}
                        hover
                        sx={{ '&:last-child td': { border: 0 } }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>{row.proveedor_nombre ?? '—'}</TableCell>
                        <TableCell>
                          <Box display="flex" flexDirection="column">
                            <Typography variant="body2">{Number(row.cantidad_cajas ?? 0).toLocaleString()} cjs</Typography>
                            {row.stock_actual !== undefined && (
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                dsp: {Number(row.stock_actual).toLocaleString()} cjs
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight={700} color={color}>
                              ${Number(saldo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                            {monto > 0 && (
                              <Typography variant="caption" color="text.secondary">({saldoPct}%)</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pagado ? 'Liquidado' : 'Pendiente'}
                            size="small"
                            sx={{
                              fontWeight: 700, fontSize: '0.7rem', height: 22, borderRadius: 1.5,
                              backgroundColor: pagado ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                              color: pagado ? theme.palette.success.dark : theme.palette.warning.dark,
                              border: `1px solid ${pagado ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.warning.main, 0.3)}`,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Abonos y Pagos">
                            <IconButton 
                              size="small" 
                              onClick={() => { setSelectedCompra(row); setAbonosOpen(true); }}
                              color={pagado ? "default" : "primary"}
                            >
                              <PaymentsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      <CompraMaderaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        bodegaId={bodegaId}
        temporadaId={temporadaId}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        busy={formBusy}
      />

      {/* Modal de Abonos */}
      {selectedCompra && (
        <AbonoMaderaModal
          open={abonosOpen}
          onClose={() => { setAbonosOpen(false); setSelectedCompra(null); }}
          compra={selectedCompra}
          onRefresh={handleRefresh}
        />
      )}
    </Box>
  );
}
