import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DialogContent, DialogActions, Button, TextField, CircularProgress } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';

import { HuertaCreateData } from '../../types/huertaTypes';
import { Propietario } from '../../types/propietarioTypes';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { propietarioService } from '../../services/propietarioService';

const yupSchema = Yup.object({
  nombre: Yup.string().required('Nombre requerido'),
  ubicacion: Yup.string().required('Ubicación requerida'),
  variedades: Yup.string().required('Variedades requeridas'),
  hectareas: Yup.number().positive('Debe ser mayor que 0').required('Requerido'),
  propietario: Yup.number().min(1, 'Selecciona un propietario').required('Requerido'),
});

type NewOption  = { id: 'new'; label: string; value: 'new' };
type PropOption = { id: number; label: string; value: number };
type OptionType = NewOption | PropOption;

interface Props {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  onSubmit: (vals: HuertaCreateData) => Promise<void>;
  propietarios: Propietario[];
  onRegisterNewPropietario: () => void;
  isEdit?: boolean;
  initialValues?: HuertaCreateData;
  defaultPropietarioId?: number;
}

const HuertaFormModal: React.FC<Props> = ({
  open, onClose, onSubmit, onRegisterNewPropietario,
  isEdit = false, initialValues, defaultPropietarioId,
}) => {
  const formikRef = useRef<FormikProps<HuertaCreateData>>(null);

  const defaults: HuertaCreateData = {
    nombre: '', ubicacion: '', variedades: '',
    historial: '', hectareas: 0, propietario: 0,
  };

  useEffect(() => {
    if (open && !isEdit && defaultPropietarioId && formikRef.current) {
      formikRef.current.setFieldValue('propietario', defaultPropietarioId, false);
    }
  }, [defaultPropietarioId, open, isEdit]);

  useEffect(() => {
    if (!open && formikRef.current) formikRef.current.resetForm();
  }, [open]);

  const submit = async (vals: HuertaCreateData, actions: any) => {
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
        if (field !== 'non_field_errors') fErrors[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
      });

      actions.setErrors(fErrors);
      handleBackendNotification(backend);
    } finally {
      actions.setSubmitting(false);
    }
  };

  // Autocomplete asíncrono robusto
  const [asyncOptions, setAsyncOptions] = useState<PropOption[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncInput, setAsyncInput]     = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const registroNuevo: NewOption = useMemo(() => ({
    id: 'new', label: 'Registrar nuevo propietario', value: 'new',
  }), []);

  const loadPropietarioOptions = async (input: string): Promise<PropOption[]> => {
    if (!input.trim() || input.length < 2) return [];
    // cancelar búsqueda anterior
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      setAsyncLoading(true);

      if (/^\d+$/.test(input)) {
        const p = await propietarioService.fetchById(input, { signal: abortRef.current.signal });
        return p ? [{ id: p.id, label: `${p.nombre} ${p.apellidos} – ${p.telefono}`, value: p.id }] : [];
      }

      const lista = await propietarioService.search(input, { signal: abortRef.current.signal });
      return lista.map((p) => ({ id: p.id, label: `${p.nombre} ${p.apellidos} – ${p.telefono}`, value: p.id }));
    } catch (error: any) {
      if (error?.name === 'CanceledError') return [];
      return [];
    } finally {
      setAsyncLoading(false);
    }
  };

  const handleAsyncInput = async (value: string) => {
    setAsyncInput(value);
    if (value.trim().length >= 2) {
      const options = await loadPropietarioOptions(value);
      setAsyncOptions(options);
    } else {
      setAsyncOptions([]);
    }
  };

  const opcionesCombinadas: OptionType[] = useMemo(
    () => [registroNuevo, ...asyncOptions],
    [registroNuevo, asyncOptions]
  );

  // Precarga al editar
  useEffect(() => {
    const precargar = async () => {
      if (isEdit && initialValues?.propietario && open) {
        try {
          const p = await propietarioService.fetchById(initialValues.propietario);
          if (p) {
            setAsyncOptions([{ id: p.id, label: `${p.nombre} ${p.apellidos} – ${p.telefono}`, value: p.id }]);
          }
        } catch {}
      }
    };
    precargar();
  }, [isEdit, initialValues?.propietario, open]);

  // Precarga para propietario recién creado
  useEffect(() => {
    const precargarNuevo = async () => {
      if (defaultPropietarioId && open && !isEdit) {
        try {
          const p = await propietarioService.fetchById(defaultPropietarioId);
          if (p) {
            setAsyncOptions([{ id: p.id, label: `${p.nombre} ${p.apellidos} – ${p.telefono}`, value: p.id }]);
          }
        } catch {}
      }
    };
    precargarNuevo();
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
            <TextField fullWidth label="Variedades (ej. Kent, Ataulfo)" name="variedades"
              value={values.variedades} onChange={handleChange}
              error={!!errors.variedades} helperText={errors.variedades || ''} />
            <TextField fullWidth label="Hectáreas" name="hectareas" type="number"
              value={values.hectareas} onChange={handleChange}
              error={!!errors.hectareas} helperText={errors.hectareas || ''} />

            <Autocomplete
              options={opcionesCombinadas}
              loading={asyncLoading}
              getOptionLabel={(option: OptionType) => option.label}
              isOptionEqualToValue={(option: OptionType, value: OptionType) => option.value === value.value}
              // sin filtrado local; servidor manda
              filterOptions={(options, state) => state.inputValue.trim() === '' ? [registroNuevo] : options}
              openOnFocus
              value={values.propietario
                ? opcionesCombinadas.find(o => o.value === values.propietario) || null
                : null}
              onInputChange={(_, value, reason) => { if (reason === 'input') handleAsyncInput(value); }}
              onChange={(_, selected) => {
                if (selected?.value === 'new') {
                  onRegisterNewPropietario();
                  setFieldValue('propietario', 0);
                } else if (selected && typeof selected.value === 'number') {
                  setFieldValue('propietario', selected.value);
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
              perm={isEdit ? 'change_huerta' : 'add_huerta'}
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

export default HuertaFormModal;
