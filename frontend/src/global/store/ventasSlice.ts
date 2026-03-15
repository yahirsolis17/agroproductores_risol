import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ventaService, VentaFilters as SvcFilters } from '../../modules/gestion_huerta/services/ventaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  VentaHuerta,
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../../modules/gestion_huerta/types/ventaTypes';
import type { RootState } from './store';
import { PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { ApiError, extractApiError } from '../types/apiTypes';
import { extractApiMessage } from '../api/errorUtils';

export type EstadoFiltro = 'activas' | 'archivadas' | 'todas';
export type VentaFilters = SvcFilters;

interface VentasState {
  items: VentaHuerta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  meta: PaginationMeta;
  huertaId: number | null;
  huertaRentadaId: number | null;
  temporadaId: number | null;
  cosechaId: number | null;
  filters: VentaFilters;
}

const PAGE_SIZE = 10;

const initialState: VentasState = {
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

function ctxFromState(state: VentasState) {
  return {
    huertaId: state.huertaId ?? undefined,
    huertaRentadaId: state.huertaRentadaId ?? undefined,
    temporadaId: state.temporadaId!,
    cosechaId: state.cosechaId!,
  };
}

type PagePayload = { ventas: VentaHuerta[]; meta: PaginationMeta; page: number };

async function fetchSameOrPrevPageSilently(state: VentasState): Promise<PagePayload> {
  const res1 = await ventaService.list(ctxFromState(state), state.page, PAGE_SIZE, state.filters);
  const items1 = res1?.data?.results ?? [];
  const meta1 = res1?.data?.meta ?? { count: 0, next: null, previous: null, page: state.page, page_size: PAGE_SIZE, total_pages: 1 };

  if (items1.length > 0 || state.page === 1) {
    return { ventas: items1, meta: meta1, page: state.page };
  }

  const newPage = Math.max(1, state.page - 1);
  const res2 = await ventaService.list(ctxFromState(state), newPage, PAGE_SIZE, state.filters);
  const items2 = res2?.data?.results ?? [];
  const meta2 = res2?.data?.meta ?? { count: 0, next: null, previous: null, page: newPage, page_size: PAGE_SIZE, total_pages: 1 };

  return { ventas: items2, meta: meta2, page: newPage };
}

const incompleteContextError = (message: string): ApiError => ({
  success: false,
  message_key: 'context_incomplete',
  message,
});

export const fetchVentas = createAsyncThunk<
  PagePayload,
  void,
  { state: RootState; rejectValue: ApiError }
>(
  'ventas/fetch',
  async (_, { getState, rejectWithValue }) => {
    const state = getState().ventas;
    const { temporadaId, cosechaId } = state;
    if (!temporadaId || !cosechaId) {
      return rejectWithValue(incompleteContextError('Faltan IDs de contexto (temporada o cosecha).'));
    }
    try {
      const res = await ventaService.list(ctxFromState(state), state.page, PAGE_SIZE, state.filters);
      handleBackendNotification(res);
      return { ventas: res.data.results, meta: res.data.meta, page: state.page };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const createVenta = createAsyncThunk<
  VentaHuerta,
  VentaHuertaCreateData,
  { state: RootState; rejectValue: ApiError }
>(
  'ventas/create',
  async (payload, { getState, rejectWithValue }) => {
    const state = getState().ventas;
    const { temporadaId, cosechaId } = state;
    if (!temporadaId || !cosechaId) {
      return rejectWithValue(incompleteContextError('Contexto incompleto'));
    }
    try {
      const res = await ventaService.create(ctxFromState(state), payload);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const updateVenta = createAsyncThunk<
  VentaHuerta,
  { id: number; payload: VentaHuertaUpdateData },
  { rejectValue: ApiError }
>(
  'ventas/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await ventaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const archiveVenta = createAsyncThunk<
  { venta: VentaHuerta; pageData: PagePayload | null },
  number,
  { state: RootState; rejectValue: ApiError }
>(
  'ventas/archive',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await ventaService.archivar(id);
      handleBackendNotification(res);

      const state = getState().ventas;
      const estado = state.filters.estado ?? 'activas';

      if (estado === 'todas') {
        return { venta: res.data.venta, pageData: null };
      }
      const pageData = await fetchSameOrPrevPageSilently(state);
      return { venta: res.data.venta, pageData };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const restoreVenta = createAsyncThunk<
  { venta: VentaHuerta; pageData: PagePayload | null },
  number,
  { state: RootState; rejectValue: ApiError }
>(
  'ventas/restore',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await ventaService.restaurar(id);
      handleBackendNotification(res);

      const state = getState().ventas;
      const estado = state.filters.estado ?? 'activas';

      if (estado === 'todas') {
        return { venta: res.data.venta, pageData: null };
      }
      if (estado === 'archivadas') {
        const pageData = await fetchSameOrPrevPageSilently(state);
        return { venta: res.data.venta, pageData };
      }
      return { venta: res.data.venta, pageData: null };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const deleteVenta = createAsyncThunk<
  { id: number; pageData: PagePayload },
  number,
  { state: RootState; rejectValue: ApiError }
>(
  'ventas/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await ventaService.remove(id);
      handleBackendNotification(res);

      const state = getState().ventas;
      const pageData = await fetchSameOrPrevPageSilently(state);
      return { id, pageData };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

const ventasSlice = createSlice({
  name: 'ventas',
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
    setFilters: (state, action: PayloadAction<VentaFilters>) => {
      state.filters = action.payload;
      state.page = 1;
    },
    clear: () => ({ ...initialState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVentas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVentas.fulfilled, (state, { payload }) => {
        state.items = payload.ventas;
        state.meta = payload.meta;
        state.page = payload.page;
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchVentas.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = extractApiMessage(payload ?? error, 'Error');
        state.loaded = true;
      })
      .addCase(createVenta.fulfilled, (state, { payload }) => {
        const estado = state.filters.estado ?? 'activas';
        if (estado === 'activas' || estado === 'todas') {
          state.items.unshift(payload);
          state.meta.count += 1;
        }
      })
      .addCase(updateVenta.fulfilled, (state, { payload }) => {
        const index = state.items.findIndex((item) => item.id === payload.id);
        if (index !== -1) state.items[index] = payload;
      })
      .addCase(archiveVenta.fulfilled, (state, { payload }) => {
        const estado = state.filters.estado ?? 'activas';
        if (estado === 'todas') {
          const index = state.items.findIndex((item) => item.id === payload.venta.id);
          if (index !== -1) state.items[index] = payload.venta;
        } else if (payload.pageData) {
          state.items = payload.pageData.ventas;
          state.meta = payload.pageData.meta;
          state.page = payload.pageData.page;
        }
      })
      .addCase(restoreVenta.fulfilled, (state, { payload }) => {
        const estado = state.filters.estado ?? 'activas';
        if (estado === 'todas') {
          const index = state.items.findIndex((item) => item.id === payload.venta.id);
          if (index !== -1) state.items[index] = payload.venta;
        } else if (estado === 'archivadas' && payload.pageData) {
          state.items = payload.pageData.ventas;
          state.meta = payload.pageData.meta;
          state.page = payload.pageData.page;
        } else if (estado === 'activas') {
          const index = state.items.findIndex((item) => item.id === payload.venta.id);
          if (index !== -1) state.items.splice(index, 1);
          state.items.unshift(payload.venta);
        }
      })
      .addCase(deleteVenta.fulfilled, (state, { payload }) => {
        state.items = payload.pageData.ventas;
        state.meta = payload.pageData.meta;
        state.page = payload.pageData.page;
      });
  },
});

export const { setPage, setContext, setFilters, clear } = ventasSlice.actions;
export default ventasSlice.reducer;
