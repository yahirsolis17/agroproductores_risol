// src/global/store/cosechasSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { cosechaService } from '../../modules/gestion_huerta/services/cosechaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../../modules/gestion_huerta/types/cosechaTypes';

interface CosechasState {
  list: Cosecha[];
  loading: boolean;
  error: string | null;
}

const initialState: CosechasState = {
  list: [],
  loading: false,
  error: null,
};

// Listar cosechas de una huerta
export const fetchCosechasByHuerta = createAsyncThunk(
  'cosechas/fetchByHuerta',
  async (huertaId: number, { rejectWithValue }) => {
    try {
      const data = await cosechaService.listByHuerta(huertaId);
      // data => array de Cosecha
      return data;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al listar cosechas');
    }
  }
);

// Crear cosecha
export const createCosecha = createAsyncThunk(
  'cosechas/create',
  async (payload: CosechaCreateData, { rejectWithValue }) => {
    try {
      const res = await cosechaService.create(payload);
      handleBackendNotification(res);
      // res => { ...cosecha } u { success, data: { cosecha } } (ajusta según tu backend)
      return res;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear cosecha');
    }
  }
);

// OJO: si requieres getCosecha, updateCosecha, deleteCosecha, toggleCosecha ...
// Los creamos igual:

export const updateCosecha = createAsyncThunk(
  'cosechas/update',
  async ({ id, payload }: { id: number; payload: CosechaUpdateData }, { rejectWithValue }) => {
    try {
      const res = await cosechaService.update(id, payload);
      handleBackendNotification(res);
      return res;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al actualizar cosecha');
    }
  }
);

export const deleteCosecha = createAsyncThunk(
  'cosechas/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await cosechaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al eliminar cosecha');
    }
  }
);

export const toggleCosecha = createAsyncThunk(
  'cosechas/toggle',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await cosechaService.toggle(id);
      handleBackendNotification(res);
      return res;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al cambiar estado de cosecha');
    }
  }
);

const cosechasSlice = createSlice({
  name: 'cosechas',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchCosechasByHuerta
      .addCase(fetchCosechasByHuerta.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCosechasByHuerta.fulfilled, (state, action: PayloadAction<Cosecha[]>) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(fetchCosechasByHuerta.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    // createCosecha, updateCosecha, deleteCosecha, toggleCosecha => ajusta según necesites
  },
});

export default cosechasSlice.reducer;
