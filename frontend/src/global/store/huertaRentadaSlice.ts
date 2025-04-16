// src/global/store/huertaRentadaSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaRentadaService } from '../../modules/gestion_huerta/services/huertaRentadaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../../modules/gestion_huerta/types/huertaRentadaTypes';

interface HuertaRentadaState {
  list: HuertaRentada[];
  loading: boolean;
  error: string | null;
}

const initialState: HuertaRentadaState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchHuertasRentadas = createAsyncThunk(
  'huertaRentada/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.list();
      //handleBackendNotification(res);
      return res.data.huertas_rentadas as HuertaRentada[];
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al cargar huertas rentadas');
    }
  }
);

export const createHuertaRentada = createAsyncThunk(
  'huertaRentada/create',
  async (payload: HuertaRentadaCreateData, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.create(payload);
      handleBackendNotification(res);
      return res.data.huerta_rentada as HuertaRentada;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear huerta rentada');
    }
  }
);

export const updateHuertaRentada = createAsyncThunk(
  'huertaRentada/update',
  async (
    { id, payload }: { id: number; payload: HuertaRentadaUpdateData },
    { rejectWithValue }
  ) => {
    try {
      const res = await huertaRentadaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.huerta_rentada as HuertaRentada;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al actualizar huerta rentada');
    }
  }
);

export const deleteHuertaRentada = createAsyncThunk(
  'huertaRentada/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al eliminar huerta rentada');
    }
  }
);

const huertaRentadaSlice = createSlice({
  name: 'huertaRentada',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHuertasRentadas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHuertasRentadas.fulfilled, (state, action: PayloadAction<HuertaRentada[]>) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(fetchHuertasRentadas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createHuertaRentada.fulfilled, (state, action: PayloadAction<HuertaRentada>) => {
        state.list.unshift(action.payload);
      })
      .addCase(createHuertaRentada.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateHuertaRentada.fulfilled, (state, action: PayloadAction<HuertaRentada>) => {
        const idx = state.list.findIndex((h) => h.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = action.payload;
        }
      })
      .addCase(updateHuertaRentada.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteHuertaRentada.fulfilled, (state, action: PayloadAction<number>) => {
        state.list = state.list.filter((h) => h.id !== action.payload);
      });
  },
});

export default huertaRentadaSlice.reducer;
