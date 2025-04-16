// src/global/store/ventasSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ventaService } from '../../modules/gestion_huerta/services/ventaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Venta, VentaCreateData, VentaUpdateData } from '../../modules/gestion_huerta/types/ventaTypes';

interface VentaPaginado {
  count: number;
  next: string | null;
  previous: string | null;
  results: Venta[];
}

interface VentasState extends VentaPaginado {
  loading: boolean;
  error: string | null;
}

const initialState: VentasState = {
  count: 0,
  next: null,
  previous: null,
  results: [],
  loading: false,
  error: null,
};

// Listar ventas por cosecha
export const fetchVentasByCosecha = createAsyncThunk(
  'ventas/fetchByCosecha',
  async ({ cosechaId, page }: { cosechaId: number; page?: number }, { rejectWithValue }) => {
    try {
      const data = await ventaService.listByCosecha(cosechaId, page || 1);
      return data; // { count, next, previous, results: Venta[] }
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al listar ventas');
    }
  }
);

// Crear venta
export const createVenta = createAsyncThunk(
  'ventas/create',
  async (payload: VentaCreateData, { rejectWithValue }) => {
    try {
      const res = await ventaService.create(payload);
      handleBackendNotification(res);
      // res.data.venta => Venta
      return res.data.venta as Venta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al crear venta');
    }
  }
);

// Actualizar venta
export const updateVenta = createAsyncThunk(
  'ventas/update',
  async ({ id, payload }: { id: number; payload: VentaUpdateData }, { rejectWithValue }) => {
    try {
      const res = await ventaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.venta as Venta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al actualizar venta');
    }
  }
);

// Eliminar venta
export const deleteVenta = createAsyncThunk(
  'ventas/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await ventaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al eliminar venta');
    }
  }
);

const ventasSlice = createSlice({
  name: 'ventas',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchVentasByCosecha.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVentasByCosecha.fulfilled, (state, action: PayloadAction<VentaPaginado>) => {
        state.count = action.payload.count;
        state.next = action.payload.next;
        state.previous = action.payload.previous;
        state.results = action.payload.results;
        state.loading = false;
      })
      .addCase(fetchVentasByCosecha.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // create
      .addCase(createVenta.fulfilled, (state, action: PayloadAction<Venta>) => {
        state.results.unshift(action.payload);
      })
      .addCase(createVenta.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // update
      .addCase(updateVenta.fulfilled, (state, action: PayloadAction<Venta>) => {
        const idx = state.results.findIndex(v => v.id === action.payload.id);
        if (idx !== -1) {
          state.results[idx] = action.payload;
        }
      })
      .addCase(updateVenta.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // delete
      .addCase(deleteVenta.fulfilled, (state, action: PayloadAction<number>) => {
        state.results = state.results.filter(v => v.id !== action.payload);
      });
  },
});

export default ventasSlice.reducer;
