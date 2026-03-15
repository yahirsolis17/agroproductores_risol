// frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Skeleton, Typography, Alert, Paper, Tooltip,
  IconButton, alpha, useTheme, LinearProgress, Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import { m, AnimatePresence } from 'framer-motion';
import ConsumibleFormModal from './ConsumibleFormModal';
import { gastosService } from '../../services/gastosService';
import { useAppDispatch, useAppSelector } from '../../../../global/store/store';
import { parseLocalDateStrict } from '../../../../global/utils/date';
import {
  fetchConsumibles,
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

export default function ConsumibleTable({ bodegaId, temporadaId }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const consumibles = useAppSelector((s) => s.gastos.consumibles);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const fetchRef = useRef(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formBusy, setFormBusy] = useState(false);

  useEffect(() => {
    if (!bodegaId || !temporadaId) return;
    ++fetchRef.current;
    dispatch(setBodega(bodegaId));
    dispatch(setTemporada(temporadaId));
    dispatch(setReduxPage(page + 1));
    dispatch(setPageSize(rowsPerPage));
    dispatch(fetchConsumibles());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaId, temporadaId, page, rowsPerPage]);

  const handleRefresh = useCallback(() => {
    if (bodegaId && temporadaId) dispatch(fetchConsumibles());
  }, [bodegaId, temporadaId, dispatch]);

  const handleCreate = useCallback(async (payload: any) => {
    setFormBusy(true);
    try {
      await gastosService.consumibles.create(payload);
      handleRefresh();
    } finally {
      setFormBusy(false);
    }
  }, [handleRefresh]);

  const handleUpdate = useCallback(async (id: number, payload: any) => {
    setFormBusy(true);
    try {
      await gastosService.consumibles.update(id, payload);
      handleRefresh();
    } finally {
      setFormBusy(false);
    }
  }, [handleRefresh]);

  const items = (consumibles?.items ?? []) as any[];
  const total = (consumibles?.meta as any)?.count ?? (consumibles?.meta as any)?.total ?? items.length;
  const isLoading = consumibles?.status === 'loading';
  const hasError = consumibles?.status === 'failed';
  const errorMsg = consumibles?.error;

  const columns = ['Concepto', 'Cantidad', 'Costo Unit.', 'Total', 'Fecha'];

  // Suma total de la p�gina actual
  const totalPagina = items.reduce((acc: number, r: any) => acc + Number(r.total ?? 0), 0);
  const formatFechaLocal = (fecha?: string) => {
    if (!fecha) return '�';
    const d = parseLocalDateStrict(fecha);
    if (isNaN(d.getTime())) return '�';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Materiales consumibles � rafia, gises, pega, etc.
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
            Nuevo Consumible
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
          Selecciona una bodega y temporada para ver los consumibles.
        </Alert>
      )}

      {hasError && bodegaId && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} action={
          <IconButton size="small" color="inherit" onClick={handleRefresh}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        }>
          {typeof errorMsg === 'string' ? errorMsg : 'Error al cargar consumibles.'}
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
                      <ShoppingCartIcon sx={{ fontSize: 42, opacity: 0.25 }} />
                      <Typography variant="body2" fontWeight={500}>Sin consumibles registrados</Typography>
                      <Typography variant="caption">Los gastos de materiales se registran aqu�</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((row, i) => (
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
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{row.concepto ?? '�'}</Typography>
                        {row.observaciones && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>{row.observaciones}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{Number(row.cantidad ?? 0).toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          ${Number(row.costo_unitario ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          ${Number(row.total ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatFechaLocal(row.fecha)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </AnimatePresence>
              )}
              {/* Fila de total de p�gina */}
              {items.length > 0 && !isLoading && (
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>
                    Total (esta p�gina)
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={800} color="primary.main">
                      ${totalPagina.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
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

      {/* Modal de creaci�n/edici�n */}
      <ConsumibleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        bodegaId={bodegaId}
        temporadaId={temporadaId}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        busy={formBusy}
      />
    </Box>
  );
}

