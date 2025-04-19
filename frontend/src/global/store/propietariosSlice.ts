import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService } from '../../modules/gestion_huerta/services/propietarioService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface PropietarioState {
  list: Propietario[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  meta: PaginationMeta;
  page: number;
}

const initialState: PropietarioState = {
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

export const fetchPropietarios = createAsyncThunk(
  'propietarios/fetchAll',
  async (page: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.list(page);
      return {
        propietarios: res.data.propietarios,
        meta: {
          count: res.data.count,
          next: res.data.next,
          previous: res.data.previous,
        },
        page,
      };
    } catch (err: any) {
      const data = err.response?.data;
      handleBackendNotification(data);
      return rejectWithValue(data);
    }
  }
);

export const createPropietario = createAsyncThunk(
  'propietarios/create',
  async (payload: PropietarioCreateData, { rejectWithValue }) => {
    try {
      const res = await propietarioService.create(payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      const data = err.response?.data;
      handleBackendNotification(data);
      return rejectWithValue(data);
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
      const data = err.response?.data;
      handleBackendNotification(data);
      return rejectWithValue(data);
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
      const data = err.response?.data;
      handleBackendNotification(data);
      return rejectWithValue(data);
    }
  }
);

const propietariosSlice = createSlice({
  name: 'propietarios',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPropietarios.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPropietarios.fulfilled, (state, action) => {
        state.list = action.payload.propietarios;
        state.meta = action.payload.meta;
        state.page = action.payload.page;
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchPropietarios.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      })
      .addCase(createPropietario.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(createPropietario.rejected, (state) => {
        state.error = null;
      })
      .addCase(updatePropietario.fulfilled, (state, action) => {
        const idx = state.list.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = action.payload;
        }
      })
      .addCase(updatePropietario.rejected, (state) => {
        state.error = null;
      })
      .addCase(deletePropietario.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
      });
  },
});

export const { setPage } = propietariosSlice.actions;
export default propietariosSlice.reducer;
