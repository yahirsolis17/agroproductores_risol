// src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { PropietarioCreateData } from '../../types/propietarioTypes';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { PermissionButton } from '../../../../components/common/PermissionButton'; // ← Import

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: PropietarioCreateData) => Promise<any>;
  onSuccess?: (nuevo: any) => void;
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
        validateOnBlur={false}
        onSubmit={async (vals, { setSubmitting, setErrors }) => {
          try {
            const nuevo = await onSubmit(vals);
            handleBackendNotification(nuevo);
            onSuccess?.(nuevo);
            onClose();
          } catch (error: any) {
            // Capturamos el payload de error que viene del thunk/unwrap
            const backend = error?.data || error?.response?.data || {};
            // Backend monta los errores en backend.data.errors
            const erroresDelBackend =
              backend.errors || backend.data?.errors || {};
            const formikErrors: Record<string, string> = {};

            Object.entries(erroresDelBackend).forEach(([key, value]) => {
              formikErrors[key] = Array.isArray(value) ? value[0] : String(value);
            });

            setErrors(formikErrors);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({
          values,
          errors,
          handleChange,
          handleBlur,
          isSubmitting,
        }) => (
          <Form>
            <DialogContent dividers className="space-y-4">
              {['nombre', 'apellidos', 'telefono', 'direccion'].map((field) => {
                const error = errors[field as keyof typeof errors];
                return (
                  <TextField
                    key={field}
                    fullWidth
                    name={field}
                    label={capitalize(field)}
                    value={values[field as keyof typeof values]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(error)}
                    helperText={error || ''}
                  />
                );
              })}
            </DialogContent>

            <DialogActions className="px-6 py-4">
            <PermissionButton
                perm="change_propietario" /* o 'add_propietario', pero cancelar no requiere permiso */
                variant="outlined"
                color="primary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </PermissionButton>
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
