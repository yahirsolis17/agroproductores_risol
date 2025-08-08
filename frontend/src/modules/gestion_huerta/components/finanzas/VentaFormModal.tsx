/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import {
  VentaCreateData,
  VentaUpdateData,
  VentaHuerta,
} from '../../types/ventaTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: VentaCreateData | VentaUpdateData) => Promise<void>;
  /** Sólo para edición */
  initialValues?: VentaHuerta;
  /** Para creación */
  defaultCosechaId?: number;
}

const schema = Yup.object({
  fecha_venta:     Yup.date().required('Requerido'),
  num_cajas:       Yup.number().min(1, 'Debe ser ≥ 1').required('Requerido'),
  precio_por_caja: Yup.number().min(0, 'Debe ser ≥ 0').required('Requerido'),
  tipo_mango:      Yup.string().min(3, 'Mínimo 3 caracteres').required('Requerido'),
  gasto:           Yup.number().min(0, 'Debe ser ≥ 0').required('Requerido'),
  descripcion:     Yup.string().max(250, 'Máx 250 caracteres'),
});

const VentaFormModal: React.FC<Props> = ({
  open, onClose, onSubmit, initialValues, defaultCosechaId,
}) => {
  /* Valores por defecto */
  const defaults: VentaCreateData = {
    fecha_venta:     new Date().toISOString().slice(0, 10),
    num_cajas:       0,
    precio_por_caja: 0,
    tipo_mango:      '',
    gasto:           0,
    descripcion:     '',
    cosecha:         defaultCosechaId ?? 0,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialValues ? 'Editar venta' : 'Nueva venta'}
      </DialogTitle>

      <Formik
        initialValues={
          initialValues
            ? {
                fecha_venta:     initialValues.fecha_venta,
                num_cajas:       initialValues.num_cajas,
                precio_por_caja: initialValues.precio_por_caja,
                tipo_mango:      initialValues.tipo_mango,
                gasto:           initialValues.gasto,
                descripcion:     initialValues.descripcion ?? '',
                cosecha:         initialValues.cosecha,
              }
            : defaults
        }
        validationSchema={schema}
        validateOnBlur={false}
        validateOnChange={false}
        enableReinitialize
        onSubmit={async (vals, helpers) => {
          try {
            await onSubmit(vals);
            onClose();
          } catch (err: any) {
            handleBackendNotification(err?.response?.data || err);
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, isSubmitting }) => (
          <Form>
            <DialogContent dividers className="space-y-4">
              <TextField
                fullWidth
                type="date"
                name="fecha_venta"
                label="Fecha"
                InputLabelProps={{ shrink: true }}
                value={values.fecha_venta}
                onChange={handleChange}
                error={!!errors.fecha_venta}
                helperText={errors.fecha_venta}
              />
              <TextField
                fullWidth
                type="number"
                name="num_cajas"
                label="Número de cajas"
                value={values.num_cajas}
                onChange={handleChange}
                error={!!errors.num_cajas}
                helperText={errors.num_cajas}
              />
              <TextField
                fullWidth
                type="number"
                name="precio_por_caja"
                label="Precio por caja"
                value={values.precio_por_caja}
                onChange={handleChange}
                error={!!errors.precio_por_caja}
                helperText={errors.precio_por_caja}
              />
              <TextField
                fullWidth
                name="tipo_mango"
                label="Tipo de mango"
                value={values.tipo_mango}
                onChange={handleChange}
                error={!!errors.tipo_mango}
                helperText={errors.tipo_mango}
              />
              <TextField
                fullWidth
                type="number"
                name="gasto"
                label="Gasto asociado"
                value={values.gasto}
                onChange={handleChange}
                error={!!errors.gasto}
                helperText={errors.gasto}
              />
              <TextField
                fullWidth
                multiline
                minRows={2}
                name="descripcion"
                label="Descripción (opcional)"
                value={values.descripcion}
                onChange={handleChange}
                error={!!errors.descripcion}
                helperText={errors.descripcion}
              />
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button variant="outlined" onClick={onClose}>Cancelar</Button>
              <PermissionButton
                perm={initialValues ? 'change_venta' : 'add_venta'}
                type="submit"
                variant="contained"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <CircularProgress size={22} />
                  : 'Guardar'}
              </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default VentaFormModal;
