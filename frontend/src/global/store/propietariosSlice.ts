// src/global/store/propietariosSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService } from '../../modules/gestion_huerta/services/propietarioService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

interface PropietarioState {
  list: Propietario[];
  loading: boolean;
  error: string | null;
  loaded: boolean; // Nuevo flag
}

const initialState: PropietarioState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
};

export const fetchPropietarios = createAsyncThunk(
  'propietarios/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const serverRes = await propietarioService.list();
      //handleBackendNotification(serverRes);
      return serverRes.data.propietarios; // array de Propietario
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al cargar propietarios');
    }
  }
);

// create, update, delete -> sin cambios, solo notificaciones
export const createPropietario = createAsyncThunk(
  'propietarios/create',
  async (payload: PropietarioCreateData, { rejectWithValue }) => {
    try {
      const res = await propietarioService.create(payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear propietario');
    }
  }
);

export const updatePropietario = createAsyncThunk(
  'propietarios/update',
  async ({ id, payload }: { id: number; payload: PropietarioUpdateData }, { rejectWithValue }) => {
    try {
      const res = await propietarioService.update(id, payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al actualizar propietario');
    }
  }
);

export const deletePropietario = createAsyncThunk(
  'propietarios/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al eliminar propietario');
    }
  }
);

const propietariosSlice = createSlice({
  name: 'propietarios',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPropietarios.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPropietarios.fulfilled, (state, action: PayloadAction<Propietario[]>) => {
        state.list = action.payload;
        state.loading = false;
        state.loaded = true; // ← Se marcó como cargado
      })
      .addCase(fetchPropietarios.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.loaded = true; // ← También marcamos loaded
      })

      // create
      .addCase(createPropietario.fulfilled, (state, action: PayloadAction<Propietario>) => {
        state.list.unshift(action.payload);
      })
      .addCase(createPropietario.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // update
      .addCase(updatePropietario.fulfilled, (state, action: PayloadAction<Propietario>) => {
        const idx = state.list.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = action.payload;
        }
      })
      .addCase(updatePropietario.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // delete
      .addCase(deletePropietario.fulfilled, (state, action: PayloadAction<number>) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
      });
  },
});

export default propietariosSlice.reducer;
