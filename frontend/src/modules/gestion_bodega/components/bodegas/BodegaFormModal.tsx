// src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, CircularProgress
} from '@mui/material';
import { Formik, Form, Field, FieldProps } from 'formik';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';

import type {
  Bodega,
  BodegaCreateData,
  BodegaUpdateData,
} from '../../types/bodegaTypes';

type FormValues = {
  nombre: string;
  ubicacion: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  // onSubmit: la página decide si hace create o update con estos datos
  onSubmit: (payload: BodegaCreateData | BodegaUpdateData) => Promise<any> | void;
  isEdit?: boolean;
  initialValues?: Partial<Bodega>;
  loading?: boolean;
}

const validate = (v: FormValues) => {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  const nombre = (v.nombre ?? '').trim();
  if (!nombre) errors.nombre = 'Requerido';
  else if (nombre.length < 3) errors.nombre = 'Mínimo 3 caracteres';
  if ((v.ubicacion ?? '').length > 255) errors.ubicacion = 'Máximo 255 caracteres';
  return errors;
};

const BodegaFormModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  isEdit = false,
  initialValues,
  loading = false,
}) => {
  const init: FormValues = {
    nombre: initialValues?.nombre ?? '',
    ubicacion: initialValues?.ubicacion ?? '',
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="text-primary-dark font-bold">
        {isEdit ? 'Editar Bodega' : 'Nueva Bodega'}
      </DialogTitle>

      <Formik<FormValues>
        initialValues={init}
        validate={validate}
        enableReinitialize
        onSubmit={async (vals, { setSubmitting, setErrors }) => {
          try {
            const payload: BodegaCreateData | BodegaUpdateData = {
              nombre: vals.nombre.trim(),
              ubicacion: vals.ubicacion.trim() || undefined,
            };
            await onSubmit(payload);
            onClose();
          } catch (err: any) {
            const backend = err?.response?.data || err?.data || {};
            const beErrors = backend.errors || backend.data?.errors || {};
            const fErrors: Record<string, string> = {};

            if (Array.isArray(beErrors?.non_field_errors)) {
              const msg = beErrors.non_field_errors[0];
              ['nombre', 'ubicacion'].forEach((f) => (fErrors[f] = msg));
            }
            Object.entries(beErrors).forEach(([field, msgs]: [string, unknown]) => {
              if (field !== 'non_field_errors') fErrors[field] = Array.isArray(msgs) ? (msgs as string[])[0] : String(msgs);
            });

            setErrors(fErrors);
            handleBackendNotification(backend);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ errors, touched, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Box display="grid" gap={2}>
                <Field name="nombre">
                  {({ field }: FieldProps) => (
                    <TextField
                      {...field}
                      label="Nombre"
                      fullWidth
                      size="small"
                      autoFocus
                      error={Boolean(touched.nombre && errors.nombre)}
                      helperText={touched.nombre && errors.nombre}
                    />
                  )}
                </Field>

                <Field name="ubicacion">
                  {({ field }: FieldProps) => (
                    <TextField
                      {...field}
                      label="Ubicación"
                      fullWidth
                      size="small"
                      error={Boolean(touched.ubicacion && errors.ubicacion)}
                      helperText={touched.ubicacion && errors.ubicacion}
                    />
                  )}
                </Field>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} color="inherit" variant="outlined" disabled={isSubmitting || loading}>
                Cancelar
              </Button>
              <PermissionButton
                perm={isEdit ? 'change_bodega' : 'add_bodega'}
                type="submit"
                variant="contained"
                disabled={isSubmitting || loading}
              >
                {isSubmitting || loading ? <CircularProgress size={22} /> : (isEdit ? 'Guardar' : 'Crear')}
              </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default BodegaFormModal;
