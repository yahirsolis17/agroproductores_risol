import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriaInversionService } from '../../modules/gestion_huerta/services/categoriaInversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  CategoriaInversion,
  CategoriaInversionCreate,
  CategoriaInversionUpdate,
} from '../../modules/gestion_huerta/types/categoriaInversionTypes';

interface PaginationMeta { count: number; next: string | null; previous: string | null; }

interface CategoriaState {
  list:   CategoriaInversion[];
  loading: boolean;
  loaded:  boolean;
  error:   string | null;
  // UI state
  page:    number;
  search?: string;
  showAll: boolean; // ← activas vs activas+archivadas
  meta:    PaginationMeta;
}

const initialState: CategoriaState = {
  list: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  search: '',
  showAll: false,
  meta: { count: 0, next: null, previous: null },
};

/* ───────────────────────────────────────────────
 * THUNKS
 * ─────────────────────────────────────────────── */
export const fetchCategorias = createAsyncThunk<
  { categorias: CategoriaInversion[]; meta: PaginationMeta; page: number },
  { page: number; search?: string; showAll?: boolean },
  { rejectValue: string }
>(
  'categorias/fetch',
  async ({ page, search, showAll }, { rejectWithValue }) => {
    try {
      const svc = showAll ? categoriaInversionService.listAll : categoriaInversionService.list;
      const { categorias, meta } = await svc(page, search);
      return { categorias, meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al cargar categorías');
    }
  },
);

export const createCategoria = createAsyncThunk<
  CategoriaInversion,
  CategoriaInversionCreate,
  { rejectValue: string }
>(
  'categorias/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.create(payload);
      handleBackendNotification(res);
      return res.data.categoria;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al crear categoría');
    }
  },
);

export const updateCategoria = createAsyncThunk<
  CategoriaInversion,
  { id: number; payload: CategoriaInversionUpdate },
  { rejectValue: string }
>(
  'categorias/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.update(id, payload);
      handleBackendNotification(res);
      return res.data.categoria;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al actualizar categoría');
    }
  },
);

export const deleteCategoria = createAsyncThunk<number, number, { rejectValue: string }>(
  'categorias/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al eliminar categoría');
    }
  },
);

export const archiveCategoria = createAsyncThunk<CategoriaInversion, number, { rejectValue: string }>(
  'categorias/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.archivar(id);
      handleBackendNotification(res);
      return res.data.categoria;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al archivar categoría');
    }
  },
);

export const restoreCategoria = createAsyncThunk<CategoriaInversion, number, { rejectValue: string }>(
  'categorias/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.restaurar(id);
      handleBackendNotification(res);
      return res.data.categoria;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al restaurar categoría');
    }
  },
);

/* ───────────────────────────────────────────────
 * SLICE
 * ─────────────────────────────────────────────── */
const categoriasSlice = createSlice({
  name: 'categorias',
  initialState,
  reducers: {
    setCPage:     (s, a: PayloadAction<number>)  => { s.page = a.payload; },
    setCSearch:   (s, a: PayloadAction<string | undefined>) => { s.search = a.payload; s.page = 1; },
    toggleShowAll:(s) => { s.showAll = !s.showAll; s.page = 1; },
  },
  extraReducers: (b) => {
    /* fetch */
    b.addCase(fetchCategorias.pending,  (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchCategorias.fulfilled,(s, a) => {
      s.list = a.payload.categorias;
      s.meta = a.payload.meta;
      s.page = a.payload.page;
      s.loading = false;
      s.loaded  = true;
    });
    b.addCase(fetchCategorias.rejected, (s, a) => {
      s.loading = false; s.loaded = true; s.error = a.payload ?? a.error.message ?? 'Error';
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

    /* delete */
    b.addCase(deleteCategoria.fulfilled, (s, { payload: id }) => {
      s.list = s.list.filter(c => c.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    /* archive / restore */
    const upsert = (s: CategoriaState, cat: CategoriaInversion) => {
      const i = s.list.findIndex(c => c.id === cat.id);
      if (i !== -1) s.list[i] = cat;
    };
    b.addCase(archiveCategoria.fulfilled, (s, { payload }) => {
      if (!s.showAll) s.list = s.list.filter(c => c.id !== payload.id);
      else upsert(s, payload);
    });
    b.addCase(restoreCategoria.fulfilled, (s, { payload }) => {
      if (!s.showAll) s.list.unshift(payload);
      else upsert(s, payload);
    });
  },
});

export const { setCPage, setCSearch, toggleShowAll } = categoriasSlice.actions;
export default categoriasSlice.reducer;
