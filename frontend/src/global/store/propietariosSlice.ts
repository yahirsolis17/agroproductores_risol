// src/global/store/propietariosSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService } from '../../modules/gestion_huerta/services/propietarioService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

/* ---------- State ---------- */
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
  meta: { count: 0, next: null, previous: null },
};

/* ---------- Thunks ---------- */
export const fetchPropietarios = createAsyncThunk(
  'propietarios/fetchAll',
  async (page: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.list(page);
      return {
        propietarios: res.data.propietarios,
        meta: { count: res.data.count, next: res.data.next, previous: res.data.previous },
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
  async (
    { id, payload }: { id: number; payload: PropietarioUpdateData },
    { rejectWithValue }
  ) => {
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

/* ---- NUEVOS ---- */
export const archivePropietario = createAsyncThunk(
  'propietarios/archive',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.archive(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      const data = err.response?.data;
      handleBackendNotification(data);
      return rejectWithValue(data);
    }
  }
);

export const restorePropietario = createAsyncThunk(
  'propietarios/restore',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await propietarioService.restore(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: any) {
      const data = err.response?.data;
      handleBackendNotification(data);
      return rejectWithValue(data);
    }
  }
);

/* ---------- Slice ---------- */
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
      /* fetch */
      .addCase(fetchPropietarios.pending, (state) => {
        state.loading = true;
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
      /* create */
      .addCase(createPropietario.fulfilled, (state, { payload }) => {
        state.list.unshift(payload);
      })
      /* update */
      .addCase(updatePropietario.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex((p) => p.id === payload.id);
        if (i !== -1) state.list[i] = payload;
      })
      /* delete */
      .addCase(deletePropietario.fulfilled, (state, { payload }) => {
        state.list = state.list.filter((p) => p.id !== payload);
      })
      /* archive / restore */
      .addCase(archivePropietario.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex((p) => p.id === payload.id);
        if (i !== -1) state.list[i] = payload;
      })
      .addCase(restorePropietario.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex((p) => p.id === payload.id);
        if (i !== -1) state.list[i] = payload;
      });
  },
});

export const { setPage } = propietariosSlice.actions;
export default propietariosSlice.reducer;
