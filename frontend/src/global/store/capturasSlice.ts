import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import {
  listCapturas,
  createCaptura,
  updateCaptura,
  archivarCaptura,
  restaurarCaptura,
  deleteCaptura,
} from '../../modules/gestion_bodega/services/capturasService';
import type {
  Captura,
  CapturaCreatePayload,
  CapturaUpdatePayload,
  CapturaFilters,
  PaginationMeta
} from '../../modules/gestion_bodega/types/capturasTypes';

// -------------------------------
// Estado
// -------------------------------
export interface CapturasState {
  items: Captura[];
  meta: PaginationMeta;
  filters: CapturaFilters;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  saving: boolean;
  error?: string | null;
  current: Captura | null;
}

const initialState: CapturasState = {
  items: [],
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 20, total_pages: 1 },
  filters: {
    estado: 'activas', // 'activas' | 'archivadas' | 'todas'
    search: '',
    page: 1,
    page_size: 20,
    ordering: '-fecha,-id',
    bodega: undefined,
    temporada: undefined,
    fecha_gte: undefined,
    fecha_lte: undefined,
    tipo_mango: undefined,
  },
  status: 'idle',
  saving: false,
  error: null,
  current: null,
};

// -------------------------------
// Thunks (CRUD + negocio)
// -------------------------------
export const fetchCapturas = createAsyncThunk<
  { capturas: Captura[]; meta: PaginationMeta },
  void,
  { state: RootState }
>('capturas/fetchCapturas', async (_void, { getState, rejectWithValue, signal }) => {
  try {
    const { filters } = (getState().capturas as CapturasState);
    const resp = await listCapturas(filters, { signal });
    // resp ya viene normalizado: { capturas, meta }
    return resp;
  } catch (err: any) {
    return rejectWithValue(err?.response?.data ?? { message: 'Error listando capturas' });
  }
});

export const createCapturaThunk = createAsyncThunk<Captura, CapturaCreatePayload>(
  'capturas/createCaptura',
  async (payload, { rejectWithValue }) => {
    try {
      const resp = await createCaptura(payload);
      return resp.captura;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data ?? { message: 'Error creando captura' });
    }
  }
);

export const updateCapturaThunk = createAsyncThunk<Captura, { id: number; data: CapturaUpdatePayload }>(
  'capturas/updateCaptura',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const resp = await updateCaptura(id, data);
      return resp.captura;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data ?? { message: 'Error actualizando captura' });
    }
  }
);

export const archivarCapturaThunk = createAsyncThunk<{ id: number; captura?: Captura }, { id: number }>(
  'capturas/archivarCaptura',
  async ({ id }, { rejectWithValue }) => {
    try {
      const resp = await archivarCaptura(id);
      return { id: resp.captura_id, captura: (resp as any).captura };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data ?? { message: 'Error archivando captura' });
    }
  }
);

export const restaurarCapturaThunk = createAsyncThunk<Captura, { id: number }>(
  'capturas/restaurarCaptura',
  async ({ id }, { rejectWithValue }) => {
    try {
      const resp = await restaurarCaptura(id);
      return resp.captura;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data ?? { message: 'Error restaurando captura' });
    }
  }
);

export const deleteCapturaThunk = createAsyncThunk<{ id: number }, { id: number }>(
  'capturas/deleteCaptura',
  async ({ id }, { rejectWithValue }) => {
    try {
      const resp = await deleteCaptura(id);
      return { id: resp.deleted_id };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data ?? { message: 'Error eliminando captura' });
    }
  }
);

// -------------------------------
// Slice
// -------------------------------
const capturasSlice = createSlice({
  name: 'capturas',
  initialState,
  reducers: {
    // --- filtros ---
    setEstado(state, action: PayloadAction<CapturaFilters['estado']>) {
      state.filters.estado = action.payload;
      state.filters.page = 1;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
      state.filters.page = 1;
    },
    setBodega(state, action: PayloadAction<number | undefined>) {
      state.filters.bodega = action.payload;
      state.filters.page = 1;
    },
    setTemporada(state, action: PayloadAction<number | undefined>) {
      state.filters.temporada = action.payload;
      state.filters.page = 1;
    },
    setTipoMango(state, action: PayloadAction<string | undefined>) {
      state.filters.tipo_mango = action.payload;
      state.filters.page = 1;
    },
    setDateRange(state, action: PayloadAction<{ desde?: string; hasta?: string }>) {
      state.filters.fecha_gte = action.payload.desde;
      state.filters.fecha_lte = action.payload.hasta;
      state.filters.page = 1;
    },
    setOrdering(state, action: PayloadAction<string>) {
      state.filters.ordering = action.payload;
      state.filters.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.filters.page_size = action.payload;
      state.filters.page = 1;
    },
    resetFilters(state) {
      state.filters = { ...initialState.filters };
    },

    // --- selección / UI ---
    setCurrent(state, action: PayloadAction<Captura | null>) {
      state.current = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    clearState() {
      return { ...initialState };
    },
  },
  extraReducers: builder => {
    // fetch
    builder.addCase(fetchCapturas.pending, (state) => {
      state.status = 'loading';
      state.error = null;
    });
    builder.addCase(fetchCapturas.fulfilled, (state, action) => {
      state.status = 'succeeded';
      state.items = action.payload.capturas;
      state.meta = action.payload.meta;
    });
    builder.addCase(fetchCapturas.rejected, (state, action: any) => {
      state.status = 'failed';
      state.error = action.payload?.message ?? 'Error al cargar capturas';
    });

    // create
    builder.addCase(createCapturaThunk.pending, (state) => {
      state.saving = true;
      state.error = null;
    });
    builder.addCase(createCapturaThunk.fulfilled, (state, action) => {
      state.saving = false;
      state.items.unshift(action.payload);
      state.meta.count = (state.meta.count ?? 0) + 1;
    });
    builder.addCase(createCapturaThunk.rejected, (state, action: any) => {
      state.saving = false;
      state.error = action.payload?.message ?? 'Error al crear captura';
    });

    // update
    builder.addCase(updateCapturaThunk.pending, (state) => {
      state.saving = true;
      state.error = null;
    });
    builder.addCase(updateCapturaThunk.fulfilled, (state, action) => {
      state.saving = false;
      const idx = state.items.findIndex(i => i.id === action.payload.id);
      if (idx >= 0) state.items[idx] = action.payload;
      if (state.current?.id === action.payload.id) state.current = action.payload;
    });
    builder.addCase(updateCapturaThunk.rejected, (state, action: any) => {
      state.saving = false;
      state.error = action.payload?.message ?? 'Error al actualizar captura';
    });

    // archivar
    builder.addCase(archivarCapturaThunk.fulfilled, (state, action) => {
      const idx = state.items.findIndex(i => i.id === action.payload.id);
      if (idx >= 0) {
        if (action.payload.captura) {
          state.items[idx] = action.payload.captura;
        } else {
          state.items[idx].is_active = false as any;
        }
      }
    });

    // restaurar
    builder.addCase(restaurarCapturaThunk.fulfilled, (state, action) => {
      const idx = state.items.findIndex(i => i.id === action.payload.id);
      if (idx >= 0) state.items[idx] = action.payload;
    });

    // delete
    builder.addCase(deleteCapturaThunk.fulfilled, (state, action) => {
      const before = state.items.length;
      state.items = state.items.filter(i => i.id !== action.payload.id);
      if (state.items.length < before) {
        state.meta.count = Math.max(0, (state.meta.count ?? 0) - 1);
      }
      if (state.current?.id === action.payload.id) state.current = null;
    });
  },
});

// -------------------------------
// Selectores
// -------------------------------
export const selectCapturasState = (s: RootState) => s.capturas as CapturasState;
export const selectCapturas = (s: RootState) => selectCapturasState(s).items;
export const selectCapturasMeta = (s: RootState) => selectCapturasState(s).meta;
export const selectCapturasFilters = (s: RootState) => selectCapturasState(s).filters;
export const selectCapturasLoading = (s: RootState) => selectCapturasState(s).status === 'loading';
export const selectCapturasSaving = (s: RootState) => selectCapturasState(s).saving;
export const selectCapturaById = (id: number) => (s: RootState) =>
  selectCapturasState(s).items.find(i => i.id === id) ?? null;

// -------------------------------
// Exports
// -------------------------------
export const {
  setEstado,
  setSearch,
  setBodega,
  setTemporada,
  setTipoMango,
  setDateRange,
  setOrdering,
  setPage,
  setPageSize,
  resetFilters,
  setCurrent,
  clearError,
  clearState,
} = capturasSlice.actions;

export default capturasSlice.reducer;
