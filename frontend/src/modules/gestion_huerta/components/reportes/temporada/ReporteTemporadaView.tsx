// frontend/src/modules/gestion_huerta/components/reportes/temporada/ReporteTemporadaView.tsx
import { Box, Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Divider } from '@mui/material';
import KPICard from '../common/KPICard';
import ReportChart from '../common/ReportChart';
import { ReportPayload, Serie } from '../../../types/reportTypes';
import { formatCurrency, formatNumber } from '../../../../../global/utils/formatters';

interface Props {
  data: ReportPayload;
}

export default function ReporteTemporadaView({ data }: Props) {
  const k = (id: string) => data.kpis.find(x => x.id === id)?.value ?? 0;
  const ventasSerie = data.series.find(s => s.id === 'ventas_mensuales') as Serie | undefined;
  const invSerie = data.series.find(s => s.id === 'inversiones_mensuales') as Serie | undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* KPIs */}
      <Box sx={{ width: '100%' }}><Typography variant="h6">KPIs</Typography><Divider sx={{ mb: 1 }} /></Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '0 0 calc(16.66% - 16px)', minWidth: '200px' }}><KPICard label="Ventas" value={k('ventas_total')} mode="currency" /></Box>
        <Box sx={{ flex: '0 0 calc(16.66% - 16px)', minWidth: '200px' }}><KPICard label="Inversiones" value={k('inversiones_total')} mode="currency" /></Box>
        <Box sx={{ flex: '0 0 calc(16.66% - 16px)', minWidth: '200px' }}><KPICard label="Ganancia neta" value={k('ganancia_neta')} mode="currency" /></Box>
        <Box sx={{ flex: '0 0 calc(16.66% - 16px)', minWidth: '200px' }}><KPICard label="ROI" value={k('roi')} mode="percent" /></Box>
        <Box sx={{ flex: '0 0 calc(16.66% - 16px)', minWidth: '200px' }}><KPICard label="Cajas" value={k('cajas')} mode="number" /></Box>
        <Box sx={{ flex: '0 0 calc(16.66% - 16px)', minWidth: '200px' }}><KPICard label="Precio prom. caja" value={k('precio_promedio')} mode="currency" /></Box>
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 calc(50% - 16px)', minWidth: '300px' }}>
          {ventasSerie && <ReportChart title="Ventas mensuales" serie={ventasSerie} />}
        </Box>
        <Box sx={{ flex: '1 1 calc(50% - 16px)', minWidth: '300px' }}>
          {invSerie && <ReportChart title="Inversiones mensuales" serie={invSerie} />}
        </Box>
      </Box>

      {/* Tabla comparativa por cosecha */}
      <Box sx={{ width: '100%' }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Comparativo por Cosecha</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {data.tabla.columns.map((c: string) => (
                      <TableCell key={c}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.tabla.rows.map((r: any[], idx: number) => (
                    <TableRow key={idx}>
                      {r.map((cell, i) => {
                        const header = data.tabla.columns[i].toLowerCase();
                        const isMoney = ['inversión', 'ventas', 'ganancia'].some(k => header.includes(k));
                        const isPercent = header.includes('roi');
                        const isCajas = header.includes('cajas');
                        return (
                          <TableCell key={i}>
                            {typeof cell === 'number'
                              ? isMoney ? formatCurrency(cell)
                                : isPercent ? `${cell.toFixed(2)}%`
                                : isCajas ? formatNumber(cell)
                                : formatNumber(cell)
                              : String(cell)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
