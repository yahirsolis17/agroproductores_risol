// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriaInversionService } from '../../modules/gestion_huerta/services/categoriaInversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  CategoriaInversion,
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../../modules/gestion_huerta/types/categoriaInversionTypes';
import { PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { ApiError, extractApiError } from '../types/apiTypes';

interface CategoriaState {
  items: CategoriaInversion[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  meta: PaginationMeta;
}

const initialState: CategoriaState = {
  items: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 },
};

/* ───── Fetch listado activo ───── */
export const fetchCategorias = createAsyncThunk<
  { categorias: CategoriaInversion[]; meta: PaginationMeta; page: number },
  number,
  { rejectValue: ApiError }
>(
  'categoriasInversion/fetch',
  async (page = 1, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.listActive(page);
      return { categorias: res.data.results, meta: res.data.meta, page };
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

/* ───── CRUD Thunks (propagando ENVELOPE del backend) ───── */
export const createCategoria = createAsyncThunk<
  CategoriaInversion,
  CategoriaInversionCreateData,
  { rejectValue: ApiError }
>(
  'categoriasInversion/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.create(payload);
      handleBackendNotification(res);
      return res.data.categoria as CategoriaInversion;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const updateCategoria = createAsyncThunk<
  CategoriaInversion,
  { id: number; payload: CategoriaInversionUpdateData },
  { rejectValue: ApiError }
>(
  'categoriasInversion/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.update(id, payload);
      handleBackendNotification(res);
      return res.data.categoria as CategoriaInversion;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const archiveCategoria = createAsyncThunk<
  CategoriaInversion,
  number,
  { rejectValue: ApiError }
>(
  'categoriasInversion/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.archive(id);
      handleBackendNotification(res);
      return res.data.categoria as CategoriaInversion;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const restoreCategoria = createAsyncThunk<
  CategoriaInversion,
  number,
  { rejectValue: ApiError }
>(
  'categoriasInversion/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.restore(id);
      handleBackendNotification(res);
      return res.data.categoria as CategoriaInversion;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

export const deleteCategoria = createAsyncThunk<
  number,
  number,
  { rejectValue: ApiError }
>(
  'categoriasInversion/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.remove(id);
      handleBackendNotification(res);
      return id;
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      handleBackendNotification(apiError);
      return rejectWithValue(apiError);
    }
  }
);

/* ───── Slice ───── */
const categoriaSlice = createSlice({
  name: 'categoriasInversion',
  initialState,
  reducers: {
    setPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
  },
  extraReducers: (b) => {
    /* fetch */
    b.addCase(fetchCategorias.pending, s => { s.loading = true; s.error = null; });
    b.addCase(fetchCategorias.fulfilled, (s, { payload }) => {
      s.items = payload.categorias;
      s.meta = payload.meta;
      s.page = payload.page;
      s.loading = false;
      s.loaded = true;
    });
    b.addCase(fetchCategorias.rejected, (s, { payload, error }) => {
      s.loading = false;
      s.loaded = true;
      const msg = payload?.message ?? error.message ?? 'Error';
      s.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
    });

    /* create */
    b.addCase(createCategoria.fulfilled, (s, { payload }) => {
      s.items.unshift(payload);
      s.meta.count += 1;
    });

    /* update */
    b.addCase(updateCategoria.fulfilled, (s, { payload }) => {
      const i = s.items.findIndex(c => c.id === payload.id);
      if (i !== -1) s.items[i] = payload;
    });

    /* archive / restore / delete */
    b.addCase(archiveCategoria.fulfilled, (s, { payload }) => {
      s.items = s.items.filter(c => c.id !== payload.id);
    });
    b.addCase(restoreCategoria.fulfilled, (s, { payload }) => {
      s.items.unshift(payload);
    });
    b.addCase(deleteCategoria.fulfilled, (s, { payload: id }) => {
      s.items = s.items.filter(c => c.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });
  },
});

export const { setPage } = categoriaSlice.actions;
export default categoriaSlice.reducer;
