// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { temporadaService } from '../../modules/gestion_huerta/services/temporadaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { extractApiMessage } from '../api/errorUtils';
import { Temporada, TemporadaCreateData, EstadoTemporada } from '../../modules/gestion_huerta/types/temporadaTypes';
import { PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { ApiError, extractApiError } from '../types/apiTypes';

interface TemporadaState {
  items: Temporada[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  page: number;
  meta: PaginationMeta;
  yearFilter: number | null;
  huertaId: number | null;
  huertaRentadaId: number | null;
  estadoFilter: EstadoTemporada;              // 👈
  finalizadaFilter: boolean | null;
  searchFilter: string;
}

const initialState: TemporadaState = {
  items: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 },
  yearFilter: null,
  huertaId: null,
  huertaRentadaId: null,
  estadoFilter: 'activas',
  finalizadaFilter: null,
  searchFilter: '',
};

// ——— Thunks ———

type FetchArgs = {
  page: number;
  año?: number;
  huertaId?: number;
  huertaRentadaId?: number;
  estado?: EstadoTemporada;                  // 👈
  finalizada?: boolean;
  search?: string;
};

export const fetchTemporadas = createAsyncThunk<
  { temporadas: Temporada[]; meta: PaginationMeta; page: number },
  FetchArgs,
  { rejectValue: ApiError }
>(
  'temporada/fetchAll',
  async ({ page, año, huertaId, huertaRentadaId, estado, finalizada, search }, { rejectWithValue }) => {
    try {
      const res = await temporadaService.list(page, año, huertaId, huertaRentadaId, estado, finalizada, search);
      handleBackendNotification(res);
      return {
        temporadas: res.data.results,
        meta: res.data.meta,
        page,
      };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const createTemporada = createAsyncThunk<
  Temporada,
  TemporadaCreateData,
  { rejectValue: ApiError }
>(
  'temporada/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await temporadaService.create(payload);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const deleteTemporada = createAsyncThunk<
  number,
  number,
  { rejectValue: ApiError }
>(
  'temporada/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const finalizarTemporada = createAsyncThunk<
  Temporada,
  number,
  { rejectValue: ApiError }
>(
  'temporada/finalizar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.finalizar(id);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const archivarTemporada = createAsyncThunk<
  Temporada,
  number,
  { rejectValue: ApiError }
>(
  'temporada/archivar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.archivar(id);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const restaurarTemporada = createAsyncThunk<
  Temporada,
  number,
  { rejectValue: ApiError }
>(
  'temporada/restaurar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.restaurar(id);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

// ——— Slice ———
const temporadaSlice = createSlice({
  name: 'temporada',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setYearFilter(state, action: PayloadAction<number | null>) {
      state.yearFilter = action.payload;
      state.page = 1;
    },
    setHuertaId(state, action: PayloadAction<number | null>) {
      state.huertaId = action.payload;
      state.page = 1;
    },
    setHuertaRentadaId(state, action: PayloadAction<number | null>) {
      state.huertaRentadaId = action.payload;
      state.page = 1;
    },
    setEstadoFilter(state, action: PayloadAction<EstadoTemporada>) {   // 👈
      state.estadoFilter = action.payload;
      state.page = 1;
    },
    setFinalizadaFilter(state, action: PayloadAction<boolean | null>) {
      state.finalizadaFilter = action.payload;
      state.page = 1;
    },
    setSearchFilter(state, action: PayloadAction<string>) {
      state.searchFilter = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemporadas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemporadas.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.loaded = true;
        state.items = payload.temporadas;
        state.meta = payload.meta;
        state.page = payload.page;
      })
      .addCase(fetchTemporadas.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.loaded = true;
        const msg = extractApiMessage(payload ?? error, 'Error');
        state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
      })
      .addCase(createTemporada.fulfilled, (state, { payload }) => {
        state.items.unshift(payload);
      })
      .addCase(createTemporada.rejected, (state, { payload, error }) => {
        const msg = extractApiMessage(payload ?? error, 'Error');
        state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
      })
      .addCase(deleteTemporada.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((t) => t.id !== payload);
      })
      .addCase(deleteTemporada.rejected, (state, { payload, error }) => {
        const msg = extractApiMessage(payload ?? error, 'Error');
        state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
      })
      .addCase(finalizarTemporada.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(finalizarTemporada.rejected, (state, { payload, error }) => {
        const msg = extractApiMessage(payload ?? error, 'Error');
        state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
      })
      .addCase(archivarTemporada.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(archivarTemporada.rejected, (state, { payload, error }) => {
        const msg = extractApiMessage(payload ?? error, 'Error');
        state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
      })
      .addCase(restaurarTemporada.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(restaurarTemporada.rejected, (state, { payload, error }) => {
        const msg = extractApiMessage(payload ?? error, 'Error');
        state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
      });
  },
});

export const {
  setPage,
  setYearFilter,
  setHuertaId,
  setHuertaRentadaId,
  setEstadoFilter,
  setFinalizadaFilter,
  setSearchFilter,
} = temporadaSlice.actions;

export default temporadaSlice.reducer;
