// src/global/store/huertaSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaService } from '../../modules/gestion_huerta/services/huertaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../../modules/gestion_huerta/types/huertaTypes';

interface HuertaState {
  list: Huerta[];
  loading: boolean;
  error: string | null;
  /** Nuevo flag: indica que ya se hizo la petición (aunque sea con éxito 0 items) */
  loaded: boolean;
}

const initialState: HuertaState = {
  list: [],
  loading: false,
  error: null,
  loaded: false, // por defecto aún no ha cargado
};

// Listar huertas
export const fetchHuertas = createAsyncThunk(
  'huerta/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const serverRes = await huertaService.list();
      //handleBackendNotification(serverRes);
      // serverRes.data.huertas => Huerta[]
      return serverRes.data.huertas;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al cargar huertas');
    }
  }
);

// Crear, Actualizar, Eliminar (sin cambios):
export const createHuerta = createAsyncThunk(
  'huerta/create',
  async (payload: HuertaCreateData, { rejectWithValue }) => {
    try {
      const res = await huertaService.create(payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear huerta');
    }
  }
);

export const updateHuerta = createAsyncThunk(
  'huerta/update',
  async ({ id, payload }: { id: number; payload: HuertaUpdateData }, { rejectWithValue }) => {
    try {
      const res = await huertaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.huerta as Huerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al actualizar huerta');
    }
  }
);

export const deleteHuerta = createAsyncThunk(
  'huerta/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await huertaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al eliminar huerta');
    }
  }
);

const huertaSlice = createSlice({
  name: 'huerta',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchHuertas
      .addCase(fetchHuertas.pending, (state) => {
        state.loading = true;
        state.error = null;
        // no cambiamos loaded aquí (aún no concluye)
      })
      .addCase(fetchHuertas.fulfilled, (state, action: PayloadAction<Huerta[]>) => {
        state.list = action.payload;
        state.loading = false;
        state.loaded = true; // ✔ se completó la carga (aunque sea vacía)
      })
      .addCase(fetchHuertas.rejected, (state, action) => {
        state.loading = false;
        // Convertir el payload a string o algo
        if (typeof action.payload === 'object') {
          state.error = JSON.stringify(action.payload);
        } else {
          state.error = action.payload as string;
        }
        state.loaded = true; // ✔ ya intentamos
      })

      // createHuerta
      .addCase(createHuerta.fulfilled, (state, action: PayloadAction<Huerta>) => {
        state.list.unshift(action.payload);
      })
      .addCase(createHuerta.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // updateHuerta
      .addCase(updateHuerta.fulfilled, (state, action: PayloadAction<Huerta>) => {
        const idx = state.list.findIndex((h) => h.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = action.payload;
        }
      })
      .addCase(updateHuerta.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // deleteHuerta
      .addCase(deleteHuerta.fulfilled, (state, action: PayloadAction<number>) => {
        state.list = state.list.filter((h) => h.id !== action.payload);
      });
  },
});

export default huertaSlice.reducer;
