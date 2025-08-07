/* src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Box,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import CategoriaAutocomplete from './CategoriaAutocomplete';
import CategoriaFormModal from './CategoriaFormModal';

import type { InversionCreate, InversionUpdate } from '../../types/inversionTypes';
import type { CategoriaInversion } from '../../types/categoriaInversionTypes';

/* ─────────────────── Yup schema ─────────────────── */
const schema = Yup.object({
  fecha:  Yup.string().required('Requerido'),
  descripcion: Yup.string().nullable(),
  gastos_insumos:  Yup.number().min(0, '>= 0').required('Requerido'),
  gastos_mano_obra: Yup.number().min(0, '>= 0').required('Requerido'),
  categoria_id:     Yup.number().min(1, 'Selecciona una categoría').required('Requerido'),
});

/* ─────────────────── Props ─────────────────── */
type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;

  /* ← contexto del flujo */
  huertaId: number;
  cosechaId: number;
  temporadaId: number;

  initialValues?: Omit<InversionCreate, 'huerta_id' | 'cosecha_id' | 'temporada_id'> | InversionUpdate;
  onSubmit: (p: InversionCreate | InversionUpdate) => Promise<void>;

  /* Categorías */
  categorias: CategoriaInversion[];
  loadingCategorias: boolean;
  createCategoria:  (p: { nombre: string }) => Promise<CategoriaInversion>;
  updateCategoria:  (id: number, p: { nombre: string }) => Promise<any>;
  archiveCategoria: (id: number)                           => Promise<any>;
  restoreCategoria: (id: number)                           => Promise<any>;
  removeCategoria:  (id: number)                           => Promise<any>;
  onRefetchCategorias: () => Promise<any>;
};

/* ─────────────────── Helpers ─────────────────── */
const todayISO = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

/* ─────────────────── Component ─────────────────── */
const InversionFormModal: React.FC<Props> = (p) => {
  const [catModal, setCatModal] = useState<{ open: boolean; edit?: CategoriaInversion | null }>({
    open: false,
  });

  if (!p.open) return null; // evita render innecesario

  /* ---------- valores por defecto ---------- */
  const defaults: Omit<InversionCreate, 'huerta_id' | 'cosecha_id' | 'temporada_id'> = {
    fecha:  todayISO(),
    descripcion: '',
    gastos_insumos:   0,
    gastos_mano_obra: 0,
    categoria_id:     0,
  };

  const initValues =
    p.initialValues
      ? { ...p.initialValues, categoria_id: (p.initialValues as any).categoria_id ?? 0 }
      : defaults;

  return (
    <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="sm">
      <DialogTitle className="text-primary-dark font-bold">
        {p.isEdit ? 'Editar inversión' : 'Nueva inversión'}
      </DialogTitle>

      <Formik
        initialValues={initValues}
        validationSchema={schema}
        enableReinitialize
        validateOnBlur={false}
        validateOnChange={false}
        onSubmit={async (vals, actions) => {
          try {
            /* Normaliza fecha a YYYY-MM-DD */
            const base = {
              ...vals,
              fecha: new Date(vals.fecha as string).toISOString().split('T')[0],
            };

            const payload: InversionCreate | InversionUpdate = p.isEdit
              ? base
              : {
                  ...(base as InversionCreate),
                  huerta_id:  p.huertaId,
                  cosecha_id: p.cosechaId,
                  temporada_id: p.temporadaId,
                };

            await p.onSubmit(payload);
            p.onClose();
          } finally {
            actions.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, handleChange, setFieldValue, isSubmitting }) => (
          <>
            <Form>
              <DialogContent dividers>
                <Box display="grid" gap={2}>
                  <TextField
                    label="Fecha"
                    name="fecha"
                    type="date"
                    fullWidth
                    value={values.fecha}
                    onChange={handleChange}
                    error={!!errors.fecha}
                    helperText={(errors.fecha as string) || ''}
                    InputLabelProps={{ shrink: true }}
                  />

                  <TextField
                    label="Descripción"
                    name="descripcion"
                    fullWidth
                    multiline
                    minRows={2}
                    value={values.descripcion || ''}
                    onChange={handleChange}
                    error={!!errors.descripcion}
                    helperText={(errors.descripcion as string) || ''}
                  />

                  <TextField
                    label="Gastos (insumos)"
                    name="gastos_insumos"
                    type="number"
                    fullWidth
                    value={values.gastos_insumos}
                    onChange={handleChange}
                    error={!!errors.gastos_insumos}
                    helperText={(errors.gastos_insumos as string) || ''}
                  />

                  <TextField
                    label="Gastos (mano de obra)"
                    name="gastos_mano_obra"
                    type="number"
                    fullWidth
                    value={values.gastos_mano_obra}
                    onChange={handleChange}
                    error={!!errors.gastos_mano_obra}
                    helperText={(errors.gastos_mano_obra as string) || ''}
                  />

                  <CategoriaAutocomplete
                    categorias={p.categorias}
                    loading={p.loadingCategorias}
                    hideArchived={!p.isEdit}
                    value={values.categoria_id || null}
                    onChange={(id) => setFieldValue('categoria_id', id ?? 0)}
                    onCreateCategoria={() => setCatModal({ open: true })}
                    onUpdateCategoria={(cat) => setCatModal({ open: true, edit: cat })}
                    onArchiveCategoria={(cat) => p.archiveCategoria(cat.id)}
                    onRestoreCategoria={(cat) => p.restoreCategoria(cat.id)}
                    onDeleteCategoria={(cat) => p.removeCategoria(cat.id)}
                  />
                  {errors.categoria_id && (
                    <Box sx={{ color: 'error.main', fontSize: 12 }}>
                      {typeof errors.categoria_id === 'string' ? errors.categoria_id : ''}
                    </Box>
                  )}
                </Box>
              </DialogContent>

              <DialogActions>
                <Button variant="outlined" onClick={p.onClose}>Cancelar</Button>
                <Button variant="contained" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={22} /> : 'Guardar'}
                </Button>
              </DialogActions>
            </Form>

            {/* ───────── Modal de categoría ───────── */}
            {catModal.open && (
              <CategoriaFormModal
                open
                isEdit={!!catModal.edit}
                initialName={catModal.edit?.nombre}
                onSubmit={async (nombre) => {
                  if (catModal.edit) {
                    await p.updateCategoria(catModal.edit.id, { nombre });
                  } else {
                    const newCat = await p.createCategoria({ nombre });
                    await p.onRefetchCategorias();
                    setFieldValue('categoria_id', newCat.id);
                  }
                  await p.onRefetchCategorias();
                  setCatModal({ open: false, edit: null });
                }}
                onClose={() => setCatModal({ open: false, edit: null })}
              />
            )}
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default InversionFormModal;
