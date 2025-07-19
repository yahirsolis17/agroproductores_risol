// src/global/store/temporadaSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { temporadaService } from '../../modules/gestion_huerta/services/temporadaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Temporada, TemporadaCreateData } from '../../modules/gestion_huerta/types/temporadaTypes';

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface TemporadaState {
  list: Temporada[];
  loading: boolean;
  error: Record<string, any> | null;
  loaded: boolean;
  page: number;
  meta: PaginationMeta;
  yearFilter: number | null;
  huertaId: number | null;
  huertaRentadaId: number | null;
  estadoFilter: 'activas' | 'archivadas' | 'todas';
  finalizadaFilter: boolean | null;
  searchFilter: string;
}

const initialState: TemporadaState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  meta: { count: 0, next: null, previous: null },
  yearFilter: null,
  huertaId: null,
  huertaRentadaId: null,
  estadoFilter: 'activas',
  finalizadaFilter: null,
  searchFilter: '',
};

// ——— Thunks ———

export const fetchTemporadas = createAsyncThunk<
  { temporadas: Temporada[]; meta: PaginationMeta; page: number },
  { 
    page: number; 
    año?: number; 
    huertaId?: number; 
    huertaRentadaId?: number;
    estado?: 'activas' | 'archivadas' | 'todas';
    finalizada?: boolean;
    search?: string;
  },
  { rejectValue: Record<string, any> }
>(
  'temporada/fetchAll',
  async ({ page, año, huertaId, huertaRentadaId, estado, finalizada, search }, { rejectWithValue }) => {
    try {
      const res = await temporadaService.list(page, año, huertaId, huertaRentadaId, estado, finalizada, search);
      handleBackendNotification(res);
      return {
        temporadas: res.data.temporadas,
        meta: res.data.meta,
        page,
      };
    } catch (err: any) {
      const errorPayload = err.response?.data || { message: 'Error al cargar temporadas' };
      handleBackendNotification(errorPayload.notification || errorPayload);
      return rejectWithValue(errorPayload);
    }
  }
);

export const createTemporada = createAsyncThunk<
  Temporada,
  TemporadaCreateData,
  { rejectValue: Record<string, any> }
>(
  'temporada/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await temporadaService.create(payload);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: any) {
      const errorPayload = err.response?.data || { message: 'Error al crear temporada' };
      handleBackendNotification(errorPayload.notification || errorPayload);
      return rejectWithValue(errorPayload);
    }
  }
);

export const deleteTemporada = createAsyncThunk<
  number,
  number,
  { rejectValue: Record<string, any> }
>(
  'temporada/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      const errorPayload = err.response?.data || { message: 'Error al eliminar temporada' };
      handleBackendNotification(errorPayload.notification || errorPayload);
      return rejectWithValue(errorPayload);
    }
  }
);

export const finalizarTemporada = createAsyncThunk<
  Temporada,
  number,
  { rejectValue: Record<string, any> }
>(
  'temporada/finalizar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.finalizar(id);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: any) {
      const errorPayload = err.response?.data || { message: 'Error al finalizar temporada' };
      handleBackendNotification(errorPayload.notification || errorPayload);
      return rejectWithValue(errorPayload);
    }
  }
);

export const archivarTemporada = createAsyncThunk<
  Temporada,
  number,
  { rejectValue: Record<string, any> }
>(
  'temporada/archivar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.archivar(id);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: any) {
      const errorPayload = err.response?.data || { message: 'Error al archivar temporada' };
      handleBackendNotification(errorPayload.notification || errorPayload);
      return rejectWithValue(errorPayload);
    }
  }
);

export const restaurarTemporada = createAsyncThunk<
  Temporada,
  number,
  { rejectValue: Record<string, any> }
>(
  'temporada/restaurar',
  async (id, { rejectWithValue }) => {
    try {
      const res = await temporadaService.restaurar(id);
      handleBackendNotification(res);
      return res.data.temporada;
    } catch (err: any) {
      const errorPayload = err.response?.data || { message: 'Error al restaurar temporada' };
      handleBackendNotification(errorPayload.notification || errorPayload);
      return rejectWithValue(errorPayload);
    }
  }
);


// ——— Slice ———
const temporadaSlice = createSlice({
  name: 'temporada',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setYearFilter(state, action: PayloadAction<number | null>) {
      state.yearFilter = action.payload;
      state.page = 1; // reset page on filter change
    },
    setHuertaId(state, action: PayloadAction<number | null>) {
      state.huertaId = action.payload;
      state.page = 1; // reset page on filter change
    },
    setHuertaRentadaId(state, action: PayloadAction<number | null>) {
      state.huertaRentadaId = action.payload;
      state.page = 1; // reset page on filter change
    },
    setEstadoFilter(state, action: PayloadAction<'activas' | 'archivadas' | 'todas'>) {
      state.estadoFilter = action.payload;
      state.page = 1; // reset page on filter change
    },
    setFinalizadaFilter(state, action: PayloadAction<boolean | null>) {
      state.finalizadaFilter = action.payload;
      state.page = 1; // reset page on filter change
    },
    setSearchFilter(state, action: PayloadAction<string>) {
      state.searchFilter = action.payload;
      state.page = 1; // reset page on filter change
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch todas
      .addCase(fetchTemporadas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemporadas.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.loaded = true;
        state.list = payload.temporadas;
        state.meta = payload.meta;
        state.page = payload.page;
      })
      .addCase(fetchTemporadas.rejected, (state, { payload }) => {
        state.loading = false;
        state.loaded = true;
        state.error = payload || null;
      })

      // Create
      .addCase(createTemporada.fulfilled, (state, { payload }) => {
        state.list.unshift(payload);
      })
      .addCase(createTemporada.rejected, (state, { payload }) => {
        state.error = payload || null;
      })

      // Delete
      .addCase(deleteTemporada.fulfilled, (state, { payload }) => {
        state.list = state.list.filter((t) => t.id !== payload);
      })
      .addCase(deleteTemporada.rejected, (state, { payload }) => {
        state.error = payload || null;
      })

      // Finalizar
      .addCase(finalizarTemporada.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(finalizarTemporada.rejected, (state, { payload }) => {
        state.error = payload || null;
      })

      // Archivar
      .addCase(archivarTemporada.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(archivarTemporada.rejected, (state, { payload }) => {
        state.error = payload || null;
      })

      // Restaurar
      .addCase(restaurarTemporada.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(restaurarTemporada.rejected, (state, { payload }) => {
        state.error = payload || null;
      })

  },
});

export const { 
  setPage, 
  setYearFilter, 
  setHuertaId, 
  setHuertaRentadaId, 
  setEstadoFilter, 
  setFinalizadaFilter, 
  setSearchFilter 
} = temporadaSlice.actions;
export default temporadaSlice.reducer;
