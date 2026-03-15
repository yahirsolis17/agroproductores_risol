import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, Table, TableBody, TableCell, TableHead, TableRow,
  alpha, useTheme, Divider, Stack
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import SaveIcon from '@mui/icons-material/Save';
import PaymentsIcon from '@mui/icons-material/Payments';
import { gastosService } from '../../services/gastosService';
import { formatDateISO } from '../../../../global/utils/date';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import FormikDateField from '../../../../components/common/form/FormikDateField';
import FormikTextField from '../../../../components/common/form/FormikTextField';

interface Props {
  open: boolean;
  onClose: () => void;
  compra: any;
  onRefresh: () => void;
}

const validationSchema = Yup.object({
  monto: Yup.number().required('El monto es requerido').positive('Debe ser mayor a 0'),
  fecha: Yup.string().required('Fecha es requerida'),
  metodo: Yup.string().required('Metodo es requerido'),
});

export default function AbonoMaderaModal({ open, onClose, compra, onRefresh }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  if (!compra) return null;

  const saldo = Number(compra.saldo ?? 0);
  const abonos = compra.abonos || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaymentsIcon color="primary" /> Historial de Abonos
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            mb: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            {compra.proveedor_nombre}
          </Typography>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Monto Total: ${Number(compra.monto_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="body2" color="error.main" fontWeight={700}>
              Saldo Actual: ${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Typography>
          </Stack>
        </Box>

        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Pagos Realizados
        </Typography>
        {abonos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            No hay abonos registrados para esta compra.
          </Typography>
        ) : (
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Metodo</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {abonos.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.fecha}</TableCell>
                  <TableCell>{a.metodo}</TableCell>
                  <TableCell align="right">
                    ${Number(a.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {saldo > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Registrar Nuevo Abono
            </Typography>
            <Formik
              initialValues={{
                monto: '',
                fecha: formatDateISO(new Date()),
                metodo: 'Transferencia',
              }}
              validationSchema={validationSchema}
              validateOnChange={false}
              validateOnBlur
              validateOnMount={false}
              onSubmit={async (values, helpers) => {
                if (Number(values.monto) > saldo) {
                  helpers.setFieldError('monto', 'El abono no puede ser mayor al saldo pendiente.');
                  return;
                }

                setBusy(true);
                try {
                  await gastosService.compras.abonos(compra.id, {
                    ...values,
                    monto: Number(values.monto),
                  });
                  setFormErrors([]);
                  onRefresh();
                  onClose();
                } catch (err: unknown) {
                  const normalized = applyBackendErrorsToFormik(err, helpers, {
                    fieldNames: ['monto', 'fecha', 'metodo'],
                    spreadNonFieldToFields: ['monto'],
                    alsoSetFormikErrors: true,
                  });
                  setFormErrors(normalized.formErrors);
                } finally {
                  helpers.setSubmitting(false);
                  setBusy(false);
                }
              }}
            >
              {({ isSubmitting }) => (
                <Form id="abono-form">
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormAlertBanner
                      open={formErrors.length > 0}
                      severity="error"
                      title="Revisa la informacion"
                      messages={formErrors}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormikNumberField
                        name="monto"
                        label="Monto ($)"
                        size="small"
                        fullWidth
                        inputProps={{ min: 0.01, step: 'any' }}
                        thousandSeparator
                        allowDecimal
                        maxDecimals={2}
                        disabled={busy || isSubmitting}
                      />
                      <FormikDateField
                        name="fecha"
                        label="Fecha de Pago"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        disabled={busy || isSubmitting}
                      />
                    </Stack>
                    <FormikTextField
                      name="metodo"
                      label="Metodo de Pago"
                      size="small"
                      placeholder="Ej: Transferencia, Efectivo, Cheque..."
                      fullWidth
                      disabled={busy || isSubmitting}
                    />
                  </Stack>
                </Form>
              )}
            </Formik>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          {saldo > 0 ? 'Cancelar' : 'Cerrar'}
        </Button>
        {saldo > 0 && (
          <Button
            type="submit"
            form="abono-form"
            variant="contained"
            disabled={busy}
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Registrar Abono
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
