/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Formik, Form, FormikProps } from 'formik';
import * as Yup from 'yup';
import {
  InversionCreateData, InversionUpdateData, InversionHuerta,
} from '../../types/inversionTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import CategoriaInversionFormModal from './CategoriaFormModal';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';

/* ——— Prop types ——— */
interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (vals: InversionCreateData | InversionUpdateData) => Promise<void>;
  initialValues?: InversionHuerta;
}

/* ——— valores por defecto ——— */
const defaults: InversionCreateData = {
  fecha: new Date().toISOString().slice(0, 10),
  categoria: 0, gastos_insumos: 0, gastos_mano_obra: 0,
  descripcion: '', cosecha: 0,
};

/* ——— validación Yup ——— */
const schema = Yup.object({
  fecha: Yup.date().required('Requerido'),
  categoria: Yup.number().min(1,'Selecciona una categoría').required('Requerido'),
  gastos_insumos: Yup.number().min(0).required('Requerido'),
  gastos_mano_obra: Yup.number().min(0).required('Requerido'),
  descripcion: Yup.string().max(250),
});

/* ─────────────────────────────────────────────────────────── */
const InversionFormModal: React.FC<Props> = ({ open, onClose, onSubmit, initialValues }) => {
  const formikRef = useRef<FormikProps<InversionCreateData | InversionUpdateData>>(null);
  const [openCatModal,setOpenCatModal] = useState(false);

  /* --- categorías globales --- */
  const {
    categorias,
    loading: loadingCats,
    refetch,
  } = useCategoriasInversion();

  /* recarga al abrir */
  useEffect(()=>{ if (open) refetch(); },[open]);

  /* opciones Autocomplete */
  type CatOpt = { id:number; value:number; label:string };
  type NewOpt = { id:'new'; value:'new'; label:string };
  type Opt    = CatOpt | NewOpt;

  const newOpt:NewOpt = { id:'new', value:'new', label:'Registrar nueva categoría' };
  const catOpts:CatOpt[] = useMemo(
    ()=> (categorias ?? []).map(c=>({ id:c.id, value:c.id, label:c.nombre })),
    [categorias]
  );
  const options:Opt[] = useMemo(()=>[newOpt, ...catOpts],[catOpts]);

  /* cuando se crea una categoría desde el modal anidado */
  const handleNewCat = (c:CategoriaInversion) => {
    setOpenCatModal(false);
    refetch();                                     // refetch lista
    formikRef.current?.setFieldValue('categoria', c.id);
  };

  /* submit inversión */
  const handleSubmit = async (vals:InversionCreateData|InversionUpdateData, helpers:any) => {
    try { await onSubmit(vals); onClose(); }
    catch(err:any){
      const backend = err?.data || err?.response?.data || {};
      const beErrors= backend.errors || backend.data?.errors || {};
      const fErrors :Record<string,string> = {};
      Object.entries(beErrors).forEach(([f,msg]:any)=>{
        fErrors[f] = Array.isArray(msg)? msg[0] : String(msg);
      });
      helpers.setErrors(fErrors);
      handleBackendNotification(backend);
    } finally { helpers.setSubmitting(false); }
  };

  /* ——— Render ——— */
  return (
    <>
      {/* modal anidado */}
      <CategoriaInversionFormModal
        open={openCatModal}
        onClose={()=>setOpenCatModal(false)}
        onSuccess={handleNewCat}
      />

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{initialValues ? 'Editar inversión':'Nueva inversión'}</DialogTitle>

        <Formik
          innerRef={formikRef}
          initialValues={initialValues ? {
            fecha: initialValues.fecha,
            categoria: initialValues.categoria,
            gastos_insumos: initialValues.gastos_insumos,
            gastos_mano_obra: initialValues.gastos_mano_obra,
            descripcion: initialValues.descripcion ?? '',
            cosecha: initialValues.cosecha,
          } : defaults}
          enableReinitialize
          validationSchema={schema}
          validateOnChange={false}
          validateOnBlur={false}
          onSubmit={handleSubmit}
        >
          {({ values, errors, handleChange, setFieldValue, isSubmitting }) => (
            <Form>
              <DialogContent dividers className="space-y-4">

                <TextField
                  fullWidth type="date" name="fecha" label="Fecha"
                  InputLabelProps={{ shrink:true }}
                  value={values.fecha} onChange={handleChange}
                  error={!!errors.fecha} helperText={errors.fecha}
                />

                <Autocomplete
                  options={options}
                  loading={loadingCats}
                  isOptionEqualToValue={(o,v)=>o.value===v.value}
                  getOptionLabel={o=>o.label}
                  value={options.find(o=>o.value===values.categoria) || null}
                  onChange={(_,sel)=>{
                    if (sel?.value==='new'){
                      setOpenCatModal(true);
                      setFieldValue('categoria',0);
                    } else if (sel && typeof sel.value==='number'){
                      setFieldValue('categoria',sel.value);
                    }
                  }}
                  renderInput={params=>(
                    <TextField
                      {...params}
                      label="Categoría"
                      error={!!errors.categoria}
                      helperText={errors.categoria}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment:(
                          <>
                            {loadingCats && <CircularProgress size={20}/>}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                <TextField
                  fullWidth label="Gastos en insumos" name="gastos_insumos" type="number"
                  value={values.gastos_insumos} onChange={handleChange}
                  error={!!errors.gastos_insumos} helperText={errors.gastos_insumos}
                />

                <TextField
                  fullWidth label="Gastos mano de obra" name="gastos_mano_obra" type="number"
                  value={values.gastos_mano_obra} onChange={handleChange}
                  error={!!errors.gastos_mano_obra} helperText={errors.gastos_mano_obra}
                />

                <TextField
                  fullWidth label="Descripción (opcional)" name="descripcion"
                  multiline minRows={2}
                  value={values.descripcion} onChange={handleChange}
                  error={!!errors.descripcion} helperText={errors.descripcion}
                />
              </DialogContent>

              <DialogActions>
                <Button variant="outlined" onClick={onClose}>Cancelar</Button>
                <PermissionButton
                  perm={initialValues ? 'change_inversion':'add_inversion'}
                  type="submit" variant="contained" disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={22}/> : 'Guardar'}
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
