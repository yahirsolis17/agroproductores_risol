// src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, ListSubheader, Box
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Formik, Form, FormikHelpers, FormikProps } from 'formik';
import * as Yup from 'yup';

import {
  InversionCreateData,
  InversionUpdateData,
  InversionHuerta,
} from '../../types/inversionTypes';

import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import CategoriaInversionFormModal from './CategoriaFormModal';

/* ───────────────── helpers ───────────────── */

/** YYYY-MM-DD en hora local (evita desfase UTC de toISOString) */
function formatLocalDateYYYYMMDD(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** parsea una cadena con comas/puntos a número (mx) */
function parseMXNumber(input: string): number {
  if (!input) return 0;
  // quitar espacios y comas de miles
  const cleaned = input.replace(/\s+/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** formatea número a es-MX con 2 decimales; si cadena vacía -> '' */
function formatMX(input: string | number): string {
  if (input === '' || input === null || input === undefined) return '';
  const n = typeof input === 'number' ? input : parseMXNumber(input);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** normaliza helperText: solo strings */
function msg(e: any): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (Array.isArray(e)) return e.map(x => (typeof x === 'string' ? x : '')).filter(Boolean)[0] || '';
  return '';
}

/* ─────────────── Tipos internos del form (para manejar strings) ─────────────── */
type FormValues = {
  fecha: string;           // YYYY-MM-DD
  categoria: number;       // id
  gastos_insumos: string;  // string con comas (UI)
  gastos_mano_obra: string;// string con comas (UI)
  descripcion: string;
};

/* ─────────────── Validation ─────────────── */
const schema = Yup.object({
  fecha: Yup.string().required('Requerido'),
  categoria: Yup.number().min(1, 'Selecciona una categoría').required('Requerido'),
  // campos pueden estar vacíos, pero el total debe ser > 0 (regla abajo)
  gastos_insumos: Yup.string(),
  gastos_mano_obra: Yup.string(),
  descripcion: Yup.string().max(250, 'Máximo 250 caracteres'),
}).test('total-mayor-cero', 'Los gastos totales deben ser mayores a 0.', (values?: any) => {
  if (!values) return false;
  const gi = parseMXNumber(values.gastos_insumos || '');
  const gm = parseMXNumber(values.gastos_mano_obra || '');
  return gi + gm > 0;
});

/* ─────────────── Props ─────────────── */
interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (vals: InversionCreateData | InversionUpdateData) => Promise<void>;
  initialValues?: InversionHuerta;
}

/* ─────────────────────────────────────────────────────────── */
const InversionFormModal: React.FC<Props> = ({ open, onClose, onSubmit, initialValues }) => {
  const formikRef = useRef<FormikProps<FormValues>>(null);
  const [openCatModal, setOpenCatModal] = useState(false);

  // categorias
  const {
    categorias,
    loading: loadingCats,
    refetch: refetchCategorias,
  } = useCategoriasInversion();

  // Cargar categorías al abrir
  useEffect(() => { if (open) refetchCategorias(); }, [open]);

  // Opciones ordenadas alfabéticamente
  const sortedCats = useMemo(
    () => [...(categorias ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [categorias]
  );

  // option especial para "registrar nueva"
  const newCatOption = { id: -1, nombre: 'Registrar nueva categoría' } as CategoriaInversion;

  // initial form values (campos numéricos en blanco si no hay valor)
  const initialFormValues: FormValues = initialValues ? {
    fecha: initialValues.fecha,
    categoria: initialValues.categoria,
    gastos_insumos: initialValues.gastos_insumos ? formatMX(initialValues.gastos_insumos) : '',
    gastos_mano_obra: initialValues.gastos_mano_obra ? formatMX(initialValues.gastos_mano_obra) : '',
    descripcion: initialValues.descripcion ?? '',
  } : {
    fecha: formatLocalDateYYYYMMDD(new Date()),
    categoria: 0,
    gastos_insumos: '',
    gastos_mano_obra: '',
    descripcion: '',
  };

  // al crear categoría desde el modal hijo
  const handleNewCatSuccess = (c: CategoriaInversion) => {
    setOpenCatModal(false);
    // refrescamos y seteamos valor seleccionado
    refetchCategorias().then(() => {
      formikRef.current?.setFieldValue('categoria', c.id);
    });
  };

  // submit
  const handleSubmit = async (vals: FormValues, helpers: FormikHelpers<FormValues>) => {
    const payload: InversionCreateData | InversionUpdateData = {
      fecha: vals.fecha,
      categoria: Number(vals.categoria),
      gastos_insumos: parseMXNumber(vals.gastos_insumos),
      gastos_mano_obra: parseMXNumber(vals.gastos_mano_obra),
      descripcion: vals.descripcion || '',
      // ❌ NO enviar "cosecha" aquí. Los *_id los inyecta el service via contexto.
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      // Mapear errores backend → fields
      const backend = err?.data || err?.response?.data || {};
      const beErrors = backend.errors || backend.data?.errors || {};
      const fieldErrors: Record<string, string> = {};
      Object.entries(beErrors).forEach(([f, msgVal]: any) => {
        const text = Array.isArray(msgVal) ? String(msgVal[0]) : String(msgVal);
        fieldErrors[f] = text;
      });
      helpers.setErrors(fieldErrors);
      handleBackendNotification(backend);
    } finally {
      helpers.setSubmitting(false);
    }
  };

  // handlers numéricos con formateo en caliente
  const handleMoneyChange = (field: 'gastos_insumos' | 'gastos_mano_obra', raw: string, setFieldValue: (f: string, v: any) => void) => {
    // permitir borrar todo
    if (raw.trim() === '') {
      setFieldValue(field, '');
      return;
    }
    // permitir solo dígitos y punto
    const cleaned = raw.replace(/[^\d.]/g, '');
    // si hay más de un punto, dejar el primero
    const parts = cleaned.split('.');
    const safe = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;

    // formateo con comas (sin perder el decimal si el usuario todavía lo tipea)
    const num = Number(safe);
    if (!Number.isFinite(num)) {
      setFieldValue(field, '');
      return;
    }
    // respetar dos decimales como max, pero no obligar a mostrar ".00" mientras escribe
    const [intPart, decPart] = safe.split('.');
    const formattedInt = Number(intPart || '0').toLocaleString('es-MX', { maximumFractionDigits: 0 });
    const display = decPart !== undefined ? `${formattedInt}.${decPart.slice(0, 2)}` : formattedInt;
    setFieldValue(field, display);
  };

  return (
    <>
      {/* Modal de nueva categoría */}
      <CategoriaInversionFormModal
        open={openCatModal}
        onClose={() => setOpenCatModal(false)}
        onSuccess={handleNewCatSuccess}
      />

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{initialValues ? 'Editar inversión' : 'Nueva inversión'}</DialogTitle>

        <Formik<FormValues>
          innerRef={formikRef}
          initialValues={initialFormValues}
          enableReinitialize
          validationSchema={schema}
          validateOnBlur={false}
          validateOnChange={false}
          onSubmit={handleSubmit}
        >
          {({ values, errors, isSubmitting, handleChange, setFieldValue }) => (
            <Form>
              <DialogContent dividers className="space-y-4">
                {/* Fecha */}
                <TextField
                  fullWidth
                  type="date"
                  name="fecha"
                  label="Fecha"
                  InputLabelProps={{ shrink: true }}
                  value={values.fecha}
                  onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
                  error={Boolean(msg(errors.fecha))}
                  helperText={msg(errors.fecha)}
                />

                {/* Categoría (autocomplete) */}
                <Autocomplete
                  options={[newCatOption, ...sortedCats]}
                  getOptionLabel={(opt) => {
                    const anyOpt = opt as any;
                    return anyOpt.id === -1 ? 'Registrar nueva categoría' : String(anyOpt.nombre || '');
                  }}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  loading={loadingCats}
                  value={
                    values.categoria
                      ? (sortedCats.find(c => c.id === values.categoria) as any) || null
                      : null
                  }
                  onChange={(_, sel) => {
                    const anySel = sel as any;
                    if (!anySel) {
                      setFieldValue('categoria', 0);
                      return;
                    }
                    if (anySel.id === -1) {
                      // abrir modal hijo para crear
                      setOpenCatModal(true);
                      return;
                    }
                    setFieldValue('categoria', anySel.id);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Categoría"
                      error={Boolean(msg(errors.categoria))}
                      helperText={msg(errors.categoria)}
                    />
                  )}
                  // Evitar "selección de texto" molesta y flickers
                  ListboxProps={{
                    sx: { userSelect: 'none' },
                    onMouseDown: (e) => e.preventDefault(),
                  }}
                  renderOption={(props, option) => {
                    const anyOpt = option as any;
                    if (anyOpt.id === -1) {
                      return (
                        <li {...props} onMouseDown={(e) => e.preventDefault()}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            ➕ Registrar nueva categoría
                          </Box>
                        </li>
                      );
                    }
                    return (
                      <li {...props} onMouseDown={(e) => e.preventDefault()}>
                        {anyOpt.nombre}
                      </li>
                    );
                  }}
                  // Encabezado opcional
                  renderGroup={(params) => (
                    <li key={params.key}>
                      <ListSubheader component="div" sx={{ userSelect: 'none' }}>
                        Categorías
                      </ListSubheader>
                      <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
                    </li>
                  )}
                />

                {/* Gastos insumos */}
                <TextField
                  fullWidth
                  label="Gastos en insumos"
                  name="gastos_insumos"
                  value={values.gastos_insumos}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleMoneyChange('gastos_insumos', e.target.value, setFieldValue)
                  }
                  inputMode="decimal"
                  placeholder="Ej. 12,500.00"
                  error={Boolean(msg(errors.gastos_insumos))}
                  helperText={msg(errors.gastos_insumos)}
                />

                {/* Gastos mano de obra */}
                <TextField
                  fullWidth
                  label="Gastos mano de obra"
                  name="gastos_mano_obra"
                  value={values.gastos_mano_obra}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleMoneyChange('gastos_mano_obra', e.target.value, setFieldValue)
                  }
                  inputMode="decimal"
                  placeholder="Ej. 8,000.00"
                  error={Boolean(msg(errors.gastos_mano_obra))}
                  helperText={msg(errors.gastos_mano_obra)}
                />

                {/* Descripción */}
                <TextField
                  fullWidth
                  label="Descripción (opcional)"
                  name="descripcion"
                  multiline
                  minRows={2}
                  value={values.descripcion}
                  onChange={handleChange as React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>}
                  error={Boolean(msg(errors.descripcion))}
                  helperText={msg(errors.descripcion)}
                />
              </DialogContent>

              <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <PermissionButton
                  perm={initialValues ? 'change_inversion' : 'add_inversion'}
                  type="button"
                  variant="contained"
                  disabled={isSubmitting}
                  onClick={() => formikRef.current?.submitForm()}
                >
                  {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
                </PermissionButton>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default InversionFormModal;
