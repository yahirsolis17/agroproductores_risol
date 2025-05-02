import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaRentadaService } from '../../modules/gestion_huerta/services/huertaRentadaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../../modules/gestion_huerta/types/huertaRentadaTypes';

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface HuertaRentadaState {
  list: HuertaRentada[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  page: number;
  meta: PaginationMeta;
}

const initialState: HuertaRentadaState = {
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

/* -------------------------------------------------------------------------- */
/*                                 THUNKS                                     */
/* -------------------------------------------------------------------------- */

export const fetchHuertasRentadas = createAsyncThunk(
  'huertaRentada/fetchAll',
  async (page: number, { rejectWithValue }) => {
    try {
      const serverRes = await huertaRentadaService.list(page);
      return {
        huertas: serverRes.data.huertas_rentadas,
        meta: serverRes.data.meta,
        page,
      };
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

/* -------------------------------------------------------------------------- */
/*                                 SLICE                                      */
/* -------------------------------------------------------------------------- */

const huertaRentadaSlice = createSlice({
  name: 'huertaRentada',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHuertasRentadas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHuertasRentadas.fulfilled, (state, action) => {
        state.list = action.payload.huertas;
        state.meta = action.payload.meta;
        state.page = action.payload.page;
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchHuertasRentadas.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === 'object'
            ? JSON.stringify(action.payload)
            : (action.payload as string);
        state.loaded = true;
      })

      .addCase(createHuertaRentada.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(createHuertaRentada.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(updateHuertaRentada.fulfilled, (state, action) => {
        const idx = state.list.findIndex((h) => h.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = action.payload;
        }
      })
      .addCase(updateHuertaRentada.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(deleteHuertaRentada.fulfilled, (state, action) => {
        state.list = state.list.filter((h) => h.id !== action.payload);
      });
  },
});

export const { setPage } = huertaRentadaSlice.actions;
export default huertaRentadaSlice.reducer;
