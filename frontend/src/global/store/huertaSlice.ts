// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaService } from '../../modules/gestion_huerta/services/huertaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../../modules/gestion_huerta/types/huertaTypes';
import { Estado, PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { extractApiError } from '../types/apiTypes';
import { extractApiMessage } from '../api/errorUtils';

export interface HuertaFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

interface HuertaState {
  items: Huerta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  estado: Estado;
  filters: HuertaFilters;
  meta: PaginationMeta;
}

const initialState: HuertaState = {
  items: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  estado: 'activos',
  filters: {},
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 }, // ← actualizado
};
export const fetchHuertas = createAsyncThunk<
  { huertas: Huerta[]; meta: PaginationMeta; page: number },
  { page: number; estado: Estado; filters: HuertaFilters },
  { rejectValue: unknown }
>(
  'huerta/fetchAll',
  async ({ page, estado, filters }, thunkAPI) => {
    try {
      const { signal } = thunkAPI;
      const res = await huertaService.list(page, estado, filters, { signal });
      return { huertas: res.data.results, meta: res.data.meta, page };
    } catch (err: unknown) {
      const e = extractApiError(err);
      handleBackendNotification(e);
      return thunkAPI.rejectWithValue(e);
    }
  },
);

export const createHuerta = createAsyncThunk<Huerta, HuertaCreateData, { rejectValue: unknown }>(
  'huerta/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await huertaService.create(payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: unknown) {
      const e = extractApiError(err);
      // No toast - let form handle inline errors
      return rejectWithValue(e);
    }
  },
);

export const updateHuerta = createAsyncThunk<
  Huerta,
  { id: number; payload: HuertaUpdateData },
  { rejectValue: unknown }
>(
  'huerta/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await huertaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: unknown) {
      const e = extractApiError(err);
      // No toast - let form handle inline errors
      return rejectWithValue(e);
    }
  },
);

export const deleteHuerta = createAsyncThunk<number, number, { rejectValue: unknown }>(
  'huerta/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: unknown) {
      const e = extractApiError(err);
      handleBackendNotification(e);
      return rejectWithValue(e);
    }
  },
);

export const archiveHuerta = createAsyncThunk<
  { id: number; archivado_en: string },
  number,
  { rejectValue: unknown }
>(
  'huerta/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaService.archivar(id);
      handleBackendNotification(res);
      // Si quisieras usar res.data.affected para un toast detallado, ya viene listo.
      return { id, archivado_en: new Date().toISOString() };
    } catch (err: unknown) {
      const e = extractApiError(err);
      handleBackendNotification(e);
      return rejectWithValue(e);
    }
  },
);

export const restoreHuerta = createAsyncThunk<
  { id: number; archivado_en: null },
  number,
  { rejectValue: unknown }
>(
  'huerta/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaService.restaurar(id);
      handleBackendNotification(res);
      return { id, archivado_en: null };
    } catch (err: unknown) {
      const e = extractApiError(err);
      handleBackendNotification(e);
      return rejectWithValue(e);
    }
  },
);

const huertaSlice = createSlice({
  name: 'huerta',
  initialState,
  reducers: {
    setHPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setHEstado: (s, a: PayloadAction<Estado>) => { s.estado = a.payload; s.page = 1; },
    setHFilters: (s, a: PayloadAction<HuertaFilters>) => { s.filters = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    b.addCase(fetchHuertas.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchHuertas.fulfilled, (s, { payload }) => {
      s.items = payload.huertas; s.meta = payload.meta; s.page = payload.page;
      s.loading = false; s.loaded = true;
    });
    b.addCase(fetchHuertas.rejected, (s, { payload, error }) => {
      s.loading = false; s.loaded = true;
      const msg = extractApiMessage(payload ?? error, 'Error');
      s.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
    });

    b.addCase(createHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') s.items.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updateHuerta.fulfilled, (s, { payload }) => {
      const i = s.items.findIndex(h => h.id === payload.id);
      if (i !== -1) s.items[i] = payload;
    });
    b.addCase(deleteHuerta.fulfilled, (s, { payload: id }) => {
      s.items = s.items.filter(h => h.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    // En huertaSlice:
    b.addCase(archiveHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.items = s.items.filter(h => h.id !== payload.id);
      } else {
        const i = s.items.findIndex(h => h.id === payload.id);
        if (i !== -1) {
          s.items[i].archivado_en = payload.archivado_en;
          s.items[i].is_active = false; // 👈 añadir
        }
      }
    });
    b.addCase(restoreHuerta.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.items = s.items.filter(h => h.id !== payload.id);
      } else {
        const i = s.items.findIndex(h => h.id === payload.id);
        if (i !== -1) {
          s.items[i].archivado_en = payload.archivado_en;
          s.items[i].is_active = true; // 👈 añadir
        }
      }
    });

  },
});
export const { setHPage, setHEstado, setHFilters } = huertaSlice.actions;
export default huertaSlice.reducer;
