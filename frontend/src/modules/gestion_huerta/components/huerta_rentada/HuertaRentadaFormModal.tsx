// src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  DialogContent, DialogActions,
  Button, TextField, CircularProgress
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';

import { HuertaRentadaCreateData } from '../../types/huertaRentadaTypes';
import { Propietario }             from '../../types/propietarioTypes';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { propietarioService } from '../../services/propietarioService';
/* ---------- Yup ---------- */
const yupSchema = Yup.object({
  nombre:      Yup.string().required('Nombre requerido'),
  ubicacion:   Yup.string().required('Ubicación requerida'),
  variedades:  Yup.string().required('Variedades requeridas'),
  hectareas:   Yup.number().positive('Debe ser mayor que 0').required('Requerido'),
  monto_renta: Yup.number().positive('Debe ser mayor que 0').required('Requerido'),
  propietario: Yup.number().min(1, 'Selecciona un propietario').required('Requerido'),
});

/* ---------- Types ---------- */
type NewOption  = { id: 'new'; label: string; value: 'new' };
type PropOption = { id: number; label: string; value: number };
type OptionType = NewOption | PropOption;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (vals: HuertaRentadaCreateData) => Promise<void>;
  propietarios: Propietario[];
  onRegisterNewPropietario: () => void;
  isEdit?: boolean;
  initialValues?: HuertaRentadaCreateData;
  defaultPropietarioId?: number;
}

const HuertaRentadaFormModal: React.FC<Props> = ({
  open, onClose, onSubmit,
   onRegisterNewPropietario,
  isEdit = false, initialValues, defaultPropietarioId,
}) => {
  const formikRef = useRef<FormikProps<HuertaRentadaCreateData>>(null);

  const defaults: HuertaRentadaCreateData = {
    nombre: '', ubicacion: '', variedades: '',
    historial: '', hectareas: 0, monto_renta: 0, propietario: 0,
  };

  useEffect(() => {
    if (open && defaultPropietarioId && formikRef.current && !isEdit) {
      formikRef.current.setFieldValue('propietario', defaultPropietarioId, false);
    }
  }, [defaultPropietarioId, open, isEdit]);

  useEffect(() => {
    if (!open && formikRef.current) formikRef.current.resetForm();
  }, [open]);

  const submit = async (vals: HuertaRentadaCreateData, actions: any) => {
    try {
      await onSubmit(vals);
      onClose();
    } catch (err: any) {
      const backend  = err?.data || err?.response?.data || {};
      const beErrors = backend.errors || backend.data?.errors || {};
      const fErrors: Record<string, string> = {};

      if (Array.isArray(beErrors.non_field_errors)) {
        const msg = beErrors.non_field_errors[0];
        ['nombre', 'ubicacion', 'propietario'].forEach(f => (fErrors[f] = msg));
      }
      Object.entries(beErrors).forEach(([field, msgs]: any) => {
        if (field !== 'non_field_errors')
          fErrors[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
      });

      actions.setErrors(fErrors);
      handleBackendNotification(backend);
    } finally {
      actions.setSubmitting(false);
    }
  };

  /* ───────── Estado para autocomplete dinámico ───────── */
  const [asyncOptions, setAsyncOptions] = useState<PropOption[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncInput, setAsyncInput] = useState('');

  /* ───────── Opción para registrar nuevo propietario ───────── */
  const registroNuevo: NewOption = {
    id: 'new',
    label: 'Registrar nuevo propietario',
    value: 'new',
  };

  /* ───────── Función de búsqueda dinámica (replicando Propietarios.tsx) ───────── */
  let abortController: AbortController | null = null;

  const loadPropietarioOptions = async (input: string): Promise<PropOption[]> => {
    if (!input.trim() || input.length < 2) return [];

    // Cancelar búsqueda anterior
    if (abortController) abortController.abort();
    abortController = new AbortController();

    try {
      setAsyncLoading(true);
      
      // 1) Si es solo dígitos → búsqueda por ID
      if (/^\d+$/.test(input)) {
        const p = await propietarioService.fetchById(input);
        return p ? [{
          id: p.id,
          label: `${p.nombre} ${p.apellidos} – ${p.telefono}`,
          value: p.id,
        }] : [];
      }
      
      // 2) Si es texto → búsqueda normal
      const lista = await propietarioService.search(input);
      return lista.map((p) => ({
        id: p.id,
        label: `${p.nombre} ${p.apellidos} – ${p.telefono}`,
        value: p.id,
      }));
    } catch (error) {
      if ((error as any).name === 'CanceledError') return [];
      console.error('Error en loadPropietarioOptions:', error);
      return [];
    } finally {
      setAsyncLoading(false);
    }
  };

  /* ───────── Manejo de input del autocomplete ───────── */
  const handleAsyncInput = async (value: string) => {
    setAsyncInput(value);
    if (value.trim().length >= 2) {
      const options = await loadPropietarioOptions(value);
      setAsyncOptions(options);
    } else {
      setAsyncOptions([]);
    }
  };

  /* ───────── Opciones combinadas (nuevo + dinámicas) ───────── */
  const opcionesCombinadas: OptionType[] = React.useMemo(() => {
    return [registroNuevo, ...asyncOptions];
  }, [asyncOptions]);

  /* ───────── Precargar propietario seleccionado para edición ───────── */
  useEffect(() => {
    if (isEdit && initialValues?.propietario && open) {
      const precargarPropietario = async () => {
        try {
          const p = await propietarioService.fetchById(initialValues.propietario);
          if (p) {
            const option: PropOption = {
              id: p.id,
              label: `${p.nombre} ${p.apellidos} – ${p.telefono}`,
              value: p.id,
            };
            setAsyncOptions([option]);
          }
        } catch (error) {
          console.error('Error precargando propietario:', error);
        }
      };
      precargarPropietario();
    }
  }, [isEdit, initialValues?.propietario, open]);

  /* ───────── Precargar propietario recién creado ───────── */
  useEffect(() => {
    if (defaultPropietarioId && open && !isEdit) {
      const precargarNuevoPropietario = async () => {
        try {
          const p = await propietarioService.fetchById(defaultPropietarioId);
          if (p) {
            const option: PropOption = {
              id: p.id,
              label: `${p.nombre} ${p.apellidos} – ${p.telefono}`,
              value: p.id,
            };
            setAsyncOptions([option]);
          }
        } catch (error) {
          console.error('Error precargando nuevo propietario:', error);
        }
      };
      precargarNuevoPropietario();
    }
  }, [defaultPropietarioId, open, isEdit]);

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
      {({ values, errors, handleChange, setFieldValue, isSubmitting }) => (
        <Form>
          <DialogContent dividers className="space-y-4">
            <TextField fullWidth label="Nombre" name="nombre"
              value={values.nombre} onChange={handleChange}
              error={!!errors.nombre} helperText={errors.nombre || ''} />

            <TextField fullWidth label="Ubicación" name="ubicacion"
              value={values.ubicacion} onChange={handleChange}
              error={!!errors.ubicacion} helperText={errors.ubicacion || ''} />

            <TextField fullWidth label="Variedades" name="variedades"
              value={values.variedades} onChange={handleChange}
              error={!!errors.variedades} helperText={errors.variedades || ''} />

            <TextField fullWidth label="Hectáreas" name="hectareas" type="number"
              value={values.hectareas} onChange={handleChange}
              error={!!errors.hectareas} helperText={errors.hectareas || ''} />

            <TextField fullWidth label="Monto Renta" name="monto_renta" type="number"
              value={values.monto_renta || ''} onChange={handleChange}
              error={!!errors.monto_renta} helperText={errors.monto_renta || ''} />

            <Autocomplete
              options={opcionesCombinadas}
              loading={asyncLoading}
              getOptionLabel={(option: OptionType) => option.label}
              isOptionEqualToValue={(option: OptionType, value: OptionType) => 
                option.value === value.value
              }
              filterOptions={(options) => options} // Sin filtrado local, se hace en el servidor
              openOnFocus={false}
              value={
                values.propietario
                  ? opcionesCombinadas.find(
                      (option) => option.value === values.propietario
                    ) || null
                  : null
              }
              onInputChange={(_, value, reason) => {
                if (reason === 'input') {
                  handleAsyncInput(value);
                }
              }}
              onChange={(_, selectedOption) => {
                if (selectedOption?.value === 'new') {
                  onRegisterNewPropietario();
                  setFieldValue('propietario', 0);
                } else if (selectedOption && typeof selectedOption.value === 'number') {
                  setFieldValue('propietario', selectedOption.value);
                } else {
                  setFieldValue('propietario', 0);
                }
              }}
              noOptionsText={
                asyncLoading
                  ? 'Buscando…'
                  : asyncInput.length < 2
                  ? 'Empieza a escribir para buscar...'
                  : 'No se encontraron propietarios'
              }
              loadingText="Buscando propietarios…"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Propietario"
                  placeholder="Buscar por nombre, apellido o teléfono..."
                  error={!!errors.propietario}
                  helperText={errors.propietario || ''}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {asyncLoading && <CircularProgress color="inherit" size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </DialogContent>

          <DialogActions className="px-6 py-4">
            <Button variant="outlined" onClick={onClose}>Cancelar</Button>
            <PermissionButton
              perm={initialValues ? 'change_huerta' : 'add_huerta'}
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
  );
};

export default HuertaRentadaFormModal;
