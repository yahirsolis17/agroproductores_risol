// src/global/store/categoriaInversionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriaInversionService } from '../../modules/gestion_huerta/services/categoriaInversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  CategoriaInversion,
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../../modules/gestion_huerta/types/categoriaInversionTypes';

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

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

// ─── THUNKS ─────────────────────────────────────────────────────────────

/** Trae sólo las categorías activas paginadas */
export const fetchCategorias = createAsyncThunk<
  { categorias: CategoriaInversion[]; meta: PaginationMeta; page: number },
  number,
  { rejectValue: string }
>(
  'categoriasInversion/fetch',
  async (page, { rejectWithValue }) => {
    try {
      const data = await categoriaInversionService.listActive(page);
      return { categorias: data.categorias, meta: data.meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al cargar categorías');
    }
  }
);

/** Crea una categoría nueva */
export const createCategoria = createAsyncThunk<
  CategoriaInversion,
  CategoriaInversionCreateData,
  { rejectValue: string }
>(
  'categoriasInversion/create',
  async (payload, { rejectWithValue }) => {
    try {
      const cat = await categoriaInversionService.create(payload);
      handleBackendNotification({ success: true, message_key: 'categoria_create_success' });
      return cat;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al crear categoría');
    }
  }
);

/** Actualiza una categoría existente */
export const updateCategoria = createAsyncThunk<
  CategoriaInversion,
  { id: number; payload: CategoriaInversionUpdateData },
  { rejectValue: string }
>(
  'categoriasInversion/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const cat = await categoriaInversionService.update(id, payload);
      handleBackendNotification({ success: true, message_key: 'categoria_update_success' });
      return cat;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al actualizar categoría');
    }
  }
);

/** Archiva (soft-delete) una categoría */
export const archiveCategoria = createAsyncThunk<
  CategoriaInversion,
  number,
  { rejectValue: string }
>(
  'categoriasInversion/archive',
  async (id, { rejectWithValue }) => {
    try {
      const cat = await categoriaInversionService.archive(id);
      handleBackendNotification({ success: true, message_key: 'categoria_archivada' });
      return cat;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al archivar categoría');
    }
  }
);

/** Restaura una categoría archivada */
export const restoreCategoria = createAsyncThunk<
  CategoriaInversion,
  number,
  { rejectValue: string }
>(
  'categoriasInversion/restore',
  async (id, { rejectWithValue }) => {
    try {
      const cat = await categoriaInversionService.restore(id);
      handleBackendNotification({ success: true, message_key: 'categoria_restaurada' });
      return cat;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al restaurar categoría');
    }
  }
);

/** Elimina definitivamente una categoría */
export const deleteCategoria = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>(
  'categoriasInversion/delete',
  async (id, { rejectWithValue }) => {
    try {
      await categoriaInversionService.remove(id);
      handleBackendNotification({ success: true, message_key: 'categoria_delete_success' });
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al eliminar categoría');
    }
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────
const categoriaSlice = createSlice({
  name: 'categoriasInversion',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      // FETCH
      .addCase(fetchCategorias.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategorias.fulfilled, (state, { payload }) => {
        state.list    = payload.categorias;
        state.meta    = payload.meta;
        state.page    = payload.page;
        state.loading = false;
        state.loaded  = true;
      })
      .addCase(fetchCategorias.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload ?? error.message ?? 'Error al cargar categorías';
        state.loaded  = true;
      })

      // CREATE
      .addCase(createCategoria.fulfilled, (state, { payload }) => {
        state.list.unshift(payload);
        state.meta.count += 1;
      })

      // UPDATE
      .addCase(updateCategoria.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex(c => c.id === payload.id);
        if (idx !== -1) state.list[idx] = payload;
      })

      // ARCHIVE
      .addCase(archiveCategoria.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(c => c.id !== payload.id);
      })

      // RESTORE
      .addCase(restoreCategoria.fulfilled, (state, { payload }) => {
        state.list.unshift(payload);
      })

      // DELETE
      .addCase(deleteCategoria.fulfilled, (state, { payload: id }) => {
        state.list = state.list.filter(c => c.id !== id);
        if (state.meta.count > 0) state.meta.count -= 1;
      });
  },
});

export const { setPage } = categoriaSlice.actions;
export default categoriaSlice.reducer;
