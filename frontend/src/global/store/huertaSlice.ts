import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaService }      from '../../modules/gestion_huerta/services/huertaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../../modules/gestion_huerta/types/huertaTypes';

/* ——— tipos ——— */
export type Estado = 'activos' | 'archivados' | 'todos';

export type HuertaFilters = {
  nombre?: string;
  propietario?: number;
};

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface HuertaState {
  list:    Huerta[];
  loading: boolean;
  error:   string | null;
  loaded:  boolean;
  page:    number;
  estado:  Estado;
  meta:    PaginationMeta;
  filters: HuertaFilters;
}

const initialState: HuertaState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  estado: 'activos',
  meta: { count: 0, next: null, previous: null },
  filters: {},
};

/* ───────────────────────────── THUNKS ───────────────────────────── */
export const fetchHuertas = createAsyncThunk(
  'huerta/fetchAll',
  async (
    { page, estado, filters }: { page: number; estado: Estado; filters: HuertaFilters },
    { rejectWithValue }
  ) => {
    try {
      const { huertas, meta } = await huertaService.list(page, estado, filters);
      return { huertas, meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al cargar huertas');
    }
  }
);

export const createHuerta = createAsyncThunk(
  'huerta/create',
  async (payload: HuertaCreateData, { rejectWithValue }) => {
    try {
      const res = await huertaService.create(payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear huerta');
    }
  }
);

export const updateHuerta = createAsyncThunk(
  'huerta/update',
  async (
    { id, payload }: { id: number; payload: HuertaUpdateData },
    { rejectWithValue }
  ) => {
    try {
      const res = await huertaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al actualizar huerta');
    }
  }
);

export const deleteHuerta = createAsyncThunk(
  'huerta/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await huertaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al eliminar huerta');
    }
  }
);

export const archiveHuerta = createAsyncThunk(
  'huerta/archive',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await huertaService.archivar(id);
      handleBackendNotification(res);
      // Solo devolvemos el id, ya que el backend no regresa la huerta completa
      return { id, archivado_en: new Date().toISOString() };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al archivar huerta');
    }
  }
);

export const restoreHuerta = createAsyncThunk(
  'huerta/restore',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await huertaService.restaurar(id);
      handleBackendNotification(res);
      // Solo devolvemos el id, ya que el backend no regresa la huerta completa
      return { id, archivado_en: null };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al restaurar huerta');
    }
  }
);

/* ───────────────────────────── SLICE ───────────────────────────── */
const huertaSlice = createSlice({
  name: 'huerta',
  initialState,
  reducers: {
    /*   expuestos para los hooks   */
    setHPage:   (s, a: PayloadAction<number>)            => { s.page   = a.payload; },
    setHEstado: (s, a: PayloadAction<Estado>)            => { s.estado = a.payload; s.page = 1; },
    setHFilters:(s, a: PayloadAction<HuertaFilters>)     => { s.filters = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    b.addCase(fetchHuertas.pending,   (s) => { s.loading = true;  s.error = null; });
    b.addCase(fetchHuertas.fulfilled, (s,{payload}) => {
      s.list   = payload.huertas;
      s.meta   = payload.meta;
      s.page   = payload.page;
      s.loading= false;
      s.loaded = true;
    });
    b.addCase(fetchHuertas.rejected,  (s,{payload}) => {
      s.loading = false;
      s.error   = typeof payload === 'string' ? payload : JSON.stringify(payload);
      s.loaded  = true;
    });

    b.addCase(createHuerta.fulfilled,(s,{payload}) => { s.list.unshift(payload); });
    b.addCase(updateHuerta.fulfilled,(s,{payload}) => {
      const i = s.list.findIndex(h => h.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });
    b.addCase(deleteHuerta.fulfilled,(s,{payload:id})=>{
      s.list = s.list.filter(h => h.id !== id);
    });
    b.addCase(archiveHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.list = s.list.filter(h => h.id !== payload.id);
      } else if (s.estado !== 'archivados') {
        const i = s.list.findIndex(h => h.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
    b.addCase(restoreHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.list = s.list.filter(h => h.id !== payload.id);
      } else if (s.estado !== 'activos') {
        const i = s.list.findIndex(h => h.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
  },
});

export const { setHPage, setHEstado, setHFilters } = huertaSlice.actions;
export default huertaSlice.reducer;
// No cambios necesarios en la lógica principal, ya que el slice ya maneja filtros, página y fetch desde backend correctamente.
// Solo aseguro que no haya lógica de filtrado local ni paginación local en el slice.
