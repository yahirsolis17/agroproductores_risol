/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';

import {
  InversionCreateData,
  InversionUpdateData,
  InversionHuerta,
} from '../../types/inversionTypes';
import { categoriaInversionService } from '../../services/categoriaInversionService';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { PermissionButton } from '../../../../components/common/PermissionButton';

/* ───────────────── Validación con Yup ───────────────── */
const schema = Yup.object({
  fecha:            Yup.date().required('Requerido'),
  categoria:        Yup.number().min(1, 'Selecciona una categoría').required('Requerido'),
  gastos_insumos:   Yup.number().min(0, 'Debe ser ≥ 0').required('Requerido'),
  gastos_mano_obra: Yup.number().min(0, 'Debe ser ≥ 0').required('Requerido'),
  descripcion:      Yup.string().max(250, 'Máx 250 caracteres').optional(),
});

/* ───────────────── Props ───────────────── */
interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (vals: InversionCreateData | InversionUpdateData) => Promise<void>;
  /** Sólo para edición: pasamos todo el objeto tal cual viene del backend */
  initialValues?: InversionHuerta;
}

/* ───────────────── Componente ───────────────── */
const InversionFormModal: React.FC<Props> = ({
  open, onClose, onSubmit, initialValues,
}) => {
  const formikRef = useRef<FormikProps<InversionCreateData | InversionUpdateData>>(null);

  /* Valores por defecto para creación */
  const defaults: InversionCreateData = {
    fecha:            new Date().toISOString().slice(0, 10),
    categoria:        0,
    gastos_insumos:   0,
    gastos_mano_obra: 0,
    descripcion:      '',
    cosecha:          0, // este campo se inyecta desde la página antes de llamar a onSubmit
  };

  /* ─────────── Autocomplete de categorías ─────────── */
  type NewOpt = { id: 'new'; value: 'new'; label: 'Registrar nueva' };
  type CatOpt = { id: number; value: number; label: string };
  type OptType = NewOpt | CatOpt;

  const newOption: NewOpt = { id: 'new', value: 'new', label: 'Registrar nueva' };
  const [catOptions, setCatOptions] = useState<CatOpt[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);

  const combinedOptions: OptType[] = useMemo(
    () => [newOption, ...catOptions],
    [catOptions]
  );

  let abortCtl: AbortController | null = null;
  const fetchCats = async (q: string) => {
    if (!q.trim()) return;
    abortCtl?.abort();
    abortCtl = new AbortController();
    setAsyncLoading(true);
    try {
      const cats = await categoriaInversionService.search(q, { signal: abortCtl.signal });
      setCatOptions(cats.map(c => ({ id: c.id, value: c.id, label: c.nombre })));
    } catch {
      /* ignore */
    } finally {
      setAsyncLoading(false);
    }
  };

  /* Precarga la categoría al editar */
  useEffect(() => {
    if (!initialValues?.categoria || !open) return;
    (async () => {
      try {
        const cats = await categoriaInversionService.search(String(initialValues.categoria));
        const c = cats.find(c => c.id === initialValues.categoria);
        if (c) setCatOptions([{ id: c.id, value: c.id, label: c.nombre }]);
      } catch {
        /* ignore */
      }
    })();
  }, [initialValues, open]);

  /* ─────────── Submit handler ─────────── */
  const submit = async (
    vals: InversionCreateData | InversionUpdateData,
    actions: any
  ) => {
    try {
      await onSubmit(vals);
      onClose();
    } catch (err: any) {
      const backend = err?.data || err?.response?.data || {};
      const beErrors = backend.errors || backend.data?.errors || {};
      const fErrors: Record<string, string> = {};
      Object.entries(beErrors).forEach(([f, msgs]: any) => {
        fErrors[f] = Array.isArray(msgs) ? msgs[0] : String(msgs);
      });
      actions.setErrors(fErrors);
      handleBackendNotification(backend);
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="text-primary-dark font-bold">
        {initialValues ? 'Editar inversión' : 'Nueva inversión'}
      </DialogTitle>

      <Formik
        innerRef={formikRef}
        initialValues={
          initialValues
            ? {
                fecha:            initialValues.fecha,
                categoria:        initialValues.categoria,
                gastos_insumos:   initialValues.gastos_insumos,
                gastos_mano_obra: initialValues.gastos_mano_obra,
                descripcion:      initialValues.descripcion ?? '',
                cosecha:          initialValues.cosecha,
              }
            : defaults
        }
        enableReinitialize
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur={false}
        onSubmit={submit}
      >
        {({ values, errors, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers className="space-y-4">
              <TextField
                fullWidth
                label="Fecha"
                name="fecha"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={values.fecha}
                onChange={handleChange}
                error={!!errors.fecha}
                helperText={errors.fecha}
              />

              <Autocomplete
                options={combinedOptions}
                loading={asyncLoading}
                getOptionLabel={(o: OptType) => o.label}
                isOptionEqualToValue={(o, v) => o.value === v.value}
                filterOptions={opts => opts}
                value={
                  combinedOptions.find(o => o.value === values.categoria) || null
                }
                onInputChange={(_, val, reason) => {
                  if (reason === 'input' && val.length >= 2) fetchCats(val);
                }}
                onChange={(_, sel) => {
                  if (sel?.value === 'new') {
                    handleBackendNotification({
                      key: 'info',
                      type: 'info',
                      message: 'Implementa modal “Nueva categoría” aquí 👈',
                    });
                    setFieldValue('categoria', 0);
                  } else if (sel && typeof sel.value === 'number') {
                    setFieldValue('categoria', sel.value);
                  }
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Categoría"
                    error={!!errors.categoria}
                    helperText={errors.categoria}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {asyncLoading && <CircularProgress size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <TextField
                fullWidth
                label="Gastos en insumos"
                name="gastos_insumos"
                type="number"
                value={values.gastos_insumos}
                onChange={handleChange}
                error={!!errors.gastos_insumos}
                helperText={errors.gastos_insumos}
              />

              <TextField
                fullWidth
                label="Gastos mano de obra"
                name="gastos_mano_obra"
                type="number"
                value={values.gastos_mano_obra}
                onChange={handleChange}
                error={!!errors.gastos_mano_obra}
                helperText={errors.gastos_mano_obra}
              />

              <TextField
                fullWidth
                label="Descripción (opcional)"
                name="descripcion"
                multiline
                minRows={2}
                value={values.descripcion}
                onChange={handleChange}
                error={!!errors.descripcion}
                helperText={errors.descripcion}
              />
            </DialogContent>

            <DialogActions className="px-6 py-4">
              <Button variant="outlined" onClick={onClose}>Cancelar</Button>
              <PermissionButton
                perm={initialValues ? 'change_inversion' : 'add_inversion'}
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

export default InversionFormModal;
