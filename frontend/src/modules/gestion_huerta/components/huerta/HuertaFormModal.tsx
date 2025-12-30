// src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Formik, Form, FormikProps, FormikHelpers } from 'formik';
import * as Yup from 'yup';

import { HuertaCreateData } from '../../types/huertaTypes';
import { Propietario } from '../../types/propietarioTypes';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { propietarioService } from '../../services/propietarioService';
import { applyBackendErrorsToFormik } from '../../../../global/validation/backendFieldErrors';
import { focusFirstError } from '../../../../global/validation/focusFirstError';
import FormAlertBanner from '../../../../components/common/form/FormAlertBanner';
import FormikAutocomplete from '../../../../components/common/form/FormikAutocomplete';
import FormikNumberField from '../../../../components/common/form/FormikNumberField';
import FormikTextField from '../../../../components/common/form/FormikTextField';

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
  const [formErrors, setFormErrors] = useState<string[]>([]);

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

  const submit = async (vals: HuertaCreateData, actions: FormikHelpers<HuertaCreateData>) => {
    try {
      await onSubmit(vals);
      setFormErrors([]);
      onClose();
    } catch (err: unknown) {
      const normalized = applyBackendErrorsToFormik(err, actions);
      setFormErrors(normalized.formErrors);
      if (!Object.keys(normalized.fieldErrors).length && !normalized.formErrors.length) {
        const error = err as { response?: { data: any }; data?: any };
        const backend = error?.response?.data || error?.data || {};
        handleBackendNotification(backend);
      }
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
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'CanceledError') return [];
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
        } catch {
          /* empty */
        }
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
        } catch {
          /* empty */
        }
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
      validateOnBlur
      validateOnMount={false}
      enableReinitialize
      onSubmit={submit}
    >
      {({ values, handleChange, handleBlur, setFieldValue, setFieldTouched, isSubmitting, setTouched, validateForm }) => (
        <Form
          onSubmit={async (event) => {
            event.preventDefault();
            const validationErrors = await validateForm();
            if (Object.keys(validationErrors).length) {
              const touchedFields = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                (acc, key) => ({ ...acc, [key]: true }),
                {}
              );
              setTouched(touchedFields, false);
              focusFirstError(validationErrors, event.currentTarget);
              return;
            }
            formikRef.current?.handleSubmit(event);
          }}
        >
          <DialogContent dividers className="space-y-4">
            <FormAlertBanner
              open={formErrors.length > 0}
              severity="error"
              title="Revisa la información"
              messages={formErrors}
            />
            <FormikTextField
              fullWidth
              label="Nombre"
              name="nombre"
              value={values.nombre}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <FormikTextField
              fullWidth
              label="Ubicación"
              name="ubicacion"
              value={values.ubicacion}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <FormikTextField
              fullWidth
              label="Variedades (ej. Kent, Ataulfo)"
              name="variedades"
              value={values.variedades}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <FormikNumberField
              fullWidth
              label="Hectáreas"
              name="hectareas"
              type="number"
              value={values.hectareas}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <FormikAutocomplete
              name="propietario"
              options={opcionesCombinadas}
              loading={asyncLoading}
              getOptionLabel={(option: OptionType) => option.label}
              isOptionEqualToValue={(option: OptionType, value: OptionType) => option.value === value.value}
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
                setFieldTouched('propietario', true, false);
              }}
              noOptionsText={
                asyncLoading
                  ? 'Buscando…'
                  : asyncInput.length < 2
                  ? 'Empieza a escribir para buscar...'
                  : 'No se encontraron propietarios'
              }
              loadingText="Buscando propietarios…"
              label="Propietario"
              textFieldProps={{
                placeholder: 'Buscar por nombre, apellido o teléfono...',
                onBlur: handleBlur,
                InputProps: {
                  endAdornment: asyncLoading ? <CircularProgress color="inherit" size={20} /> : null,
                },
              }}
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
