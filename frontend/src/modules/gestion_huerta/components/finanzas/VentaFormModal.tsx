/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { Formik, Form, FormikHelpers } from 'formik';
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

/**
 * Schema de validación para el formulario de ventas.
 * Utiliza cadenas para los campos numéricos para poder validar caracteres inválidos antes de parsear.
 */
const schema = Yup.object()
  .shape({
    fecha_venta: Yup.string().required('La fecha es requerida'),
    num_cajas: Yup.string()
      .required('El número de cajas es requerido')
      .test('solo-numeros', 'Ingresa solo números', (val) => {
        if (val == null || val === '') return false;
        return /^\d+$/.test(val);
      })
      .test('mayor-cero', 'Debe ser mayor que 0', (val) => {
        const n = Number(val);
        return !Number.isNaN(n) && n > 0;
      }),
    precio_por_caja: Yup.string()
      .required('El precio por caja es requerido')
      .test('solo-numeros', 'Ingresa solo números', (val) => {
        if (val == null || val === '') return false;
        return /^\d+$/.test(val);
      })
      .test('mayor-igual-cero', 'Debe ser mayor o igual a 0', (val) => {
        const n = Number(val);
        return !Number.isNaN(n) && n >= 0;
      }),
    tipo_mango: Yup.string().min(3, 'Mínimo 3 caracteres').required('El tipo de mango es requerido'),
    gasto: Yup.string()
      .required('El gasto asociado es requerido')
      .test('solo-numeros', 'Ingresa solo números', (val) => {
        if (val == null || val === '') return false;
        return /^\d+$/.test(val);
      })
      .test('mayor-igual-cero', 'Debe ser mayor o igual a 0', (val) => {
        const n = Number(val);
        return !Number.isNaN(n) && n >= 0;
      }),
    descripcion: Yup.string().max(250, 'Máximo 250 caracteres'),
  })
  .test('ganancia-neta', 'La ganancia neta no puede ser negativa', function (values) {
    const n = Number((values as any).num_cajas);
    const p = Number((values as any).precio_por_caja);
    const g = Number((values as any).gasto);
    if (Number.isNaN(n) || Number.isNaN(p) || Number.isNaN(g)) return true;
    return n * p - g >= 0;
  });

const VentaFormModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  defaultCosechaId,
}) => {
  /**
   * Valores por defecto para la creación de ventas.
   * Los campos numéricos se inicializan como cadenas vacías para no mostrar
   * validaciones hasta que el usuario introduzca un valor.
   */
  const defaults = {
    fecha_venta: new Date().toISOString().slice(0, 10),
    num_cajas: '',
    precio_por_caja: '',
    tipo_mango: '',
    gasto: '',
    descripcion: '',
    cosecha: defaultCosechaId ?? 0,
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
                fecha_venta: initialValues.fecha_venta,
                // Convertir números a cadenas para el formulario
                num_cajas: String(initialValues.num_cajas),
                precio_por_caja: String(initialValues.precio_por_caja),
                tipo_mango: initialValues.tipo_mango,
                gasto: String(initialValues.gasto),
                descripcion: initialValues.descripcion ?? '',
                cosecha: initialValues.cosecha,
              }
            : defaults
        }
        validationSchema={schema}
        validateOnBlur={false}
        validateOnChange={false}
        enableReinitialize
        onSubmit={async (
          vals: any,
          helpers: FormikHelpers<any>
        ) => {
          const payload: VentaCreateData | VentaUpdateData = {
            fecha_venta: vals.fecha_venta,
            num_cajas: Number(vals.num_cajas),
            precio_por_caja: Number(vals.precio_por_caja),
            tipo_mango: vals.tipo_mango,
            gasto: Number(vals.gasto),
            descripcion: vals.descripcion || '',
            cosecha: vals.cosecha,
          };
          try {
            await onSubmit(payload);
            onClose();
          } catch (err: any) {
            // Capturar y mapear errores del backend a campos específicos
            const backend = err?.data || err?.response?.data || {};
            const beErrors = backend.errors || backend.data?.errors || {};
            const fieldErrors: Record<string, string> = {};
            // Replicar errores generales a los campos relevantes
            if (Array.isArray(beErrors.non_field_errors)) {
              const msg = beErrors.non_field_errors[0] || 'Error de validación';
              ['fecha_venta', 'num_cajas', 'precio_por_caja', 'gasto', 'tipo_mango'].forEach((f) => {
                fieldErrors[f] = msg;
              });
            }
            Object.entries(beErrors).forEach(([f, msgVal]) => {
              if (f !== 'non_field_errors') {
                const text = Array.isArray(msgVal) ? String(msgVal[0]) : String(msgVal);
                fieldErrors[f] = text;
              }
            });
            helpers.setErrors(fieldErrors);
            handleBackendNotification(backend);
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, isSubmitting, setFieldError }) => (
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
                helperText={errors.fecha_venta as string}
              />
              <TextField
                fullWidth
                name="num_cajas"
                label="Número de cajas"
                type="text"
                value={values.num_cajas}
                onChange={(e) => {
                  const val = e.target.value;
                  // Validar solo dígitos
                  if (val && !/^\d+$/.test(val)) {
                    setFieldError('num_cajas', 'Ingresa solo números');
                  } else {
                    setFieldError('num_cajas', undefined);
                  }
                  handleChange(e);
                }}
                error={!!errors.num_cajas}
                helperText={errors.num_cajas as string}
              />
              <TextField
                fullWidth
                name="precio_por_caja"
                label="Precio por caja"
                type="text"
                value={values.precio_por_caja}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !/^\d+$/.test(val)) {
                    setFieldError('precio_por_caja', 'Ingresa solo números');
                  } else {
                    setFieldError('precio_por_caja', undefined);
                  }
                  handleChange(e);
                }}
                error={!!errors.precio_por_caja}
                helperText={errors.precio_por_caja as string}
              />
              <TextField
                fullWidth
                name="tipo_mango"
                label="Tipo de mango"
                value={values.tipo_mango}
                onChange={handleChange}
                error={!!errors.tipo_mango}
                helperText={errors.tipo_mango as string}
              />
              <TextField
                fullWidth
                name="gasto"
                label="Gasto asociado"
                type="text"
                value={values.gasto}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !/^\d+$/.test(val)) {
                    setFieldError('gasto', 'Ingresa solo números');
                  } else {
                    setFieldError('gasto', undefined);
                  }
                  handleChange(e);
                }}
                error={!!errors.gasto}
                helperText={errors.gasto as string}
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
                helperText={errors.descripcion as string}
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
