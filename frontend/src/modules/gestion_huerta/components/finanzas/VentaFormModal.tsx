import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, Box
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import type { VentaCreate, VentaUpdate } from '../../types/ventaTypes';

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  initialValues: VentaUpdate | { cosecha: number }; // en nuevo caso solo trae cosecha
  onSubmit: (payload: VentaCreate | VentaUpdate) => Promise<void>;
  cosechaId: number;
};

const schema = Yup.object({
  fecha_venta: Yup.string().required('Requerido'),
  num_cajas: Yup.number().min(1, '>= 1').required('Requerido'),
  precio_por_caja: Yup.number().min(1, '>= 1').required('Requerido'),
  tipo_mango: Yup.string().required('Requerido'),
  descripcion: Yup.string().nullable(),
  gasto: Yup.number().min(0, '>= 0').required('Requerido'),
});

const VentaFormModal: React.FC<Props> = (p) => {
  if (!p.open) return null; // ⟵ evita que se renderice cuando está cerrado

  // si es edición, initialValues es VentaUpdate, si no, rellenamos defaults
  const defaults: VentaCreate = {
    cosecha: 'cosecha' in p.initialValues ? p.initialValues.cosecha : p.cosechaId,
    fecha_venta: '',
    num_cajas: 1,
    precio_por_caja: 1,
    tipo_mango: '',
    descripcion: '',
    gasto: 0,
  };

  const init = (p.isEdit ? (p.initialValues as VentaUpdate) : defaults) as any;

  return (
    <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="sm">
      <DialogTitle className="text-primary-dark font-bold">
        {p.isEdit ? 'Editar venta' : 'Nueva venta'}
      </DialogTitle>

      <Formik
        initialValues={init}
        validationSchema={schema}
        validateOnBlur={false}
        validateOnChange={false}
        enableReinitialize
        onSubmit={async (vals, actions) => {
          try {
            await p.onSubmit(vals as any);
            p.onClose();
          } catch (e: any) {
            // mapear errores si aplica
          } finally {
            actions.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Box display="grid" gap={2}>
                <TextField
                  label="Fecha de venta"
                  name="fecha_venta"
                  type="date"
                  value={values.fecha_venta}
                  onChange={handleChange}
                  error={!!errors.fecha_venta}
                  helperText={errors.fecha_venta as string || ''}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />

                <TextField
                  label="Número de cajas"
                  name="num_cajas"
                  type="number"
                  value={values.num_cajas}
                  onChange={handleChange}
                  error={!!errors.num_cajas}
                  helperText={errors.num_cajas as string || ''}
                  fullWidth
                />

                <TextField
                  label="Precio por caja"
                  name="precio_por_caja"
                  type="number"
                  value={values.precio_por_caja}
                  onChange={handleChange}
                  error={!!errors.precio_por_caja}
                  helperText={errors.precio_por_caja as string || ''}
                  fullWidth
                />

                <TextField
                  label="Tipo de mango"
                  name="tipo_mango"
                  value={values.tipo_mango}
                  onChange={handleChange}
                  error={!!errors.tipo_mango}
                  helperText={errors.tipo_mango as string || ''}
                  fullWidth
                />

                <TextField
                  label="Descripción"
                  name="descripcion"
                  value={values.descripcion || ''}
                  onChange={handleChange}
                  error={!!errors.descripcion}
                  helperText={errors.descripcion as string || ''}
                  fullWidth
                  multiline
                  minRows={2}
                />

                <TextField
                  label="Gasto"
                  name="gasto"
                  type="number"
                  value={values.gasto}
                  onChange={handleChange}
                  error={!!errors.gasto}
                  helperText={errors.gasto as string || ''}
                  fullWidth
                />
              </Box>
            </DialogContent>

            <DialogActions>
              <Button variant="outlined" onClick={p.onClose}>Cancelar</Button>
              <Button variant="contained" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default VentaFormModal;
