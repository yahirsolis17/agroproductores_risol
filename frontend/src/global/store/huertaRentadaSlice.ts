// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaRentadaService } from '../../modules/gestion_huerta/services/huertaRentadaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { HuertaRentada, HuertaRentadaCreateData, HuertaRentadaUpdateData } from '../../modules/gestion_huerta/types/huertaRentadaTypes';
import { Estado, PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { extractApiError } from '../types/apiTypes';

export interface HRFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

interface HuertaRentadaState {
  items: HuertaRentada[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  estado: Estado;
  filters: HRFilters;
  meta: PaginationMeta;
}

const initialState: HuertaRentadaState = {
  items: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  estado: 'activos',
  filters: {},
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 }, // ← actualizado
};

export const fetchHuertasRentadas = createAsyncThunk<
  { huertas_rentadas: HuertaRentada[]; meta: PaginationMeta; page: number },
  { page: number; estado: Estado; filters: HRFilters },
  { rejectValue: string }
>(
  'huertaRentada/fetchAll',
  async ({ page, estado, filters }, thunkAPI) => {
    try {
      const { signal } = thunkAPI;
      const res = await huertaRentadaService.list(page, estado, filters, { signal });
      return { huertas_rentadas: res.data.results, meta: res.data.meta, page };
    } catch (err: unknown) {
      handleBackendNotification(extractApiError(err));
      return thunkAPI.rejectWithValue('Error al cargar huertas rentadas');
    }
  },
);

export const createHuertaRentada = createAsyncThunk<HuertaRentada, HuertaRentadaCreateData, { rejectValue: string }>(
  'huertaRentada/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.create(payload);
      handleBackendNotification(res);
      return res.data.huerta_rentada as HuertaRentada;
    } catch (err: unknown) {
      handleBackendNotification(extractApiError(err));
      return rejectWithValue('Error al crear huerta rentada');
    }
  },
);

export const updateHuertaRentada = createAsyncThunk<
  HuertaRentada,
  { id: number; payload: HuertaRentadaUpdateData },
  { rejectValue: string }
>(
  'huertaRentada/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.huerta_rentada as HuertaRentada;
    } catch (err: unknown) {
      handleBackendNotification(extractApiError(err));
      return rejectWithValue('Error al actualizar huerta rentada');
    }
  },
);

export const deleteHuertaRentada = createAsyncThunk<number, number, { rejectValue: string }>(
  'huertaRentada/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: unknown) {
      handleBackendNotification(extractApiError(err));
      return rejectWithValue('Error al eliminar huerta rentada');
    }
  },
);

export const archiveHuertaRentada = createAsyncThunk<
  { id: number; archivado_en: string },
  number,
  { rejectValue: string }
>(
  'huertaRentada/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.archivar(id);
      handleBackendNotification(res);
      return { id, archivado_en: new Date().toISOString() };
    } catch (err: unknown) {
      handleBackendNotification(extractApiError(err));
      return rejectWithValue('Error al archivar huerta rentada');
    }
  },
);

export const restoreHuertaRentada = createAsyncThunk<
  { id: number; archivado_en: null },
  number,
  { rejectValue: string }
>(
  'huertaRentada/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.restaurar(id);
      handleBackendNotification(res);
      return { id, archivado_en: null };
    } catch (err: unknown) {
      handleBackendNotification(extractApiError(err));
      return rejectWithValue('Error al restaurar huerta rentada');
    }
  },
);

const hrSlice = createSlice({
  name: 'huertaRentada',
  initialState,
  reducers: {
    setHRPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setHREstado: (s, a: PayloadAction<Estado>) => { s.estado = a.payload; s.page = 1; },
    setHRFilters: (s, a: PayloadAction<HRFilters>) => { s.filters = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    b.addCase(fetchHuertasRentadas.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchHuertasRentadas.fulfilled, (s, { payload }) => {
      s.items = payload.huertas_rentadas; s.meta = payload.meta; s.page = payload.page;
      s.loading = false; s.loaded = true;
    });
    b.addCase(fetchHuertasRentadas.rejected, (s, { payload, error }) => {
      s.loading = false; s.loaded = true; s.error = payload ?? error.message ?? 'Error';
    });

    b.addCase(createHuertaRentada.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') s.items.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updateHuertaRentada.fulfilled, (s, { payload }) => {
      const i = s.items.findIndex(h => h.id === payload.id);
      if (i !== -1) s.items[i] = payload;
    });
    b.addCase(deleteHuertaRentada.fulfilled, (s, { payload: id }) => {
      s.items = s.items.filter(h => h.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    b.addCase(archiveHuertaRentada.fulfilled, (s, { payload }) => {
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
    b.addCase(restoreHuertaRentada.fulfilled, (s, { payload }) => {
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
export const { setHRPage, setHREstado, setHRFilters } = hrSlice.actions;
export default hrSlice.reducer;
