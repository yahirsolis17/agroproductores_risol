// src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, CircularProgress
} from '@mui/material';
import { Formik, Form } from 'formik';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import {
  applyBackendErrorsToFormik,
  normalizeBackendErrors,
  isValidationError,
} from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormikTextField from '../../../../components/common/form/FormikTextField';

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
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (vals, helpers) => {
          try {
            const payload: BodegaCreateData | BodegaUpdateData = {
              nombre: vals.nombre.trim(),
              ubicacion: vals.ubicacion.trim() || undefined,
            };
            await onSubmit(payload);
            onClose();
          } catch (err: any) {
            const normalized = normalizeBackendErrors(err);
            const backend = err?.response?.data || err?.data || err;
            const status = normalized.status ?? err?.response?.status ?? err?.status;

            if (status && status >= 500) {
              helpers.setStatus(undefined as any);
              handleBackendNotification(backend);
            } else if (isValidationError(normalized)) {
              applyBackendErrorsToFormik(err, helpers);
            } else {
              helpers.setStatus(undefined as any);
              handleBackendNotification(backend);
            }
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, setTouched, validateForm, submitForm }) => (
          <Form
            onSubmit={async (event) => {
              event.preventDefault();
              const validationErrors = await validateForm();
              if (Object.keys(validationErrors).length) {
                const touchedFields = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                  (acc, key) => ({ ...acc, [key]: true }),
                  {}
                );
                setTouched(touchedFields, false);
                focusFirstError(validationErrors, event.currentTarget);
                return;
              }
              submitForm();
            }}
          >
            <DialogContent dividers>
              <Box display="grid" gap={2}>
                <FormikTextField
                  name="nombre"
                  label="Nombre"
                  fullWidth
                  size="small"
                  autoFocus
                />

                <FormikTextField
                  name="ubicacion"
                  label="Ubicación"
                  fullWidth
                  size="small"
                />
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
