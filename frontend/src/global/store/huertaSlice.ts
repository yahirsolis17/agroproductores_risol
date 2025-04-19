// src/global/store/huertaSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaService } from '../../modules/gestion_huerta/services/huertaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../../modules/gestion_huerta/types/huertaTypes';

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface HuertaState {
  list: Huerta[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  page: number;
  meta: PaginationMeta;
}

const initialState: HuertaState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  meta: {
    count: 0,
    next: null,
    previous: null,
  },
};

export const fetchHuertas = createAsyncThunk(
  'huerta/fetchAll',
  async (page: number, { rejectWithValue }) => {
    try {
      const serverRes = await huertaService.list(page);
      return {
        huertas: serverRes.data.huertas,
        meta: serverRes.data.meta,
        page,
      };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al cargar huertas');
    }
  }
);

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
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHuertas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHuertas.fulfilled, (state, action: PayloadAction<{
        huertas: Huerta[];
        meta: PaginationMeta;
        page: number;
      }>) => {
        state.list = action.payload.huertas;
        state.meta = action.payload.meta;
        state.page = action.payload.page;
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchHuertas.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'object'
          ? JSON.stringify(action.payload)
          : (action.payload as string);
        state.loaded = true;
      })

      .addCase(createHuerta.fulfilled, (state, action: PayloadAction<Huerta>) => {
        state.list.unshift(action.payload);
      })
      .addCase(createHuerta.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(updateHuerta.fulfilled, (state, action: PayloadAction<Huerta>) => {
        const idx = state.list.findIndex((h) => h.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = action.payload;
        }
      })
      .addCase(updateHuerta.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(deleteHuerta.fulfilled, (state, action: PayloadAction<number>) => {
        state.list = state.list.filter((h) => h.id !== action.payload);
      });
  },
});

export const { setPage } = huertaSlice.actions;
export default huertaSlice.reducer;
