import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { gastosService } from '../../modules/gestion_bodega/services/gastosService';
import { extractApiMessage } from '../api/errorUtils';
import {
  type ApiError,
  type BackendResponse,
  extractRejectedTransportPayload,
  isObjectRecord,
} from '../types/apiTypes';
import type { PaginationMeta } from '../../modules/gestion_bodega/types/shared';
import type { Consumible, CompraMadera } from '../../modules/gestion_bodega/types/gastosTypes';

type MutationPayload = Record<string, unknown>;
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

export interface GastosFilters {
  page: number;
  page_size: number;
  bodega?: number;
  temporada?: number;
  semana?: number;
}

export interface GastosState {
  comprasMadera: {
    items: CompraMadera[];
    meta: PaginationMeta;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string | null;
  };
  consumibles: {
    items: Consumible[];
    meta: PaginationMeta;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string | null;
  };
  filters: GastosFilters;
  saving: boolean;
}

const initialState: GastosState = {
  comprasMadera: { items: [], meta: emptyMeta(), status: 'idle' },
  consumibles: { items: [], meta: emptyMeta(), status: 'idle' },
  filters: { page: 1, page_size: 10 },
  saving: false,
};

export const fetchComprasMadera = createAsyncThunk<
  ListThunkResult<CompraMadera>,
  void,
  { state: RootState; rejectValue: ApiError }
>(
  'gastos/fetchComprasMadera',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { filters } = getState().gastos;
      if (!filters.bodega || !filters.temporada) {
        return { items: [], meta: initialState.comprasMadera.meta };
      }
      const resp = await gastosService.compras.list(filters);
      return unwrapListResponse<CompraMadera>(resp, initialState.comprasMadera.meta);
    } catch (err: unknown) {
      return rejectWithValue(mapError(err, 'Error cargando compras de madera'));
    }
  }
);

export const fetchConsumibles = createAsyncThunk<
  ListThunkResult<Consumible>,
  void,
  { state: RootState; rejectValue: ApiError }
>(
  'gastos/fetchConsumibles',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { filters } = getState().gastos;
      if (!filters.bodega || !filters.temporada) {
        return { items: [], meta: initialState.consumibles.meta };
      }
      const resp = await gastosService.consumibles.list(filters);
      return unwrapListResponse<Consumible>(resp, initialState.consumibles.meta);
    } catch (err: unknown) {
      return rejectWithValue(mapError(err, 'Error cargando consumibles'));
    }
  }
);

export const createConsumibleThunk = createAsyncThunk<
  BackendResponse<unknown>,
  MutationPayload,
  { rejectValue: ApiError }
>('gastos/createConsumible', async (payload, { rejectWithValue }) => {
  try {
    return await gastosService.consumibles.create(payload);
  } catch (err: unknown) {
    return rejectWithValue(mapError(err, 'Error creando consumible'));
  }
});

export const updateConsumibleThunk = createAsyncThunk<
  BackendResponse<unknown>,
  { id: number; data: MutationPayload },
  { rejectValue: ApiError }
>('gastos/updateConsumible', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await gastosService.consumibles.update(id, data);
  } catch (err: unknown) {
    return rejectWithValue(mapError(err, 'Error actualizando consumible'));
  }
});

export const createCompraMaderaThunk = createAsyncThunk<
  BackendResponse<unknown>,
  MutationPayload,
  { rejectValue: ApiError }
>('gastos/createCompraMadera', async (payload, { rejectWithValue }) => {
  try {
    return await gastosService.compras.create(payload);
  } catch (err: unknown) {
    return rejectWithValue(mapError(err, 'Error creando compra de madera'));
  }
});

export const updateCompraMaderaThunk = createAsyncThunk<
  BackendResponse<unknown>,
  { id: number; data: MutationPayload },
  { rejectValue: ApiError }
>('gastos/updateCompraMadera', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await gastosService.compras.update(id, data);
  } catch (err: unknown) {
    return rejectWithValue(mapError(err, 'Error actualizando compra de madera'));
  }
});

export const createAbonoMaderaThunk = createAsyncThunk<
  BackendResponse<unknown>,
  { id: number; payload: MutationPayload },
  { rejectValue: ApiError }
>('gastos/crearAbono', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await gastosService.compras.abonos(id, payload);
  } catch (err: unknown) {
    return rejectWithValue(mapError(err, 'Error creando abono de madera'));
  }
});

const gastosSlice = createSlice({
  name: 'gastos',
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
    builder.addCase(fetchComprasMadera.pending, (state) => {
      state.comprasMadera.status = 'loading';
    });
    builder.addCase(fetchComprasMadera.fulfilled, (state, action) => {
      state.comprasMadera.status = 'succeeded';
      state.comprasMadera.items = action.payload.items;
      state.comprasMadera.meta = action.payload.meta;
    });
    builder.addCase(fetchComprasMadera.rejected, (state, action) => {
      state.comprasMadera.status = 'failed';
      state.comprasMadera.error = extractApiMessage(action.payload ?? action.error, 'Error');
    });

    builder.addCase(fetchConsumibles.pending, (state) => {
      state.consumibles.status = 'loading';
    });
    builder.addCase(fetchConsumibles.fulfilled, (state, action) => {
      state.consumibles.status = 'succeeded';
      state.consumibles.items = action.payload.items;
      state.consumibles.meta = action.payload.meta;
    });
    builder.addCase(fetchConsumibles.rejected, (state, action) => {
      state.consumibles.status = 'failed';
      state.consumibles.error = extractApiMessage(action.payload ?? action.error, 'Error');
    });

    builder.addMatcher(
      (action) => action.type.startsWith('gastos/') && action.type.endsWith('/pending') && action.type.includes('create'),
      (state) => {
        state.saving = true;
      }
    );
    builder.addMatcher(
      (action) => action.type.startsWith('gastos/') && (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected')) && action.type.includes('create'),
      (state) => {
        state.saving = false;
      }
    );
  },
});

export const { setBodega, setTemporada, setSemana, setPage, setPageSize } = gastosSlice.actions;
export default gastosSlice.reducer;
