import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import type { CategoriaInversionCreateData } from '../../types/categoriaInversionTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */
interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CategoriaInversionCreateData) => Promise<any>;
  isEdit?: boolean;
  initialValues?: CategoriaInversionCreateData; // sólo `nombre`
}

/* -------------------------------------------------------------------------- */
/*  Yup                                                                       */
/* -------------------------------------------------------------------------- */
const schema = Yup.object({
  nombre: Yup.string()
    .min(3, 'Mínimo 3 caracteres')
    .required('El nombre es obligatorio'),
});

/* -------------------------------------------------------------------------- */
/*  Componente                                                                */
/* -------------------------------------------------------------------------- */
const CategoriaFormModal: React.FC<Props> = ({
  open, onClose, onSubmit,
  isEdit = false, initialValues,
}) => {
  const defaults: CategoriaInversionCreateData = { nombre: '' };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle className="text-primary-dark font-bold">
        {isEdit ? 'Editar categoría' : 'Nueva categoría'}
      </DialogTitle>

      <Formik
        initialValues={initialValues || defaults}
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur={false}
        enableReinitialize
        onSubmit={async (vals, { setSubmitting, setErrors }) => {
          try {
            await onSubmit(vals);
            onClose();
          } catch (err: any) {
            /* 1️⃣ Mapeo de errores backend → Formik */
            const be = err?.data || err?.response?.data || {};
            const errs = be.errors || be.data?.errors || {};
            const f: Record<string, string> = {};
            Object.entries(errs).forEach(([k, v]: any) => {
              f[k] = Array.isArray(v) ? v[0] : String(v);
            });
            setErrors(f);
            handleBackendNotification(be);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, isSubmitting }) => (
          <Form>
            <DialogContent dividers className="space-y-4">
              <TextField
                fullWidth label="Nombre de la categoría"
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                error={Boolean(errors.nombre)}
                helperText={errors.nombre}
              />
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <PermissionButton
                perm={isEdit ? 'change_categoria_inversion' : 'add_categoria_inversion'}
                type="submit" variant="contained" disabled={isSubmitting}
              >
                {isSubmitting
                  ? <CircularProgress size={22} color="inherit" />
                  : 'Guardar'}
              </PermissionButton>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CategoriaFormModal;
