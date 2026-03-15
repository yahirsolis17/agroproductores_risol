import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { gastosService } from '../../modules/gestion_bodega/services/gastosService';
import { extractApiMessage } from '../api/errorUtils';
import {
  type ApiError,
  extractRejectedTransportPayload,
  isObjectRecord,
} from '../types/apiTypes';
import type { PaginationMeta } from '../../modules/gestion_bodega/types/shared';
import type { CompraMadera } from '../../modules/gestion_bodega/types/gastosTypes';

type ListThunkResult<T> = { items: T[]; meta: PaginationMeta };
type PaginationMetaLike = Partial<PaginationMeta>;

const emptyMeta = (): PaginationMeta => ({
  count: 0,
  next: null,
  previous: null,
  page: 1,
  page_size: 10,
  total_pages: 1,
});

const readNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const readNullableString = (value: unknown, fallback: string | null): string | null => {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return fallback;
};

const normalizeMeta = (value: unknown, fallback: PaginationMeta): PaginationMeta => {
  const meta = isObjectRecord(value) ? (value as PaginationMetaLike) : {};
  const fallbackPage = fallback.page ?? 1;
  const fallbackPageSize = fallback.page_size ?? 10;
  const fallbackTotalPages = fallback.total_pages ?? 1;
  return {
    count: readNumber(meta.count, fallback.count),
    next: readNullableString(meta.next, fallback.next),
    previous: readNullableString(meta.previous, fallback.previous),
    page: readNumber(meta.page, fallbackPage),
    page_size: readNumber(meta.page_size, fallbackPageSize),
    total_pages: readNumber(meta.total_pages, fallbackTotalPages),
  };
};

const unwrapListResponse = <T>(response: unknown, fallback: PaginationMeta): ListThunkResult<T> => {
  const root = isObjectRecord(response) ? response : {};
  const payload = isObjectRecord(root.data) ? root.data : root;

  if (Array.isArray(payload)) {
    const items = payload as T[];
    return {
      items,
      meta: {
        ...fallback,
        count: items.length,
        total_pages: Math.max(1, Math.ceil(items.length / Math.max(fallback.page_size ?? 10, 1))),
      },
    };
  }

  if (!isObjectRecord(payload)) {
    return { items: [], meta: fallback };
  }

  const items = Array.isArray(payload.results) ? (payload.results as T[]) : [];
  return {
    items,
    meta: normalizeMeta(payload.meta, { ...fallback, count: items.length }),
  };
};

const mapError = (err: unknown, fallback: string): ApiError => {
  const transportPayload = extractRejectedTransportPayload(err);
  const payload = isObjectRecord(transportPayload) ? transportPayload : {};
  const rawMessage = payload.message ?? payload.detail ?? payload.error;
  const rawMessageKey = payload.message_key;
  const dataField = isObjectRecord(payload.data) ? payload.data : undefined;

  return {
    success: false,
    message_key: typeof rawMessageKey === 'string' && rawMessageKey.trim() ? rawMessageKey : 'error',
    message: typeof rawMessage === 'string' && rawMessage.trim() ? rawMessage : fallback,
    data: dataField,
  };
};

export interface InventariosFilters {
  page: number;
  page_size: number;
  bodega?: number;
  temporada?: number;
  semana?: number;
}

export interface InventariosState {
  madera: {
    items: CompraMadera[];
    meta: PaginationMeta;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string | null;
  };
  filters: InventariosFilters;
  saving: boolean;
}

const initialState: InventariosState = {
  madera: { items: [], meta: emptyMeta(), status: 'idle', error: null },
  filters: { page: 1, page_size: 10 },
  saving: false,
};

export const fetchInventarioMadera = createAsyncThunk<
  ListThunkResult<CompraMadera>,
  void,
  { state: RootState; rejectValue: ApiError }
>(
  'inventarios/fetchMadera',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { filters } = getState().inventarios;
      if (!filters.bodega || !filters.temporada) {
        return { items: [], meta: initialState.madera.meta };
      }
      const params = { ...filters, hay_stock: true };
      const resp = await gastosService.compras.list(params);
      return unwrapListResponse<CompraMadera>(resp, initialState.madera.meta);
    } catch (err: unknown) {
      return rejectWithValue(mapError(err, 'Error cargando inventario de madera'));
    }
  }
);

const inventariosSlice = createSlice({
  name: 'inventarios',
  initialState,
  reducers: {
    setBodega(state, action: PayloadAction<number | undefined>) {
      state.filters.bodega = action.payload;
      state.filters.page = 1;
    },
    setTemporada(state, action: PayloadAction<number | undefined>) {
      state.filters.temporada = action.payload;
      state.filters.page = 1;
    },
    setSemana(state, action: PayloadAction<number | undefined>) {
      state.filters.semana = action.payload;
      state.filters.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.filters.page_size = action.payload;
      state.filters.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchInventarioMadera.pending, (state) => {
      state.madera.status = 'loading';
      state.madera.error = null;
    });
    builder.addCase(fetchInventarioMadera.fulfilled, (state, action) => {
      state.madera.status = 'succeeded';
      state.madera.items = action.payload.items;
      state.madera.meta = action.payload.meta;
    });
    builder.addCase(fetchInventarioMadera.rejected, (state, action) => {
      state.madera.status = 'failed';
      state.madera.error = extractApiMessage(action.payload ?? action.error, 'Error desconocido');
    });
  },
});

export const { setBodega, setTemporada, setSemana, setPage, setPageSize } = inventariosSlice.actions;
export default inventariosSlice.reducer;
