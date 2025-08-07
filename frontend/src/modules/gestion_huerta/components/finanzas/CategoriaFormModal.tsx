import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Props {
  open: boolean;
  onClose: () => void;
  isEdit?: boolean;
  initialName?: string;
  /** onSubmit debe crear/editar según isEdit; solo recibe el nombre */
  onSubmit: (nombre: string) => Promise<void>;
}

const schema = Yup.object({
  nombre: Yup.string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(80, 'Máximo 80 caracteres')
    .required('Nombre requerido'),
});

const CategoriaFormModal: React.FC<Props> = ({
  open,
  onClose,
  isEdit = false,
  initialName = '',
  onSubmit,
}) => {
  const formikRef = useRef<FormikProps<{ nombre: string }>>(null);

  useEffect(() => {
    if (!open && formikRef.current) {
      formikRef.current.resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle className="text-primary-dark font-bold">
        {isEdit ? 'Editar categoría' : 'Nueva categoría'}
      </DialogTitle>

      <Formik
        innerRef={formikRef}
        initialValues={{ nombre: initialName }}
        validationSchema={schema}
        validateOnBlur={false}
        validateOnChange={false}
        enableReinitialize
        onSubmit={async (vals, actions) => {
          try {
            await onSubmit(vals.nombre.trim());
            onClose();
          } catch (e: any) {
            const backend = e?.data || e?.response?.data || {};
            const beErrors = backend.errors || backend.data?.errors || {};
            actions.setErrors({
              nombre: Array.isArray(beErrors.nombre) ? beErrors.nombre[0] : beErrors.nombre,
            });
          } finally {
            actions.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, isSubmitting }) => (
          <Form>
            <DialogContent dividers className="space-y-3">
              <TextField
                label="Nombre de categoría"
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                error={!!errors.nombre}
                helperText={errors.nombre || ''}
                fullWidth
                autoFocus
              />
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button variant="outlined" onClick={onClose}>
                Cancelar
              </Button>
              <PermissionButton
                perm={isEdit ? 'change_categoriainversion' : 'add_categoriainversion'}
                type="submit"
                variant="contained"
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
              </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaFormModal;
