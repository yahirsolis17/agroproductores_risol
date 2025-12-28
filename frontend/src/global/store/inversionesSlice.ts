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

export type EstadoFiltro = 'activas' | 'archivadas' | 'todas';
export interface InversionFilters extends SvcFilters { }

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

function ctxFromState(s: InversionesState) {
  return {
    huertaId: s.huertaId ?? undefined,
    huertaRentadaId: s.huertaRentadaId ?? undefined,
    temporadaId: s.temporadaId!,
    cosechaId: s.cosechaId!,
  };
}

type PagePayload = { inversiones: InversionHuerta[]; meta: PaginationMeta; page: number };

async function fetchSameOrPrevPageSilently(s: InversionesState): Promise<PagePayload> {
  const res1 = await inversionService.list(ctxFromState(s), s.page, PAGE_SIZE, s.filters);
  const items1 = res1?.data?.results ?? [];
  const meta1 = res1?.data?.meta ?? { count: 0, next: null, previous: null, page: s.page, page_size: PAGE_SIZE, total_pages: 1 };

  if (items1.length > 0 || s.page === 1) {
    return { inversiones: items1, meta: meta1, page: s.page };
  }

  const newPage = Math.max(1, s.page - 1);
  const res2 = await inversionService.list(ctxFromState(s), newPage, PAGE_SIZE, s.filters);
  const items2 = res2?.data?.results ?? [];
  const meta2 = res2?.data?.meta ?? { count: 0, next: null, previous: null, page: newPage, page_size: PAGE_SIZE, total_pages: 1 };

  return { inversiones: items2, meta: meta2, page: newPage };
}

export const fetchInversiones = createAsyncThunk<
  { inversiones: InversionHuerta[]; meta: PaginationMeta; page: number },
  void,
  { state: RootState; rejectValue: string }
>(
  'inversiones/fetch',
  async (_, { getState, rejectWithValue, signal }) => {
    const s = getState().inversiones;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue('Faltan IDs de contexto (huerta/huerta_rentada, temporada o cosecha).');
    }
    try {
      const res = await inversionService.list(ctxFromState(s), s.page, PAGE_SIZE, s.filters, { signal });
      handleBackendNotification(res);
      return {
        inversiones: res.data.results,
        meta: res.data.meta,
        page: s.page,
      };
    } catch (err: unknown) {
      if (signal.aborted) return rejectWithValue('Abortado');
      handleBackendNotification(extractApiError(err));
      return rejectWithValue('Error al cargar inversiones');
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
    const s = getState().inversiones;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue({ success: false, message_key: 'context_incomplete', message: 'Contexto incompleto' });
    }
    try {
      const res = await inversionService.create(ctxFromState(s), payload);
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

      const s = getState().inversiones;
      const estado = s.filters.estado ?? 'activas';

      if (estado === 'todas') {
        return { inversion: res.data.inversion, pageData: null };
      }

      const pageData = await fetchSameOrPrevPageSilently(s);
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

      const s = getState().inversiones;
      const estado = s.filters.estado ?? 'activas';

      if (estado === 'todas') {
        return { inversion: res.data.inversion, pageData: null };
      }
      if (estado === 'archivadas') {
        const pageData = await fetchSameOrPrevPageSilently(s);
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

      const s = getState().inversiones;
      const pageData = await fetchSameOrPrevPageSilently(s);
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
    setPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setContext: (
      s,
      a: PayloadAction<{ huertaId?: number; huertaRentadaId?: number; temporadaId: number; cosechaId: number }>
    ) => {
      s.huertaId = a.payload.huertaId ?? null;
      s.huertaRentadaId = a.payload.huertaRentadaId ?? null;
      s.temporadaId = a.payload.temporadaId;
      s.cosechaId = a.payload.cosechaId;
      s.page = 1;
    },
    setFilters: (s, a: PayloadAction<InversionFilters>) => { s.filters = a.payload; s.page = 1; },
    clear: () => ({ ...initialState }),
  },
  extraReducers: b => {
    b.addCase(fetchInversiones.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchInversiones.fulfilled, (s, { payload }) => {
        s.items = payload.inversiones;
        s.meta = payload.meta;
        s.page = payload.page;
        s.loading = false;
        s.loaded = true;
      })
      .addCase(fetchInversiones.rejected, (s, { payload, error }) => {
        s.loading = false;
        s.error = (payload as string) ?? error.message ?? 'Error';
        s.loaded = true;
      })
      .addCase(createInversion.fulfilled, (s, { payload }) => {
        if ((s.filters.estado ?? 'activas') !== 'archivadas') {
          s.items.unshift(payload);
          s.meta.count += 1;
        }
      })
      .addCase(updateInversion.fulfilled, (s, { payload }) => {
        const i = s.items.findIndex(inv => inv.id === payload.id);
        if (i !== -1) s.items[i] = payload;
      })
      .addCase(archiveInversion.fulfilled, (s, { payload }) => {
        const estado = s.filters.estado ?? 'activas';
        if (estado === 'todas') {
          const i = s.items.findIndex(inv => inv.id === payload.inversion.id);
          if (i !== -1) s.items[i] = payload.inversion;
        } else if (payload.pageData) {
          s.items = payload.pageData.inversiones;
          s.meta = payload.pageData.meta;
          s.page = payload.pageData.page;
        }
      })
      .addCase(restoreInversion.fulfilled, (s, { payload }) => {
        const estado = s.filters.estado ?? 'activas';
        if (estado === 'todas') {
          const i = s.items.findIndex(inv => inv.id === payload.inversion.id);
          if (i !== -1) s.items[i] = payload.inversion;
        } else if (estado === 'archivadas' && payload.pageData) {
          s.items = payload.pageData.inversiones;
          s.meta = payload.pageData.meta;
          s.page = payload.pageData.page;
        } else if (estado === 'activas') {
          const i = s.items.findIndex(inv => inv.id === payload.inversion.id);
          if (i !== -1) s.items.splice(i, 1);
          s.items.unshift(payload.inversion);
        }
      })
      .addCase(deleteInversion.fulfilled, (s, { payload }) => {
        s.items = payload.pageData.inversiones;
        s.meta = payload.pageData.meta;
        s.page = payload.pageData.page;
      });
  }
});

export const { setPage, setContext, setFilters, clear } = inversionesSlice.actions;
export default inversionesSlice.reducer;
