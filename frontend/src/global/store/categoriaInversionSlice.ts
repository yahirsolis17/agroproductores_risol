import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriaInversionService } from '../../modules/gestion_huerta/services/categoriaInversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  CategoriaInversion,
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../../modules/gestion_huerta/types/categoriaInversionTypes';

interface PaginationMeta { count: number; next: string | null; previous: string | null; }

interface CategoriaState {
  list:    CategoriaInversion[];
  loading: boolean;
  loaded:  boolean;
  error:   string | null;
  page:    number;
  meta:    PaginationMeta;
}

const initialState: CategoriaState = {
  list:    [],
  loading: false,
  loaded:  false,
  error:   null,
  page:    1,
  meta:    { count: 0, next: null, previous: null },
};

/* ───── Fetch listado activo ───── */
export const fetchCategorias = createAsyncThunk<
  { categorias: CategoriaInversion[]; meta: PaginationMeta; page: number },
  number,
  { rejectValue: any }
>(
  'categoriasInversion/fetch',
  async (page = 1, { rejectWithValue }) => {
    try {
      const { categorias, meta } = await categoriaInversionService.listActive(page);
      return { categorias, meta, page };
    } catch (err: any) {
      const be = err?.response?.data || err?.data || err;
      handleBackendNotification(be);
      return rejectWithValue(be);
    }
  }
);

/* ───── CRUD Thunks (propagando ENVELOPE del backend) ───── */
export const createCategoria = createAsyncThunk<
  CategoriaInversion,
  CategoriaInversionCreateData,
  { rejectValue: any }
>(
  'categoriasInversion/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.create(payload);
      handleBackendNotification(res);
      const cat = (res.data as any).categoria ?? (res.data as any).categoria_inversion;
      return cat as CategoriaInversion;
    } catch (err: any) {
      const be = err?.response?.data || err?.data || err;
      handleBackendNotification(be);
      return rejectWithValue(be); // ← propagamos errores de campo
    }
  }
);

export const updateCategoria = createAsyncThunk<
  CategoriaInversion,
  { id: number; payload: CategoriaInversionUpdateData },
  { rejectValue: any }
>(
  'categoriasInversion/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.update(id, payload);
      handleBackendNotification(res);
      const cat = (res.data as any).categoria ?? (res.data as any).categoria_inversion;
      return cat as CategoriaInversion;
    } catch (err: any) {
      const be = err?.response?.data || err?.data || err;
      handleBackendNotification(be);
      return rejectWithValue(be);
    }
  }
);

export const archiveCategoria = createAsyncThunk<
  CategoriaInversion,
  number,
  { rejectValue: any }
>(
  'categoriasInversion/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.archive(id);
      handleBackendNotification(res);
      const cat = (res.data as any).categoria ?? (res.data as any).categoria_inversion;
      return cat as CategoriaInversion;
    } catch (err: any) {
      const be = err?.response?.data || err?.data || err;
      handleBackendNotification(be);
      return rejectWithValue(be);
    }
  }
);

export const restoreCategoria = createAsyncThunk<
  CategoriaInversion,
  number,
  { rejectValue: any }
>(
  'categoriasInversion/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.restore(id);
      handleBackendNotification(res);
      const cat = (res.data as any).categoria ?? (res.data as any).categoria_inversion;
      return cat as CategoriaInversion;
    } catch (err: any) {
      const be = err?.response?.data || err?.data || err;
      handleBackendNotification(be);
      return rejectWithValue(be);
    }
  }
);

export const deleteCategoria = createAsyncThunk<
  number,
  number,
  { rejectValue: any }
>(
  'categoriasInversion/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.remove(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      const be = err?.response?.data || err?.data || err;
      handleBackendNotification(be);
      return rejectWithValue(be);
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
    b.addCase(fetchCategorias.pending,   s => { s.loading = true; s.error = null; });
    b.addCase(fetchCategorias.fulfilled, (s, { payload }) => {
      s.list = payload.categorias;
      s.meta = payload.meta;
      s.page = payload.page;
      s.loading = false;
      s.loaded  = true;
    });
    b.addCase(fetchCategorias.rejected,  (s, { payload, error }) => {
      s.loading = false;
      s.loaded  = true;
      s.error   = (payload as any)?.message ?? error.message ?? 'Error';
    });

    /* create */
    b.addCase(createCategoria.fulfilled, (s, { payload }) => {
      s.list.unshift(payload);
      s.meta.count += 1;
    });

    /* update */
    b.addCase(updateCategoria.fulfilled, (s, { payload }) => {
      const i = s.list.findIndex(c => c.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });

    /* archive / restore / delete */
    b.addCase(archiveCategoria.fulfilled, (s, { payload }) => {
      s.list = s.list.filter(c => c.id !== payload.id);
    });
    b.addCase(restoreCategoria.fulfilled, (s, { payload }) => {
      s.list.unshift(payload);
    });
    b.addCase(deleteCategoria.fulfilled, (s, { payload: id }) => {
      s.list = s.list.filter(c => c.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });
  },
});

export const { setPage } = categoriaSlice.actions;
export default categoriaSlice.reducer;
