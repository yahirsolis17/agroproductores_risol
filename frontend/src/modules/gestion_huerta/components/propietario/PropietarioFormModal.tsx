// src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Button,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { PropietarioCreateData } from '../../types/propietarioTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton'; // ← Import
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';

import FormikTextField from '../../../../components/common/form/FormikTextField';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: PropietarioCreateData) => Promise<unknown>;
  onSuccess?: (nuevo: unknown) => void;
  initialValues?: PropietarioCreateData;
  isEdit?: boolean;
}

const yupSchema = Yup.object({
  nombre: Yup.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .required('El nombre es requerido.'),
  apellidos: Yup.string()
    .min(3, 'Los apellidos deben tener al menos 3 caracteres.')
    .required('Los apellidos son requeridos.'),
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos.')
    .required('El teléfono es requerido.'),
  direccion: Yup.string()
    .min(5, 'La dirección debe tener al menos 5 caracteres.')
    .required('La dirección es requerida.'),
});

export default function PropietarioFormModal({
  open,
  onClose,
  onSubmit,
  onSuccess,
  initialValues,
  isEdit = false,
}: Props) {
  const defaults: PropietarioCreateData = {
    nombre: '',
    apellidos: '',
    telefono: '',
    direccion: '',
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason !== 'backdropClick') onClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle className="text-primary-dark font-bold">
        {isEdit ? 'Editar Propietario' : 'Nuevo Propietario'}
      </DialogTitle>

      <Formik
        initialValues={initialValues || defaults}
        validationSchema={yupSchema}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (vals, helpers) => {
          try {
            const nuevo = await onSubmit(vals);
            onSuccess?.(nuevo);
            onClose();
          } catch (error: unknown) {
            applyBackendErrorsToFormik(error, helpers);
          } finally {
            helpers.setSubmitting(false);
          }
        }}

      >
        {({
          values,
          handleChange,
          handleBlur,
          isSubmitting,
          setTouched,
          validateForm,
          submitForm,
        }) => (
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
            <DialogContent dividers className="space-y-4">
              {/* No banner - errores van inline en cada campo */}
              {['nombre', 'apellidos', 'telefono', 'direccion'].map((field) => {
                return (
                  <FormikTextField
                    key={field}
                    fullWidth
                    name={field}
                    label={capitalize(field)}
                    value={values[field as keyof typeof values]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                );
              })}
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button
                variant="outlined"
                color="primary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <PermissionButton
                perm={isEdit ? 'change_propietario' : 'add_propietario'}
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  'Guardar'
                )}
              </PermissionButton>

            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}

function capitalize(campo: string) {
  const labels: Record<string, string> = {
    nombre: 'Nombre',
    apellidos: 'Apellidos',
    telefono: 'Teléfono',
    direccion: 'Dirección',
  };
  return labels[campo] || campo.charAt(0).toUpperCase() + campo.slice(1);
}
