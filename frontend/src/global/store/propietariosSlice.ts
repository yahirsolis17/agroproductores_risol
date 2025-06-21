/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService } from '../../modules/gestion_huerta/services/propietarioService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

/* -------------------------------------------------------------------------- */
/*  Tipos de filtro y de estado                                               */
/* -------------------------------------------------------------------------- */
export type Estado = 'activos' | 'archivados' | 'todos';

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface PropietarioState {
  list:    Propietario[];
  loading: boolean;
  error:   string | null;
  loaded:  boolean;
  page:    number;
  estado:  Estado;
  meta:    PaginationMeta;
}

const initialState: PropietarioState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  estado: 'activos',
  meta: { count: 0, next: null, previous: null },
};

/* -------------------------------------------------------------------------- */
/*  THUNKS – una única fuente de verdad para IO                               */
/* -------------------------------------------------------------------------- */
export const fetchPropietarios = createAsyncThunk(
  'propietarios/fetch',
  async ({ page, estado }: { page: number; estado: 'activos' | 'archivados' | 'todos' }) => {
    return await propietarioService.list(page, estado);
  }
);


export const createPropietario = createAsyncThunk(
  'propietarios/create',
  async (payload: PropietarioCreateData, { rejectWithValue }) => {
    try {
      const res = await propietarioService.create(payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const updatePropietario = createAsyncThunk(
  'propietarios/update',
  async (
    { id, payload }: { id: number; payload: PropietarioUpdateData },
    { rejectWithValue }
  ) => {
    try {
      const res = await propietarioService.update(id, payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const archivePropietario = createAsyncThunk(
  'propietarios/archive',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.archive(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;      // retorna el objeto ya archivado
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const restorePropietario = createAsyncThunk(
  'propietarios/restore',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.restore(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;      // retorna el objeto restaurado
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const deletePropietario = createAsyncThunk(
  'propietarios/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

/* -------------------------------------------------------------------------- */
/*  SLICE                                                                     */
/* -------------------------------------------------------------------------- */
const propietariosSlice = createSlice({
  name: 'propietarios',
  initialState,
  reducers: {
    setPage:   (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setEstado: (s, a: PayloadAction<Estado>) => { s.estado = a.payload; s.page = 1; },
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
    b.addCase(fetchPropietarios.rejected, (s,{error})=>{
      s.loading = false;
      s.error   = error.message ?? 'Error al cargar';
      s.loaded  = true;
    });

    /* -------- create / update -------- */
    b.addCase(createPropietario.fulfilled,(s,{payload})=>{
      if (s.estado === 'activos') s.list.unshift(payload);          // optimista
      s.meta.count += 1;
    });
    b.addCase(updatePropietario.fulfilled,(s,{payload})=>{
      const i = s.list.findIndex(p=>p.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });

    /* -------- archive / restore -------- */
    b.addCase(archivePropietario.fulfilled,(s,{payload})=>{
      /* elimina de activos inmediato para UX */
      if (s.estado === 'activos') {
        s.list = s.list.filter(p => p.id !== payload.id);
      } else if (s.estado !== 'archivados') {
        // estado === todos → solo actualizo
        const i = s.list.findIndex(p=>p.id===payload.id);
        if (i !== -1) s.list[i] = payload;
      }
    });
    b.addCase(restorePropietario.fulfilled,(s,{payload})=>{
      if (s.estado === 'archivados') {
        s.list = s.list.filter(p => p.id !== payload.id);
      } else if (s.estado !== 'activos') {
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

export const { setPage, setEstado } = propietariosSlice.actions;
export default propietariosSlice.reducer;
