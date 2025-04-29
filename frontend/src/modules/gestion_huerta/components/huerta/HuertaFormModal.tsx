// src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx
import React, { useEffect, useRef } from 'react';
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
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';

import { HuertaCreateData } from '../../types/huertaTypes';
import { Propietario } from '../../types/propietarioTypes';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { PermissionButton } from '../../../../components/common/PermissionButton';

const validationSchema = Yup.object().shape({
  nombre: Yup.string().required('Nombre requerido'),
  ubicacion: Yup.string().required('Ubicación requerida'),
  variedades: Yup.string().required('Variedades requeridas'),
  hectareas: Yup.number().positive('Debe ser mayor que 0').required('Requerido'),
  propietario: Yup.number().min(1, 'Selecciona un propietario').required('Requerido'),
});

type OptionType = Propietario | { id: 'new'; nombre: string; apellidos: string };

interface HuertaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: HuertaCreateData) => Promise<void>;
  propietarios: Propietario[];
  onRegisterNewPropietario: () => void;
  defaultPropietarioId?: number;
}

const HuertaFormModal: React.FC<HuertaFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  propietarios,
  onRegisterNewPropietario,
  defaultPropietarioId,
}) => {
  const formikRef = useRef<FormikProps<HuertaCreateData>>(null);

  const initialValues: HuertaCreateData = {
    nombre: '',
    ubicacion: '',
    variedades: '',
    historial: '',
    hectareas: 0,
    propietario: 0,
  };

  useEffect(() => {
    if (open && defaultPropietarioId && formikRef.current) {
      formikRef.current.setFieldValue('propietario', defaultPropietarioId, false);
    }
  }, [defaultPropietarioId, open]);

  useEffect(() => {
    if (!open && formikRef.current) {
      formikRef.current.resetForm({ values: initialValues });
    }
  }, [open]);

  const handleSubmit = async (values: HuertaCreateData, actions: any) => {
    try {
      await onSubmit(values);
    } catch (err: any) {
      const backend =
        err?.response?.data?.data?.errors ||
        err?.response?.data?.errors ||
        {};

      const formikErrors: Record<string, string> = {};
      const touched: Record<string, boolean> = {};

      Object.entries(backend).forEach(([field, msgs]: any) => {
        const msg = Array.isArray(msgs) ? msgs[0] : msgs;
        formikErrors[field] = msg;
        touched[field] = true;
      });

      actions.setErrors(formikErrors);
      actions.setTouched(touched);

      handleBackendNotification(err?.response?.data);
    } finally {
      actions.setSubmitting(false);
    }
  };

  const newOpt: OptionType = { id: 'new', nombre: 'Registrar nuevo propietario', apellidos: '' };
  const opciones: OptionType[] = [
    newOpt,
    ...[...propietarios].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="text-primary-dark font-bold">Nueva Huerta</DialogTitle>

      <Formik
        innerRef={formikRef}
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
                options={opciones}
                groupBy={(o) => (o.id === 'new' ? '' : o.nombre.charAt(0).toUpperCase())}
                getOptionLabel={(o) =>
                  o.id === 'new' ? o.nombre : `${o.nombre} ${o.apellidos}`
                }
                filterOptions={createFilterOptions({
                  matchFrom: 'start',
                  stringify: (o) =>
                    o.id === 'new' ? o.nombre : `${o.nombre} ${o.apellidos}`,
                })}
                renderGroup={(p) =>
                  p.group === '' ? (
                    <div key={p.key}>{p.children}</div>
                  ) : (
                    <div key={p.key}>
                      <Typography variant="subtitle2" sx={{ mt: 2 }}>
                        {p.group}
                      </Typography>
                      {p.children}
                    </div>
                  )
                }
                value={
                  values.propietario
                    ? propietarios.find((p) => p.id === values.propietario) || null
                    : null
                }
                onChange={(_, val) => {
                  if (val?.id === 'new') {
                    onRegisterNewPropietario();
                    setFieldValue('propietario', 0);
                  } else {
                    setFieldValue('propietario', val ? val.id : 0);
                  }
                }}
                clearOnEscape
                clearText="Limpiar"
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
              <PermissionButton
                perm="add_huerta"
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
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

export default HuertaFormModal;
