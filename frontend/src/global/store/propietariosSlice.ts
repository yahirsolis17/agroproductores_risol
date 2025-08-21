/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService, PaginationMeta } from '../../modules/gestion_huerta/services/propietarioService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                      */
/* -------------------------------------------------------------------------- */
export type Estado = 'activos' | 'archivados' | 'todos';

interface PropietarioState {
  list:    Propietario[];
  loading: boolean;
  error:   string | null;
  loaded:  boolean;
  page:    number;
  estado:  Estado;
  meta:    PaginationMeta;
  filters: Record<string, any>;
}

const initialState: PropietarioState = {
  list:    [],
  loading: false,
  error:   null,
  loaded:  false,
  page:    1,
  estado:  'activos',
  meta:    { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 },
  filters: {},
};

/* -------------------------------------------------------------------------- */
/*  THUNKS                                                                     */
/* -------------------------------------------------------------------------- */
type FetchParams = { page: number; estado: Estado } & Record<string, any>;

export const fetchPropietarios = createAsyncThunk<
  { propietarios: Propietario[]; meta: PaginationMeta },
  FetchParams,
  { rejectValue: string }
>(
  'propietarios/fetch',
  async (params, thunkAPI) => {
    try {
      const { page, estado, ...filters } = params;
      const { signal } = thunkAPI;
      return await propietarioService.list(page, estado, filters, { signal });
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return thunkAPI.rejectWithValue('Error al cargar propietarios');
    }
  }
);

export const createPropietario = createAsyncThunk<
  Propietario,
  PropietarioCreateData,
  { rejectValue: string }
>(
  'propietarios/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await propietarioService.create(payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al crear propietario');
    }
  }
);

export const updatePropietario = createAsyncThunk<
  Propietario,
  { id: number; payload: PropietarioUpdateData },
  { rejectValue: string }
>(
  'propietarios/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await propietarioService.update(id, payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al actualizar propietario');
    }
  }
);

export const archivePropietario = createAsyncThunk<
  Propietario,
  number,
  { rejectValue: string }
>(
  'propietarios/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.archive(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario; // Objeto ya archivado
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al archivar propietario');
    }
  }
);

export const restorePropietario = createAsyncThunk<
  Propietario,
  number,
  { rejectValue: string }
>(
  'propietarios/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.restore(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario; // Objeto restaurado
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al restaurar propietario');
    }
  }
);

export const deletePropietario = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>(
  'propietarios/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al eliminar propietario');
    }
  }
);

/* -------------------------------------------------------------------------- */
/*  SLICE                                                                      */
/* -------------------------------------------------------------------------- */
const propietariosSlice = createSlice({
  name: 'propietarios',
  initialState,
  reducers: {
    setPage:   (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setEstado: (s, a: PayloadAction<Estado>) => { s.estado = a.payload; s.page = 1; },
    setFilters:(s, a: PayloadAction<Record<string, any>>) => {
      s.filters = { ...a.payload }; // nueva referencia para memoizar
      s.page = 1;
    },
  },
  extraReducers: (b) => {
    /* -------- fetch -------- */
    b.addCase(fetchPropietarios.pending,  (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchPropietarios.fulfilled,(s,{payload})=>{
      s.list   = payload.propietarios;
      s.meta   = payload.meta;
      s.loading = false;
      s.loaded  = true;
    });
    b.addCase(fetchPropietarios.rejected, (s,{payload, error})=>{
      s.loading = false;
      s.loaded  = true;
      s.error   = (payload as string) ?? error.message ?? 'Error';
    });

    /* -------- create / update -------- */
    b.addCase(createPropietario.fulfilled,(s,{payload})=>{
      if (s.estado === 'activos') s.list.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updatePropietario.fulfilled,(s,{payload})=>{
      const i = s.list.findIndex(p=>p.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });

    /* -------- archive / restore -------- */
    b.addCase(archivePropietario.fulfilled,(s,{payload})=>{
      if (s.estado === 'activos') {
        s.list = s.list.filter(p => p.id !== payload.id);
      } else {
        const i = s.list.findIndex(p=>p.id===payload.id);
        if (i !== -1) s.list[i] = payload;
      }
    });
    b.addCase(restorePropietario.fulfilled,(s,{payload})=>{
      if (s.estado === 'archivados') {
        s.list = s.list.filter(p => p.id !== payload.id);
      } else {
        const i = s.list.findIndex(p=>p.id===payload.id);
        if (i !== -1) s.list[i] = payload;
      }
    });

    /* -------- delete -------- */
    b.addCase(deletePropietario.fulfilled,(s,{payload:id})=>{
      s.list = s.list.filter(p=>p.id!==id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });
  },
});

export const { setPage, setEstado, setFilters } = propietariosSlice.actions;
export default propietariosSlice.reducer;
