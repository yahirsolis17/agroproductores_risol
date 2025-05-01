// src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, Typography,
} from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';

import { HuertaCreateData } from '../../types/huertaTypes';
import { Propietario }      from '../../types/propietarioTypes';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';

/* ───────────────────────── Validación ─────────────────────────── */
const yupSchema = Yup.object({
  nombre:      Yup.string().required('Nombre requerido'),
  ubicacion:   Yup.string().required('Ubicación requerida'),
  variedades:  Yup.string().required('Variedades requeridas'),
  hectareas:   Yup.number().positive('Debe ser mayor que 0').required('Requerido'),
  propietario: Yup.number().min(1, 'Selecciona un propietario').required('Requerido'),
});

/* ────────────────────────── Tipos & Props ─────────────────────── */
type NewOption   = { id: 'new'; label: string };
type PropOption  = Propietario & { label: string };
type OptionType  = NewOption | PropOption;

interface Props {
  open:  boolean;
  onClose: () => void;

  /** Alta o edición */
  onSubmit: (vals: HuertaCreateData) => Promise<void>;

  propietarios: Propietario[];
  onRegisterNewPropietario: () => void;

  /* Edición */
  isEdit?: boolean;
  initialValues?: HuertaCreateData;
  defaultPropietarioId?: number;
}

/* ──────────────────────────── Componente ──────────────────────── */
const HuertaFormModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  propietarios,
  onRegisterNewPropietario,
  isEdit = false,
  initialValues,
  defaultPropietarioId,
}) => {
  /* ---------- refs ---------- */
  const formikRef = useRef<FormikProps<HuertaCreateData>>(null);

  /* ---------- valores por defecto ---------- */
  const defaults: HuertaCreateData = {
    nombre: '', ubicacion: '', variedades: '',
    historial: '', hectareas: 0, propietario: 0,
  };

  /* ---------- efectos ---------- */
  useEffect(() => {
    if (open && defaultPropietarioId && formikRef.current && !isEdit) {
      formikRef.current.setFieldValue('propietario', defaultPropietarioId, false);
    }
  }, [defaultPropietarioId, open, isEdit]);

  useEffect(() => {
    if (!open && formikRef.current) formikRef.current.resetForm();
  }, [open]);

  /* ---------- submit helper ---------- */
  const submit = async (vals: HuertaCreateData, actions: any) => {
    try {
      await onSubmit(vals);
      onClose();
    } catch (err: any) {
      const backend       = err?.data || err?.response?.data || {};
      const beErrors      = backend.errors || backend.data?.errors || {};
      const formikErrors: Record<string, string> = {};

      if (Array.isArray(beErrors.non_field_errors)) {
        const msg = beErrors.non_field_errors[0];
        ['nombre', 'ubicacion', 'propietario'].forEach(f => (formikErrors[f] = msg));
      }
      Object.entries(beErrors).forEach(([field, msgs]: any) => {
        if (field !== 'non_field_errors')
          formikErrors[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
      });

      actions.setErrors(formikErrors);
      handleBackendNotification(backend);
    } finally {
      actions.setSubmitting(false);
    }
  };

  /* ---------- opciones de propietario ---------- */
  const registroNuevo: NewOption = { id: 'new', label: 'Registrar nuevo propietario' };

  const opciones: OptionType[] = React.useMemo(() => {
    const activos = propietarios
      .filter(p => !p.archivado_en)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  
    const propietarioActual =
      isEdit && initialValues?.propietario
        ? propietarios.find(p => p.id === initialValues.propietario)
        : null;
  
    const listaFinal: (NewOption | Propietario)[] = propietarioActual && propietarioActual.archivado_en
      ? [propietarioActual, ...activos.filter(p => p.id !== propietarioActual.id)]
      : activos;
  
    const opcionesConLabel: OptionType[] = [
      registroNuevo,
      ...listaFinal.map(p => ({
        ...p,
        label: 'nombre' in p && 'apellidos' in p
          ? `${p.nombre} ${p.apellidos}`
          : p.label,
      })),
    ];
  
    return opcionesConLabel;
  }, [propietarios, isEdit, initialValues]);
  

  /* ---------- render ---------- */
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="text-primary-dark font-bold">
        {isEdit ? 'Editar Huerta' : 'Nueva Huerta'}
      </DialogTitle>

      <Formik
        innerRef={formikRef}
        initialValues={initialValues || defaults}
        validationSchema={yupSchema}
        validateOnChange={false}
        validateOnBlur={false}
        enableReinitialize
        onSubmit={submit}
      >
        {({ values, errors, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers className="space-y-4">
              <TextField fullWidth label="Nombre"     name="nombre"
                value={values.nombre}     onChange={handleChange}
                error={!!errors.nombre}   helperText={errors.nombre || ''} />

              <TextField fullWidth label="Ubicación"  name="ubicacion"
                value={values.ubicacion}  onChange={handleChange}
                error={!!errors.ubicacion} helperText={errors.ubicacion || ''} />

              <TextField fullWidth label="Variedades (ej. Kent, Ataulfo)" name="variedades"
                value={values.variedades} onChange={handleChange}
                error={!!errors.variedades} helperText={errors.variedades || ''} />

              <TextField fullWidth label="Hectáreas" name="hectareas" type="number"
                value={values.hectareas}  onChange={handleChange}
                error={!!errors.hectareas} helperText={errors.hectareas || ''} />

              <Autocomplete
                options={opciones}
                getOptionLabel={o => o.label}
                isOptionEqualToValue={(o,v)=>o.id===v.id}
                groupBy={o => o.id === 'new' ? '' : o.label[0].toUpperCase()}
                filterOptions={createFilterOptions({ matchFrom:'start', stringify:o=>o.label })}
                value={
                  values.propietario
                    ? (opciones.find(o => o.id === values.propietario) as OptionType)
                    : null
                }
                onChange={(_, val) => {
                  if (val?.id === 'new') {
                    onRegisterNewPropietario();
                    setFieldValue('propietario', 0);
                  } else if (val && typeof val.id === 'number') {
                    setFieldValue('propietario', val.id);
                  } else {
                    setFieldValue('propietario', 0);
                  }
                }}
                clearOnEscape
                renderGroup={p =>
                  p.group === ''
                    ? <div key={p.key}>{p.children}</div>
                    : (
                      <div key={p.key}>
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>{p.group}</Typography>
                        {p.children}
                      </div>
                    )
                }
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Propietario"
                    error={!!errors.propietario}
                    helperText={errors.propietario || ''}
                  />
                )}
              />
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button variant="outlined" color="primary" onClick={onClose}>Cancelar</Button>
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
