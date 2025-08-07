import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, Box
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import type { InversionCreate, InversionUpdate } from '../../types/inversionTypes';
import type { CategoriaInversion } from '../../types/categoriaInversionTypes';

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  initialValues?: Omit<InversionCreate, 'cosecha' | 'huerta'> | InversionUpdate;
  onSubmit: (payload: InversionCreate | InversionUpdate) => Promise<void>;

  // categorías
  categorias: CategoriaInversion[];
  loadingCategorias: boolean;
  createCategoria: (payload: { nombre: string }) => Promise<any>;
  updateCategoria: (id: number, payload: { nombre: string }) => Promise<any>;
  archiveCategoria: (id: number) => Promise<any>;
  restoreCategoria: (id: number) => Promise<any>;
  removeCategoria: (id: number) => Promise<any>;
  onRefetchCategorias: () => Promise<any>;
};

const schema = Yup.object({
  nombre: Yup.string().required('Requerido'),
  fecha: Yup.string().required('Requerido'),
  descripcion: Yup.string().nullable(),
  gastos_insumos: Yup.number().min(0, '>= 0').required('Requerido'),
  gastos_mano_obra: Yup.number().min(0, '>= 0').required('Requerido'),
  // ← Debe ser número y al menos 1 (0 es placeholder “Seleccione…”)
  categoria: Yup.number().min(1, 'Selecciona una categoría').required('Requerido'),
});

const InversionFormModal: React.FC<Props> = (p) => {
  if (!p.open) return null; // evita render cuando está cerrado

  // Valores por defecto — categoria = 0 como placeholder
  const defaults: Omit<InversionCreate, 'cosecha' | 'huerta'> = {
    nombre: '',
    fecha: '',
    descripcion: '',
    gastos_insumos: 0,
    gastos_mano_obra: 0,
    categoria: 0,
  };

  // Si viene initialValues (edición) y no trae categoría, normalizamos a 0
  const initValues =
    p.initialValues
      ? { ...p.initialValues, categoria: (p.initialValues as any).categoria ?? 0 }
      : defaults;

  return (
    <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="sm">
      <DialogTitle className="text-primary-dark font-bold">
        {p.isEdit ? 'Editar inversión' : 'Nueva inversión'}
      </DialogTitle>

      <Formik
        initialValues={initValues}
        validationSchema={schema}
        validateOnBlur={false}
        validateOnChange={false}
        enableReinitialize
        onSubmit={async (vals, actions) => {
          try {
            await p.onSubmit(vals as any);
            p.onClose();
          } catch (e: any) {
            // mapear errores si aplica
          } finally {
            actions.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Box display="grid" gap={2}>
                <TextField
                  label="Nombre"
                  name="nombre"
                  value={values.nombre}
                  onChange={handleChange}
                  error={!!errors.nombre}
                  helperText={(errors.nombre as string) || ''}
                  fullWidth
                />

                <TextField
                  label="Fecha"
                  name="fecha"
                  type="date"
                  value={values.fecha}
                  onChange={handleChange}
                  error={!!errors.fecha}
                  helperText={(errors.fecha as string) || ''}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Descripción"
                  name="descripcion"
                  value={values.descripcion || ''}
                  onChange={handleChange}
                  error={!!errors.descripcion}
                  helperText={(errors.descripcion as string) || ''}
                  fullWidth
                  multiline
                  minRows={2}
                />

                <TextField
                  label="Gastos (insumos)"
                  name="gastos_insumos"
                  type="number"
                  value={values.gastos_insumos}
                  onChange={handleChange}
                  error={!!errors.gastos_insumos}
                  helperText={(errors.gastos_insumos as string) || ''}
                  fullWidth
                />

                <TextField
                  label="Gastos (mano de obra)"
                  name="gastos_mano_obra"
                  type="number"
                  value={values.gastos_mano_obra}
                  onChange={handleChange}
                  error={!!errors.gastos_mano_obra}
                  helperText={(errors.gastos_mano_obra as string) || ''}
                  fullWidth
                />

                {/* Select de categoría (con opción placeholder deshabilitada) */}
                <TextField
                  label="Categoría"
                  name="categoria"
                  select
                  SelectProps={{ native: true }}
                  value={values.categoria}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setFieldValue('categoria', v);
                  }}
                  error={!!errors.categoria}
                  helperText={(errors.categoria as string) || ''}
                  fullWidth
                >
                  <option value={0} disabled>— Selecciona categoría —</option>
                  {p.categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </TextField>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button variant="outlined" onClick={p.onClose}>Cancelar</Button>
              <Button variant="contained" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default InversionFormModal;
