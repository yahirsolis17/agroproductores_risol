import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, Box
} from '@mui/material';
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';

import type { InversionCreate, InversionUpdate } from '../../types/inversionTypes';
import type { CategoriaInversion } from '../../types/categoriaInversionTypes';
import CategoriaAutocomplete from './CategoriaAutocomplete';
import CategoriaFormModal from './CategoriaFormModal';

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  initialValues?: Omit<InversionCreate, 'cosecha_id' | 'huerta_id'> | InversionUpdate;
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
  categoria_id: Yup.number().min(1, 'Selecciona una categoría').required('Requerido'),
});

const InversionFormModal: React.FC<Props> = (p) => {
  if (!p.open) return null; // evita render cuando está cerrado

  const formikRef = useRef<FormikProps<any>>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catToEdit, setCatToEdit] = useState<CategoriaInversion | null>(null);

  // Valores por defecto — categoria_id = 0 como placeholder
  const defaults: Omit<InversionCreate, 'cosecha_id' | 'huerta_id'> = {
    nombre: '',
    fecha: '',
    descripcion: '',
    gastos_insumos: 0,
    gastos_mano_obra: 0,
    categoria_id: 0,
  };

  // Si viene initialValues (edición) y no trae categoría, normalizamos a 0
  const initValues =
    p.initialValues
      ? { ...p.initialValues, categoria_id: (p.initialValues as any).categoria_id ?? 0 }
      : defaults;

  return (
    <>
      <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="sm">
        <DialogTitle className="text-primary-dark font-bold">
          {p.isEdit ? 'Editar inversión' : 'Nueva inversión'}
        </DialogTitle>

        <Formik
          innerRef={formikRef}
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

                  <Box>
                    <CategoriaAutocomplete
                      value={values.categoria_id || null}
                      onChange={(id) => setFieldValue('categoria_id', id || 0)}
                      categorias={p.categorias}
                      loading={p.loadingCategorias}
                      onCreateCategoria={() => {
                        setCatToEdit(null);
                        setCatModalOpen(true);
                      }}
                      onUpdateCategoria={(cat) => {
                        setCatToEdit(cat);
                        setCatModalOpen(true);
                      }}
                      onArchiveCategoria={async (cat) => {
                        await p.archiveCategoria(cat.id);
                        await p.onRefetchCategorias();
                      }}
                      onRestoreCategoria={async (cat) => {
                        await p.restoreCategoria(cat.id);
                        await p.onRefetchCategorias();
                      }}
                      onDeleteCategoria={async (cat) => {
                        await p.removeCategoria(cat.id);
                        await p.onRefetchCategorias();
                      }}
                    />
                    {errors.categoria_id && (
                      <p className="text-red-600 text-sm">{errors.categoria_id as string}</p>
                    )}
                  </Box>
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

      {catModalOpen && (
        <CategoriaFormModal
          open={catModalOpen}
          onClose={() => setCatModalOpen(false)}
          isEdit={!!catToEdit}
          initialName={catToEdit?.nombre}
          onSubmit={async (nombre) => {
            if (catToEdit) {
              await p.updateCategoria(catToEdit.id, { nombre });
              await p.onRefetchCategorias();
            } else {
              const nueva = await p.createCategoria({ nombre });
              await p.onRefetchCategorias();
              formikRef.current?.setFieldValue('categoria_id', nueva.id);
            }
          }}
        />
      )}
    </>
  );
};

export default InversionFormModal;
