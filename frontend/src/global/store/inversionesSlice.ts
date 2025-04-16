// src/global/store/inversionesSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inversionService } from '../../modules/gestion_huerta/services/inversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { InversionHuerta, InversionCreateData, InversionUpdateData } from '../../modules/gestion_huerta/types/inversionTypes';

interface InversionPaginado {
  count: number;
  next: string | null;
  previous: string | null;
  results: InversionHuerta[];
}

interface InversionesState extends InversionPaginado {
  loading: boolean;
  error: string | null;
}

const initialState: InversionesState = {
  count: 0,
  next: null,
  previous: null,
  results: [],
  loading: false,
  error: null,
};

// Listar inversiones por cosecha con paginación
export const fetchInversionesByCosecha = createAsyncThunk(
  'inversiones/fetchByCosecha',
  async ({ cosechaId, page }: { cosechaId: number; page?: number }, { rejectWithValue }) => {
    try {
      const data = await inversionService.listByCosecha(cosechaId, page || 1);
      return data; // {count, next, previous, results:[...]}
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al listar inversiones');
    }
  }
);

// Crear inversión
export const createInversion = createAsyncThunk(
  'inversiones/create',
  async (payload: InversionCreateData, { rejectWithValue }) => {
    try {
      const res = await inversionService.create(payload);
      handleBackendNotification(res);
      // res.data.inversion => InversionHuerta
      return res.data.inversion as InversionHuerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear inversión');
    }
  }
);

// Actualizar inversión
export const updateInversion = createAsyncThunk(
  'inversiones/update',
  async ({ id, payload }: { id: number; payload: InversionUpdateData }, { rejectWithValue }) => {
    try {
      const res = await inversionService.update(id, payload);
      handleBackendNotification(res);
      return res.data.inversion as InversionHuerta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al actualizar inversión');
    }
  }
);

// Eliminar inversión
export const deleteInversion = createAsyncThunk(
  'inversiones/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await inversionService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al eliminar inversión');
    }
  }
);

const inversionesSlice = createSlice({
  name: 'inversiones',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchInversionesByCosecha.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInversionesByCosecha.fulfilled, (state, action: PayloadAction<InversionPaginado>) => {
        state.count = action.payload.count;
        state.next = action.payload.next;
        state.previous = action.payload.previous;
        state.results = action.payload.results;
        state.loading = false;
      })
      .addCase(fetchInversionesByCosecha.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // create
      .addCase(createInversion.fulfilled, (state, action: PayloadAction<InversionHuerta>) => {
        state.results.unshift(action.payload);
      })
      .addCase(createInversion.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // update
      .addCase(updateInversion.fulfilled, (state, action: PayloadAction<InversionHuerta>) => {
        const idx = state.results.findIndex((inv) => inv.id === action.payload.id);
        if (idx !== -1) {
          state.results[idx] = action.payload;
        }
      })
      .addCase(updateInversion.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // delete
      .addCase(deleteInversion.fulfilled, (state, action: PayloadAction<number>) => {
        state.results = state.results.filter(inv => inv.id !== action.payload);
      });
  },
});

export default inversionesSlice.reducer;
