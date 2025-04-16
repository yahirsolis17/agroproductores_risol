// src/global/store/categoriaInversionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriaInversionService, CategoriaInversion } from '../../modules/gestion_huerta/services/categoriaInversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';

interface CategoriaInversionState {
  list: CategoriaInversion[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoriaInversionState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchCategoriasInversion = createAsyncThunk(
  'categoriasInversion/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.list();
      //handleBackendNotification(res);
      return res.data.categorias as CategoriaInversion[];
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al listar categorías de inversión');
    }
  }
);

export const createCategoriaInversion = createAsyncThunk(
  'categoriasInversion/create',
  async (payload: { nombre: string }, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.create(payload);
      handleBackendNotification(res);
      return res.data.categoria as CategoriaInversion;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear categoría de inversión');
    }
  }
);

// Y así para update, delete...

const categoriaInversionSlice = createSlice({
  name: 'categoriasInversion',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoriasInversion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoriasInversion.fulfilled, (state, action: PayloadAction<CategoriaInversion[]>) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(fetchCategoriasInversion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default categoriaInversionSlice.reducer;
