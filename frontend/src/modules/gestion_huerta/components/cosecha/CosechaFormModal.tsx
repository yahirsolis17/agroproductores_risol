import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import { Cosecha } from '../../types/cosechaTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikTextField from '../../../../components/common/form/FormikTextField';

interface Props {
  open: boolean;
  onClose: () => void;
  cosecha?: Cosecha | null;
  onSubmit: (nombre: string) => Promise<void>;
}

const schema = Yup.object({
  nombre: Yup.string().trim().min(3, 'Minimo 3 caracteres').required('Requerido'),
});

const CosechaFormModal: React.FC<Props> = ({ open, onClose, cosecha, onSubmit }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Renombrar cosecha</DialogTitle>
    <Formik
      initialValues={{ nombre: cosecha?.nombre || '' }}
      validationSchema={schema}
      validateOnChange={false}
      validateOnBlur
      validateOnMount={false}
      enableReinitialize
      onSubmit={async (values, helpers) => {
        try {
          await onSubmit(values.nombre.trim());
          onClose();
        } catch (err: unknown) {
          applyBackendErrorsToFormik(err, helpers, {
            fieldNames: ['nombre'],
            spreadNonFieldToFields: ['nombre'],
            alsoSetFormikErrors: true,
          });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, validateForm, setTouched, status, submitForm }) => (
        <Form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            const validationErrors = await validateForm();
            if (Object.keys(validationErrors).length) {
              const touched = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                (acc, key) => ({ ...acc, [key]: true }),
                {},
              );
              setTouched(touched, false);
              focusFirstError(validationErrors, event.currentTarget);
              return;
            }
            submitForm();
          }}
        >
          <DialogContent dividers>
            <FormAlertBanner
              open={Boolean((status as any)?.serverFormErrors?.length)}
              severity="error"
              title="Revisa la informacion"
              messages={(status as any)?.serverFormErrors ?? []}
            />
            <FormikTextField
              autoFocus
              fullWidth
              label="Nombre"
              name="nombre"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <PermissionButton
              perm="change_cosecha"
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar'}
            </PermissionButton>
          </DialogActions>
        </Form>
      )}
    </Formik>
  </Dialog>
);

export default CosechaFormModal;
