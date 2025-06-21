// src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx
import React, { useEffect, useRef } from 'react';
import {
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
/* ───────── Validación ───────── */
const yupSchema = Yup.object({
  nombre: Yup.string().required('Nombre requerido'),
  ubicacion: Yup.string().required('Ubicación requerida'),
  variedades: Yup.string().required('Variedades requeridas'),
  hectareas: Yup.number()
    .positive('Debe ser mayor que 0')
    .required('Requerido'),
  propietario: Yup.number()
    .min(1, 'Selecciona un propietario')
    .required('Requerido'),
});

/* ───────── Types & Props ───────── */
type NewOption = { id: 'new'; label: string };
type PropOption = Propietario & { label: string };
type OptionType = NewOption | PropOption;

interface Props {
  open: boolean; // → para reset de efectos
  onClose: () => void;
  loading?: boolean;  
  onSubmit: (vals: HuertaCreateData) => Promise<void>;

  propietarios: Propietario[];
  onRegisterNewPropietario: () => void;

  isEdit?: boolean;
  initialValues?: HuertaCreateData;
  defaultPropietarioId?: number; // → ID para auto-selección al crear inline
}

const HuertaFormModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  propietarios,
  onRegisterNewPropietario,
  isEdit = false,
  initialValues,
  loading = false,
  defaultPropietarioId,
}) => {
  const formikRef = useRef<FormikProps<HuertaCreateData>>(null);

  const defaults: HuertaCreateData = {
    nombre: '',
    ubicacion: '',
    variedades: '',
    historial: '',
    hectareas: 0,
    propietario: 0,
  };

  /* ───────── Efecto: preseleccionar propietario archivado en edición ───────── */
  // Ya incluimos al propietarioActual en la lista de opciones aunque esté archivado
  // y Formik inicializa su valor desde `initialValues.propietario`.

  /* ───────── Efecto: auto-seleccionar nuevo propietario tras crearlo ───────── */
  useEffect(() => {
    if (
      open &&
      !isEdit &&
      defaultPropietarioId &&
      formikRef.current
    ) {
      formikRef.current.setFieldValue(
        'propietario',
        defaultPropietarioId,
        false
      );
    }
  }, [defaultPropietarioId, open, isEdit]);

  /* ───────── Efecto: reset de formulario al cerrar ───────── */
  useEffect(() => {
    if (!open && formikRef.current) {
      formikRef.current.resetForm();
    }
  }, [open]);

  /* ───────── Handler de submit con mapeo de errores del backend ───────── */
  const submit = async (vals: HuertaCreateData, actions: any) => {
    try {
      await onSubmit(vals);
      onClose();
    } catch (err: any) {
      const backend = err?.data || err?.response?.data || {};
      const beErrors =
        backend.errors || backend.data?.errors || {};
      const fErrors: Record<string, string> = {};

      if (Array.isArray(beErrors.non_field_errors)) {
        const msg = beErrors.non_field_errors[0];
        ['nombre', 'ubicacion', 'propietario'].forEach(
          (f) => (fErrors[f] = msg)
        );
      }
      Object.entries(beErrors).forEach(
        ([field, msgs]: any) => {
          if (field !== 'non_field_errors') {
            fErrors[field] = Array.isArray(msgs)
              ? msgs[0]
              : String(msgs);
          }
        }
      );

      actions.setErrors(fErrors);
      handleBackendNotification(backend);
    } finally {
      actions.setSubmitting(false);
    }
  };

  /* ───────── Construcción de opciones para Autocomplete ───────── */
  const registroNuevo: NewOption = {
    id: 'new',
    label: 'Registrar nuevo propietario',
  };

  const opciones: OptionType[] = React.useMemo(() => {
    // 1) Sólo propietarios activos
    const activos = propietarios
      .filter((p) => !p.archivado_en)
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );

    // 2) Si estoy editando y el actual está archivado,
    //    incluyo ese registro al principio para preselección
  const propietarioActual =
    (isEdit && initialValues?.propietario)
      ? propietarios.find(p => p.id === initialValues.propietario)
      : null;


    const listaFinal =
      propietarioActual &&
      propietarioActual.archivado_en
        ? [
            propietarioActual,
            ...activos.filter(
              (p) =>
                p.id !== propietarioActual.id
            ),
          ]
        : activos;

    return [
      registroNuevo,
      ...listaFinal.map((p) => ({
        ...p,
        label: `${p.nombre} ${p.apellidos}`,
      })),
    ];
  }, [propietarios, isEdit, initialValues]);

  /* ───────── Render ───────── */
  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues || defaults}
      validationSchema={yupSchema}
      validateOnChange={false}
      validateOnBlur={false}
      enableReinitialize
      onSubmit={submit}
    >
      {({
        values,
        errors,
        handleChange,
        setFieldValue,
        isSubmitting,
      }) => (
        <Form>
          <DialogContent dividers className="space-y-4">
            <TextField
              fullWidth
              label="Nombre"
              name="nombre"
              value={values.nombre}
              onChange={handleChange}
              error={!!errors.nombre}
              helperText={errors.nombre || ''}
            />

            <TextField
              fullWidth
              label="Ubicación"
              name="ubicacion"
              value={values.ubicacion}
              onChange={handleChange}
              error={!!errors.ubicacion}
              helperText={errors.ubicacion || ''}
            />

            <TextField
              fullWidth
              label="Variedades (ej. Kent, Ataulfo)"
              name="variedades"
              value={values.variedades}
              onChange={handleChange}
              error={!!errors.variedades}
              helperText={errors.variedades || ''}
            />

            <TextField
              fullWidth
              label="Hectáreas"
              name="hectareas"
              type="number"
              value={values.hectareas}
              onChange={handleChange}
              error={!!errors.hectareas}
              helperText={errors.hectareas || ''}
            />

            <Autocomplete
              options={opciones}
              loading={loading}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              groupBy={(o) =>
                o.id === 'new'
                  ? ''
                  : o.label[0].toUpperCase()
              }
              filterOptions={createFilterOptions({
                matchFrom: 'start',
                stringify: (o) => o.label,
              })}
              value={
                values.propietario
                  ? (opciones.find(
                      (o) =>
                        o.id === values.propietario
                    ) as OptionType)
                  : null
              }
              onChange={(_, val) => {
                if (val?.id === 'new') {
                  onRegisterNewPropietario();
                  // dejamos el campo en 0 hasta que llegue defaultPropietarioId
                  setFieldValue('propietario', 0);
                } else if (
                  val &&
                  typeof val.id === 'number'
                ) {
                  setFieldValue('propietario', val.id);
                } else {
                  setFieldValue('propietario', 0);
                }
              }}
              clearOnEscape
              loadingText="Cargando…"
              renderGroup={(p) =>
                p.group === '' ? (
                  <div key={p.key}>{p.children}</div>
                ) : (
                  <div key={p.key}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 2 }}
                    >
                      {p.group}
                    </Typography>
                    {p.children}
                  </div>
                )
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Propietario"
                  error={!!errors.propietario}
                  helperText={errors.propietario || ''}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </DialogContent>

          <DialogActions className="px-6 py-4">
            <Button
              variant="outlined"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <PermissionButton
              perm={
                isEdit ? 'change_huerta' : 'add_huerta'
              }
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <CircularProgress size={22} />
              ) : (
                'Guardar'
              )}
            </PermissionButton>
          </DialogActions>
        </Form>
      )}
    </Formik>
  );
};

export default HuertaFormModal;
