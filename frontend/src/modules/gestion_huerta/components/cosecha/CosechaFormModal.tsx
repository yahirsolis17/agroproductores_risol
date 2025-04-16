// src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

// Ajusta el tipo a tu definición real de create
// Podrías tener algo como { nombre: string; huerta: number; finalizada?: boolean; ... } 
// y más campos según tu modelo/serializers
interface CosechaCreateData {
  nombre: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  finalizada?: boolean;
  huerta?: number; 
  // ...otros campos que necesites
}

interface CosechaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CosechaCreateData) => Promise<void>;
  // Si quieres forzar la huerta:
  huertaId?: number; // si deseas pasarlo
}

// Validación con Yup
const validationSchema = Yup.object().shape({
  nombre: Yup.string()
    .min(3, 'Mínimo 3 caracteres')
    .required('El nombre es requerido'),
  fecha_inicio: Yup.date()
    .typeError('Fecha inválida, usa formato YYYY-MM-DD'),
  fecha_fin: Yup.date()
    .typeError('Fecha inválida, usa formato YYYY-MM-DD'),
});

const CosechaFormModal: React.FC<CosechaFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  huertaId
}) => {

  // Valores iniciales (ajusta según tus necesidades)
  const initialValues: CosechaCreateData = {
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    finalizada: false,
    huerta: huertaId, // si quieres asignar la huerta directamente
  };

  const handleSubmit = async (values: CosechaCreateData, actions: any) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error('Error al crear/editar cosecha:', error);
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="text-primary-dark font-bold">
        Nueva Cosecha
      </DialogTitle>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers className="space-y-4">
              <TextField
                fullWidth
                name="nombre"
                label="Nombre"
                value={values.nombre}
                onChange={handleChange}
                error={touched.nombre && Boolean(errors.nombre)}
                helperText={touched.nombre && errors.nombre}
              />

              <TextField
                fullWidth
                name="fecha_inicio"
                label="Fecha de Inicio (YYYY-MM-DD)"
                value={values.fecha_inicio}
                onChange={handleChange}
                error={touched.fecha_inicio && Boolean(errors.fecha_inicio)}
                helperText={touched.fecha_inicio && errors.fecha_inicio}
              />

              <TextField
                fullWidth
                name="fecha_fin"
                label="Fecha de Fin (YYYY-MM-DD)"
                value={values.fecha_fin}
                onChange={handleChange}
                error={touched.fecha_fin && Boolean(errors.fecha_fin)}
                helperText={touched.fecha_fin && errors.fecha_fin}
              />

              <FormControlLabel
                label="¿Cosecha Finalizada?"
                control={
                  <Checkbox
                    checked={values.finalizada || false}
                    onChange={(e) => setFieldValue('finalizada', e.target.checked)}
                  />
                }
              />
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button onClick={onClose} color="secondary" variant="outlined">
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CosechaFormModal;
