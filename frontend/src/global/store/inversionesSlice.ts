import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inversionService, InversionFilters as SvcFilters } from '../../modules/gestion_huerta/services/inversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  InversionHuerta,
  InversionHuertaCreateData,
  InversionHuertaUpdateData,
} from '../../modules/gestion_huerta/types/inversionTypes';
import type { RootState } from './store';
import { PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { ApiError, extractApiError } from '../types/apiTypes';
import { extractApiMessage } from '../api/errorUtils';

export type EstadoFiltro = 'activas' | 'archivadas' | 'todas';
export type InversionFilters = SvcFilters;

interface InversionesState {
  items: InversionHuerta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  meta: PaginationMeta;
  huertaId: number | null;
  huertaRentadaId: number | null;
  temporadaId: number | null;
  cosechaId: number | null;
  filters: InversionFilters;
}

const PAGE_SIZE = 10;

const initialState: InversionesState = {
  items: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  meta: { count: 0, next: null, previous: null, page: 1, page_size: PAGE_SIZE, total_pages: 1 },
  huertaId: null,
  huertaRentadaId: null,
  temporadaId: null,
  cosechaId: null,
  filters: { estado: 'activas' },
};

function ctxFromState(state: InversionesState) {
  return {
    huertaId: state.huertaId ?? undefined,
    huertaRentadaId: state.huertaRentadaId ?? undefined,
    temporadaId: state.temporadaId!,
    cosechaId: state.cosechaId!,
  };
}

type PagePayload = { inversiones: InversionHuerta[]; meta: PaginationMeta; page: number };

async function fetchSameOrPrevPageSilently(state: InversionesState): Promise<PagePayload> {
  const res1 = await inversionService.list(ctxFromState(state), state.page, PAGE_SIZE, state.filters);
  const items1 = res1?.data?.results ?? [];
  const meta1 = res1?.data?.meta ?? { count: 0, next: null, previous: null, page: state.page, page_size: PAGE_SIZE, total_pages: 1 };

  if (items1.length > 0 || state.page === 1) {
    return { inversiones: items1, meta: meta1, page: state.page };
  }

  const newPage = Math.max(1, state.page - 1);
  const res2 = await inversionService.list(ctxFromState(state), newPage, PAGE_SIZE, state.filters);
  const items2 = res2?.data?.results ?? [];
  const meta2 = res2?.data?.meta ?? { count: 0, next: null, previous: null, page: newPage, page_size: PAGE_SIZE, total_pages: 1 };

  return { inversiones: items2, meta: meta2, page: newPage };
}

const incompleteContextError = (message: string): ApiError => ({
  success: false,
  message_key: 'context_incomplete',
  message,
});

export const fetchInversiones = createAsyncThunk<
  PagePayload,
  void,
  { state: RootState; rejectValue: ApiError }
>(
  'inversiones/fetch',
  async (_, { getState, rejectWithValue, signal }) => {
    const state = getState().inversiones;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = state;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue(incompleteContextError('Faltan IDs de contexto (huerta/huerta_rentada, temporada o cosecha).'));
    }
    try {
      const res = await inversionService.list(ctxFromState(state), state.page, PAGE_SIZE, state.filters, { signal });
      handleBackendNotification(res);
      return {
        inversiones: res.data.results,
        meta: res.data.meta,
        page: state.page,
      };
    } catch (err: unknown) {
      if (signal.aborted) {
        return rejectWithValue(incompleteContextError('Abortado'));
      }
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const createInversion = createAsyncThunk<
  InversionHuerta,
  InversionHuertaCreateData,
  { state: RootState; rejectValue: ApiError }
>(
  'inversiones/create',
  async (payload, { getState, rejectWithValue }) => {
    const state = getState().inversiones;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = state;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue(incompleteContextError('Contexto incompleto'));
    }
    try {
      const res = await inversionService.create(ctxFromState(state), payload);
      handleBackendNotification(res);
      return res.data.inversion;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const updateInversion = createAsyncThunk<
  InversionHuerta,
  { id: number; payload: InversionHuertaUpdateData },
  { rejectValue: ApiError }
>(
  'inversiones/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await inversionService.update(id, payload);
      handleBackendNotification(res);
      return res.data.inversion;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const archiveInversion = createAsyncThunk<
  { inversion: InversionHuerta; pageData: PagePayload | null },
  number,
  { state: RootState; rejectValue: ApiError }
>(
  'inversiones/archive',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await inversionService.archivar(id);
      handleBackendNotification(res);

      const state = getState().inversiones;
      const estado = state.filters.estado ?? 'activas';

      if (estado === 'todas') {
        return { inversion: res.data.inversion, pageData: null };
      }

      const pageData = await fetchSameOrPrevPageSilently(state);
      return { inversion: res.data.inversion, pageData };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const restoreInversion = createAsyncThunk<
  { inversion: InversionHuerta; pageData: PagePayload | null },
  number,
  { state: RootState; rejectValue: ApiError }
>(
  'inversiones/restore',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await inversionService.restaurar(id);
      handleBackendNotification(res);

      const state = getState().inversiones;
      const estado = state.filters.estado ?? 'activas';

      if (estado === 'todas') {
        return { inversion: res.data.inversion, pageData: null };
      }
      if (estado === 'archivadas') {
        const pageData = await fetchSameOrPrevPageSilently(state);
        return { inversion: res.data.inversion, pageData };
      }
      return { inversion: res.data.inversion, pageData: null };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const deleteInversion = createAsyncThunk<
  { id: number; pageData: PagePayload },
  number,
  { state: RootState; rejectValue: ApiError }
>(
  'inversiones/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await inversionService.remove(id);
      handleBackendNotification(res);

      const state = getState().inversiones;
      const pageData = await fetchSameOrPrevPageSilently(state);
      return { id, pageData };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

const inversionesSlice = createSlice({
  name: 'inversiones',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setContext: (
      state,
      action: PayloadAction<{ huertaId?: number; huertaRentadaId?: number; temporadaId: number; cosechaId: number }>
    ) => {
      state.huertaId = action.payload.huertaId ?? null;
      state.huertaRentadaId = action.payload.huertaRentadaId ?? null;
      state.temporadaId = action.payload.temporadaId;
      state.cosechaId = action.payload.cosechaId;
      state.page = 1;
    },
    setFilters: (state, action: PayloadAction<InversionFilters>) => {
      state.filters = action.payload;
      state.page = 1;
    },
    clear: () => ({ ...initialState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInversiones.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInversiones.fulfilled, (state, { payload }) => {
        state.items = payload.inversiones;
        state.meta = payload.meta;
        state.page = payload.page;
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchInversiones.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = extractApiMessage(payload ?? error, 'Error');
        state.loaded = true;
      })
      .addCase(createInversion.fulfilled, (state, { payload }) => {
        if ((state.filters.estado ?? 'activas') !== 'archivadas') {
          state.items.unshift(payload);
          state.meta.count += 1;
        }
      })
      .addCase(updateInversion.fulfilled, (state, { payload }) => {
        const index = state.items.findIndex((item) => item.id === payload.id);
        if (index !== -1) state.items[index] = payload;
      })
      .addCase(archiveInversion.fulfilled, (state, { payload }) => {
        const estado = state.filters.estado ?? 'activas';
        if (estado === 'todas') {
          const index = state.items.findIndex((item) => item.id === payload.inversion.id);
          if (index !== -1) state.items[index] = payload.inversion;
        } else if (payload.pageData) {
          state.items = payload.pageData.inversiones;
          state.meta = payload.pageData.meta;
          state.page = payload.pageData.page;
        }
      })
      .addCase(restoreInversion.fulfilled, (state, { payload }) => {
        const estado = state.filters.estado ?? 'activas';
        if (estado === 'todas') {
          const index = state.items.findIndex((item) => item.id === payload.inversion.id);
          if (index !== -1) state.items[index] = payload.inversion;
        } else if (estado === 'archivadas' && payload.pageData) {
          state.items = payload.pageData.inversiones;
          state.meta = payload.pageData.meta;
          state.page = payload.pageData.page;
        } else if (estado === 'activas') {
          const index = state.items.findIndex((item) => item.id === payload.inversion.id);
          if (index !== -1) state.items.splice(index, 1);
          state.items.unshift(payload.inversion);
        }
      })
      .addCase(deleteInversion.fulfilled, (state, { payload }) => {
        state.items = payload.pageData.inversiones;
        state.meta = payload.pageData.meta;
        state.page = payload.pageData.page;
      });
  },
});

export const { setPage, setContext, setFilters, clear } = inversionesSlice.actions;
export default inversionesSlice.reducer;
