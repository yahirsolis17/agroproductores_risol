// src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, CircularProgress
} from '@mui/material';
import { Formik, Form } from 'formik';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { applyBackendErrorsToFormik, isValidationError } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
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
  const [formErrors, setFormErrors] = useState<string[]>([]);

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
            setFormErrors([]);
            onClose();
          } catch (err: any) {
            const normalized = applyBackendErrorsToFormik(err, helpers);
            if (isValidationError(err)) {
              setFormErrors(normalized.formErrors);
            } else {
              setFormErrors([]);
              const backend = err?.response?.data || err?.data || {};
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
              <FormAlertBanner
                open={formErrors.length > 0}
                severity="error"
                title="Revisa la información"
                messages={formErrors}
              />
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
