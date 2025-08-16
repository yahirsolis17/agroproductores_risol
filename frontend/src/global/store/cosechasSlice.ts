import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../../modules/gestion_huerta/types/cosechaTypes';
import { cosechaService } from '../../modules/gestion_huerta/services/cosechaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import type { RootState } from './store';

interface PaginationMeta { count: number; next: string | null; previous: string | null; }

interface CosechasState {
  list: Cosecha[];
  loading: boolean;
  error: Record<string, any> | null;
  loaded: boolean;
  page: number;
  meta: PaginationMeta;
  temporadaId: number | null;
  search: string;
  estado: 'activas' | 'archivadas' | 'todas';
}

const initialState: CosechasState = {
  list: [], loading: false, error: null, loaded: false,
  page: 1, meta: { count: 0, next: null, previous: null },
  temporadaId: null, search: '', estado: 'activas',
};

// FETCH
export const fetchCosechas = createAsyncThunk<
  { cosechas: Cosecha[]; meta: PaginationMeta; page: number },
  void,
  { state: RootState; rejectValue: Record<string, any> }
>(
  'cosechas/fetch',
  async (_, { getState, rejectWithValue }) => {
    const { page, temporadaId, search, estado } = getState().cosechas;
    if (!temporadaId) return rejectWithValue({ message: 'Falta temporada seleccionada.' });
    try {
      const res = await cosechaService.list(page, temporadaId, search, estado);
      handleBackendNotification(res);
      return { cosechas: res.data.cosechas, meta: res.data.meta, page };
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al cargar cosechas' };
      handleBackendNotification(payload);
      return rejectWithValue(payload);
    }
  }
);

// CREATE
export const createCosecha = createAsyncThunk<Cosecha, CosechaCreateData, { rejectValue: Record<string, any> }>(
  'cosechas/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await cosechaService.create(payload);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al crear cosecha' };
      handleBackendNotification(payload);
      return rejectWithValue(payload);
    }
  }
);

// UPDATE
export const updateCosecha = createAsyncThunk<
  Cosecha,
  { id: number; data: CosechaUpdateData },
  { rejectValue: Record<string, any> }
>(
  'cosechas/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await cosechaService.update(id, data);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al actualizar cosecha' };
      handleBackendNotification(payload);
      return rejectWithValue(payload);
    }
  }
);

// DELETE
export const deleteCosecha = createAsyncThunk<number, number, { rejectValue: Record<string, any> }>(
  'cosechas/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al eliminar cosecha' };
      handleBackendNotification(payload);
      return rejectWithValue(payload);
    }
  }
);

// ARCHIVAR
export const archivarCosecha = createAsyncThunk<Cosecha, number, { rejectValue: Record<string, any> }>(
  'cosechas/archivar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.archivar(id);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al archivar cosecha' };
      handleBackendNotification(payload);
      return rejectWithValue(payload);
    }
  }
);

// RESTAURAR
export const restaurarCosecha = createAsyncThunk<Cosecha, number, { rejectValue: Record<string, any> }>(
  'cosechas/restaurar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.restaurar(id);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al restaurar cosecha' };
      handleBackendNotification(payload);
      return rejectWithValue(payload);
    }
  }
);

// TOGGLE FINALIZADA
export const toggleFinalizadaCosecha = createAsyncThunk<Cosecha, number, { rejectValue: Record<string, any> }>(
  'cosechas/toggleFinalizada',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.toggleFinalizada(id);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al cambiar estado de cosecha' };
      handleBackendNotification(payload);
      return rejectWithValue(payload);
    }
  }
);

// SLICE
const cosechasSlice = createSlice({
  name: 'cosechas',
  initialState,
  reducers: {
    setPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setTemporadaId: (s, a: PayloadAction<number | null>) => { s.temporadaId = a.payload; s.page = 1; },
    setSearch: (s, a: PayloadAction<string>) => { s.search = a.payload; s.page = 1; },
    setEstado: (s, a: PayloadAction<'activas' | 'archivadas' | 'todas'>) => { s.estado = a.payload; s.page = 1; },
    clear: () => ({ ...initialState }),
  },
  extraReducers: (b) => {
    b.addCase(fetchCosechas.pending,  (s)=>{ s.loading=true; s.error=null; });
    b.addCase(fetchCosechas.fulfilled,(s,{payload})=>{
      s.loading=false; s.loaded=true;
      s.list = payload.cosechas;
      s.meta = payload.meta;
      s.page = payload.page;
    });
    b.addCase(fetchCosechas.rejected, (s,{payload})=>{
      s.loading=false; s.loaded=true; s.error=payload||null;
    });

    b.addCase(createCosecha.fulfilled, ()=>{ /* recargamos luego en hook */ });

    b.addCase(updateCosecha.fulfilled,(s,{payload})=>{
      const i = s.list.findIndex(c=>c.id===payload.id);
      if (i!==-1) s.list[i]=payload;
    });

    b.addCase(deleteCosecha.fulfilled,(s,{payload:id})=>{
      s.list = s.list.filter(c=>c.id!==id);
      if (s.meta.count>0) s.meta.count -= 1;
    });

    b.addCase(archivarCosecha.fulfilled,(s,{payload})=>{
      if (s.estado==='activas') {
        s.list = s.list.filter(c=>c.id!==payload.id);
      } else {
        const i = s.list.findIndex(c=>c.id===payload.id);
        if (i!==-1) s.list[i]=payload;
      }
    });

    b.addCase(restaurarCosecha.fulfilled,(s,{payload})=>{
      if (s.estado==='archivadas') {
        s.list = s.list.filter(c=>c.id!==payload.id);
      } else {
        const i = s.list.findIndex(c=>c.id===payload.id);
        if (i!==-1) s.list[i]=payload;
      }
    });

    b.addCase(toggleFinalizadaCosecha.fulfilled,(s,{payload})=>{
      const i = s.list.findIndex(c=>c.id===payload.id);
      if (i!==-1) s.list[i]=payload;
    });
  },
});

export const { setPage, setTemporadaId, setSearch, setEstado, clear } = cosechasSlice.actions;
export default cosechasSlice.reducer;
