// frontend/modules/gestion_huerta/components/reportes/ReportView.tsx
import React from 'react';
import { Grid, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';
import type { ReporteContrato } from '../../types/reportTypes';
import KPICard from './common/KPICard';
import ReportChart from './common/ReportChart';

interface Props {
  data: ReporteContrato;
}

const ReportView: React.FC<Props> = ({ data }) => (
  <Grid container spacing={3}>
    {data.kpis.map((kpi) => (
      <Grid item xs={12} md={3} key={kpi.id}>
        <KPICard kpi={kpi} />
      </Grid>
    ))}

    {data.series.map((serie) => (
      <Grid item xs={12} key={serie.id}>
        <ReportChart serie={serie} />
      </Grid>
    ))}

    <Grid item xs={12}>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              {data.tabla.columns.map((col) => (
                <TableCell key={col.id} align={col.align}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.tabla.rows.map((row, idx) => (
              <TableRow key={idx}>
                {data.tabla.columns.map((col) => (
                  <TableCell key={col.id} align={col.align}>
                    {row[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Grid>
  </Grid>
);

export default ReportView;

