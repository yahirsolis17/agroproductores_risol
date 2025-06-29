import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaService } from '../../modules/gestion_huerta/services/huertaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../../modules/gestion_huerta/types/huertaTypes';

/* ─── Tipos de estado y filtros ─── */
export type Estado = 'activos' | 'archivados' | 'todos';

export interface HuertaFilters {
  search?: string;            // ← ahora disponible
  nombre?: string;
  propietario?: number;
}
interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface HuertaState {
  list:    Huerta[];
  loading: boolean;
  loaded:  boolean;
  error:   string | null;
  page:    number;
  estado:  Estado;
  filters: HuertaFilters;
  meta:    PaginationMeta;
}

/* ─── Estado inicial ─── */
const initialState: HuertaState = {
  list:    [],
  loading: false,
  loaded:  false,
  error:   null,
  page:    1,
  estado:  'activos',
  filters: {},
  meta:    { count: 0, next: null, previous: null },
};

/* ═══ THUNKS ═══ */
export const fetchHuertas = createAsyncThunk<
  { huertas: Huerta[]; meta: PaginationMeta; page: number },
  { page: number; estado: Estado; filters: HuertaFilters },
  { rejectValue: string }
>(
  'huerta/fetchAll',
  async ({ page, estado, filters }, { rejectWithValue }) => {
    try {
      const { huertas, meta } = await huertaService.list(page, estado, filters);
      return { huertas, meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al cargar huertas');
    }
  },
);

export const createHuerta = createAsyncThunk<Huerta, HuertaCreateData, { rejectValue: string }>(
  'huerta/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await huertaService.create(payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al crear huerta');
    }
  },
);

export const updateHuerta = createAsyncThunk<
  Huerta,
  { id: number; payload: HuertaUpdateData },
  { rejectValue: string }
>(
  'huerta/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await huertaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al actualizar huerta');
    }
  },
);

export const deleteHuerta = createAsyncThunk<number, number, { rejectValue: string }>(
  'huerta/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al eliminar huerta');
    }
  },
);

export const archiveHuerta = createAsyncThunk<
  { id: number; archivado_en: string },
  number,
  { rejectValue: string }
>(
  'huerta/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaService.archivar(id);
      handleBackendNotification(res);
      return { id, archivado_en: new Date().toISOString() };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al archivar huerta');
    }
  },
);

export const restoreHuerta = createAsyncThunk<
  { id: number; archivado_en: null },
  number,
  { rejectValue: string }
>(
  'huerta/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaService.restaurar(id);
      handleBackendNotification(res);
      return { id, archivado_en: null };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al restaurar huerta');
    }
  },
);

/* ═══ SLICE ═══ */
const huertaSlice = createSlice({
  name: 'huerta',
  initialState,
  reducers: {
    setHPage:   (s, a: PayloadAction<number>)        => { s.page    = a.payload; },
    setHEstado: (s, a: PayloadAction<Estado>)        => { s.estado  = a.payload; s.page = 1; },
    setHFilters:(s, a: PayloadAction<HuertaFilters>) => { s.filters = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    /* fetch */
    b.addCase(fetchHuertas.pending,   (s)            => { s.loading = true;  s.error = null; });
    b.addCase(fetchHuertas.fulfilled, (s, { payload }) => {
      s.list    = payload.huertas;
      s.meta    = payload.meta;
      s.page    = payload.page;
      s.loading = false;
      s.loaded  = true;
    });
    b.addCase(fetchHuertas.rejected,  (s, { payload, error }) => {
      s.loading = false;
      s.loaded  = true;
      s.error   = payload ?? error.message ?? 'Error';
    });

    /* create / update / delete */
    b.addCase(createHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') s.list.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updateHuerta.fulfilled, (s, { payload }) => {
      const i = s.list.findIndex(h => h.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });
    b.addCase(deleteHuerta.fulfilled, (s, { payload: id }) => {
      s.list = s.list.filter(h => h.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    /* archive / restore */
    b.addCase(archiveHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.list = s.list.filter(h => h.id !== payload.id);
      } else {
        const i = s.list.findIndex(h => h.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
    b.addCase(restoreHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.list = s.list.filter(h => h.id !== payload.id);
      } else {
        const i = s.list.findIndex(h => h.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
  },
});

export const { setHPage, setHEstado, setHFilters } = huertaSlice.actions;
export default huertaSlice.reducer;
