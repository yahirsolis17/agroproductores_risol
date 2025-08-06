/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../../modules/gestion_huerta/types/cosechaTypes';
import { cosechaService } from '../../modules/gestion_huerta/services/cosechaService';
import { handleBackendNotification } from '../utils/NotificationEngine';

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface CosechasState {
  list: Cosecha[];
  loading: boolean;
  error: Record<string, any> | null;
  loaded: boolean;
  page: number;
  meta: PaginationMeta;

  // filtros
  temporadaId: number | null;
  search: string;
  estado: 'activas' | 'archivadas' | 'todas';
}

const initialState: CosechasState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  meta: { count: 0, next: null, previous: null },
  temporadaId: null,
  search: '',
  estado: 'activas',
};

// ───────────────── Thunks ─────────────────
export const fetchCosechas = createAsyncThunk<
  { cosechas: Cosecha[]; meta: PaginationMeta; page: number },
  { page: number; temporadaId: number; search?: string; estado?: 'activas'|'archivadas'|'todas' },
  { rejectValue: Record<string, any> }
>(
  'cosechas/fetch',
  async ({ page, temporadaId, search, estado }, { rejectWithValue }) => {
    try {
      const res = await cosechaService.list(page, temporadaId, search, estado);
      handleBackendNotification(res);
      return { cosechas: res.data.cosechas, meta: res.data.meta, page };
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al cargar cosechas' };
      handleBackendNotification(payload.notification || payload);
      return rejectWithValue(payload);
    }
  }
);

export const createCosecha = createAsyncThunk<
  Cosecha,
  CosechaCreateData,
  { rejectValue: Record<string, any> }
>(
  'cosechas/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await cosechaService.create(payload);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al crear cosecha' };
      handleBackendNotification(payload.notification || payload);
      return rejectWithValue(payload);
    }
  }
);

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
      handleBackendNotification(payload.notification || payload);
      return rejectWithValue(payload);
    }
  }
);

export const deleteCosecha = createAsyncThunk<
  number,
  number,
  { rejectValue: Record<string, any> }
>(
  'cosechas/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al eliminar cosecha' };
      handleBackendNotification(payload.notification || payload);
      return rejectWithValue(payload);
    }
  }
);

export const archivarCosecha = createAsyncThunk<
  Cosecha,
  number,
  { rejectValue: Record<string, any> }
>(
  'cosechas/archivar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.archivar(id);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al archivar cosecha' };
      handleBackendNotification(payload.notification || payload);
      return rejectWithValue(payload);
    }
  }
);

export const restaurarCosecha = createAsyncThunk<
  Cosecha,
  number,
  { rejectValue: Record<string, any> }
>(
  'cosechas/restaurar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.restaurar(id);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al restaurar cosecha' };
      handleBackendNotification(payload.notification || payload);
      return rejectWithValue(payload);
    }
  }
);

export const toggleFinalizadaCosecha = createAsyncThunk<
  Cosecha,
  number,
  { rejectValue: Record<string, any> }
>(
  'cosechas/toggleFinalizada',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cosechaService.toggleFinalizada(id);
      handleBackendNotification(res);
      return res.data.cosecha;
    } catch (err: any) {
      const payload = err?.response?.data || { message: 'Error al cambiar estado de cosecha' };
      handleBackendNotification(payload.notification || payload);
      return rejectWithValue(payload);
    }
  }
);

// ───────────────── Slice ─────────────────
const cosechasSlice = createSlice({
  name: 'cosechas',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setTemporadaId(state, action: PayloadAction<number | null>) {
      state.temporadaId = action.payload;
      state.page = 1;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    setEstado(state, action: PayloadAction<'activas'|'archivadas'|'todas'>) {
      state.estado = action.payload;
      state.page = 1;
    },
    clear: () => ({ ...initialState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCosechas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCosechas.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.loaded = true;
        state.list = payload.cosechas;
        state.meta = payload.meta;
        state.page = payload.page;
      })
      .addCase(fetchCosechas.rejected, (state, { payload }) => {
        state.loading = false;
        state.loaded = true;
        state.error = payload || null;
      })

      .addCase(createCosecha.fulfilled, (state, { payload }) => {
        state.list.unshift(payload);
        state.meta.count += 1;
      })

      .addCase(updateCosecha.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(c => c.id === payload.id);
        if (i !== -1) state.list[i] = payload;
      })

      .addCase(deleteCosecha.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(c => c.id !== payload);
        if (state.meta.count > 0) state.meta.count -= 1;
      })

      .addCase(archivarCosecha.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(c => c.id === payload.id);
        if (i !== -1) state.list[i] = payload;
      })

      .addCase(restaurarCosecha.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(c => c.id === payload.id);
        if (i !== -1) state.list[i] = payload;
      })

      .addCase(toggleFinalizadaCosecha.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(c => c.id === payload.id);
        if (i !== -1) state.list[i] = payload;
      });
  },
});

export const {
  setPage,
  setTemporadaId,
  setSearch,
  setEstado,
  clear,
} = cosechasSlice.actions;

export default cosechasSlice.reducer;
