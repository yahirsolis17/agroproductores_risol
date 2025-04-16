import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Typography,
} from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { HuertaCreateData } from '../../types/huertaTypes';
import { Propietario } from '../../types/propietarioTypes';

// Definir OptionType: se extiende la interfaz Propietario en las opciones normales,
// y se define de manera especial la opción "new" para registrar un nuevo propietario.
type OptionType = Propietario | {
  id: "new";
  nombre: string;
  apellidos: string;
};

interface HuertaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: HuertaCreateData) => Promise<void>;
  propietarios: Propietario[]; // Lista para el selector
  onRegisterNewPropietario: () => void; // Callback para abrir el modal de registro de propietario
  defaultPropietarioId?: number; // Si se registra un nuevo propietario, se autoselecciona
}

const validationSchema = Yup.object().shape({
  nombre: Yup.string().required('Nombre requerido'),
  ubicacion: Yup.string().required('Ubicación requerida'),
  variedades: Yup.string().required('Variedades requeridas'),
  hectareas: Yup.number().positive('Debe ser mayor que 0').required('Requerido'),
  propietario: Yup.number().required('Selecciona un propietario'),
});

const HuertaFormModal: React.FC<HuertaFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  propietarios,
  onRegisterNewPropietario,
  defaultPropietarioId,
}) => {
  // Valores iniciales para el formulario.
  const initialValues: HuertaCreateData = {
    nombre: '',
    ubicacion: '',
    variedades: '',
    historial: '',
    hectareas: 0,
    propietario: defaultPropietarioId || 0, // Se autoselecciona si se pasa el id
  };

  const handleSubmit = async (values: HuertaCreateData, actions: any) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      console.error('Error al crear huerta:', err);
    } finally {
      actions.setSubmitting(false);
    }
  };

  // Opción especial: Siempre disponible para "Registrar nuevo propietario"
  const newOption: OptionType = {
    id: "new",
    nombre: "Registrar nuevo propietario",
    apellidos: "",
  };

  // Ordenar alfabéticamente los propietarios (sin incluir la opción especial)
  const sortedPropietarios = [...propietarios].sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  );

  // Construir las opciones: la opción especial en primer lugar seguida de los propietarios ordenados.
  const options: OptionType[] = [newOption, ...sortedPropietarios];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="text-primary-dark font-bold">
        Nueva Huerta
      </DialogTitle>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
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
                name="ubicacion"
                label="Ubicación"
                value={values.ubicacion}
                onChange={handleChange}
                error={touched.ubicacion && Boolean(errors.ubicacion)}
                helperText={touched.ubicacion && errors.ubicacion}
              />

              <TextField
                fullWidth
                name="variedades"
                label="Variedades (ej. Kent, Ataulfo)"
                value={values.variedades}
                onChange={handleChange}
                error={touched.variedades && Boolean(errors.variedades)}
                helperText={touched.variedades && errors.variedades}
              />

              <TextField
                fullWidth
                name="hectareas"
                label="Hectáreas"
                type="number"
                value={values.hectareas}
                onChange={handleChange}
                error={touched.hectareas && Boolean(errors.hectareas)}
                helperText={touched.hectareas && errors.hectareas}
              />

              <Autocomplete
                options={options}
                groupBy={(option) =>
                  option.id === "new" ? '' : option.nombre.charAt(0).toUpperCase()
                }
                getOptionLabel={(option) =>
                  option.id === "new"
                    ? option.nombre
                    : `${option.nombre} ${option.apellidos}`
                }
                filterOptions={createFilterOptions({
                  matchFrom: 'start',
                  stringify: (option) =>
                    option.id === "new"
                      ? option.nombre
                      : `${option.nombre} ${option.apellidos}`,
                })}
                renderGroup={(params) => {
                  if (params.group === '') return <div key={params.key}>{params.children}</div>;
                  return (
                    <div key={params.key}>
                      <Typography variant="subtitle2" sx={{ mt: 2 }}>
                        {params.group}
                      </Typography>
                      {params.children}
                    </div>
                  );
                }}
                value={
                  options.find(o =>
                    defaultPropietarioId ? o.id === defaultPropietarioId : o.id === values.propietario
                  ) || null
                }
                onChange={(_, value) => {
                  if (value) {
                    if (value.id === "new") {
                      onRegisterNewPropietario();
                      setFieldValue("propietario", 0);
                    } else {
                      setFieldValue("propietario", value.id);
                    }
                  } else {
                    setFieldValue("propietario", 0);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Propietario"
                    error={touched.propietario && Boolean(errors.propietario)}
                    helperText={touched.propietario && errors.propietario}
                  />
                )}
              />
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button onClick={onClose} variant="outlined" color="secondary">
                Cancelar
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default HuertaFormModal;
