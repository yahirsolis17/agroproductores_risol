import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriaInversionService } from '../../modules/gestion_huerta/services/categoriaInversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { CategoriaInversion, CategoriaInversionCreate, CategoriaInversionUpdate } from '../../modules/gestion_huerta/types/categoriaInversionTypes';

interface PaginationMeta { count: number; next: string | null; previous: string | null; }
interface CategoriaInversionState {
  list: CategoriaInversion[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  search?: string;
  meta: PaginationMeta;
}

const initialState: CategoriaInversionState = {
  list: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  search: '',
  meta: { count: 0, next: null, previous: null },
};

export const fetchCategoriasInversion = createAsyncThunk<
  { categorias: CategoriaInversion[]; meta: PaginationMeta; page: number },
  { page: number; search?: string },
  { rejectValue: string }
>(
  'categoriasInversion/fetchAll',
  async ({ page, search }, { rejectWithValue }) => {
    try {
      const { categorias, meta } = await categoriaInversionService.list(page, search);
      return { categorias, meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al cargar categorías');
    }
  }
);

export const createCategoriaInversion = createAsyncThunk<
  CategoriaInversion,
  CategoriaInversionCreate,
  { rejectValue: string }
>(
  'categoriasInversion/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.create(payload);
      handleBackendNotification(res);
      return res.data.categoria as CategoriaInversion;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al crear categoría');
    }
  }
);

export const updateCategoriaInversion = createAsyncThunk<
  CategoriaInversion,
  { id: number; payload: CategoriaInversionUpdate },
  { rejectValue: string }
>(
  'categoriasInversion/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.update(id, payload);
      handleBackendNotification(res);
      return res.data.categoria as CategoriaInversion;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al actualizar categoría');
    }
  }
);

export const deleteCategoriaInversion = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>(
  'categoriasInversion/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al eliminar categoría');
    }
  }
);

const categoriasInversionSlice = createSlice({
  name: 'categoriasInversion',
  initialState,
  reducers: {
    setCPage:   (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setCSearch: (s, a: PayloadAction<string | undefined>) => { s.search = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    b.addCase(fetchCategoriasInversion.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchCategoriasInversion.fulfilled, (s, { payload }) => {
      s.list = payload.categorias;
      s.meta = payload.meta;
      s.page = payload.page;
      s.loading = false;
      s.loaded = true;
    });
    b.addCase(fetchCategoriasInversion.rejected, (s, { payload, error }) => {
      s.loading = false; s.loaded = true; s.error = payload ?? error.message ?? 'Error';
    });

    b.addCase(createCategoriaInversion.fulfilled, (s, { payload }) => {
      s.list.unshift(payload);
      s.meta.count += 1;
    });

    b.addCase(updateCategoriaInversion.fulfilled, (s, { payload }) => {
      const i = s.list.findIndex(c => c.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });

    b.addCase(deleteCategoriaInversion.fulfilled, (s, { payload: id }) => {
      s.list = s.list.filter(c => c.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });
  },
});

export const { setCPage, setCSearch } = categoriasInversionSlice.actions;
export default categoriasInversionSlice.reducer;
