// STATE-UPDATE: local list pruning after archive/restore/delete is intentional in Redux store.
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService } from '../../modules/gestion_huerta/services/propietarioService';
import { PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { extractApiMessage } from '../api/errorUtils';
import { extractRejectedPayload } from '../types/apiTypes';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

export type Estado = 'activos' | 'archivados' | 'todos';

interface PropietarioState {
  items: Propietario[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  page: number;
  estado: Estado;
  meta: PaginationMeta;
  filters: Record<string, string | number | boolean | undefined>;
  options: { label: string; value: number }[];
  loadingOptions: boolean;
}

const initialState: PropietarioState = {
  items: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  estado: 'activos',
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 },
  filters: {},
  options: [],
  loadingOptions: false,
};

type FetchParams = { page: number; estado: Estado } & Record<string, string | number | boolean | undefined>;

export const fetchPropietarios = createAsyncThunk<
  { propietarios: Propietario[]; meta: PaginationMeta },
  FetchParams,
  { rejectValue: unknown }
>(
  'propietarios/fetch',
  async (params, thunkAPI) => {
    try {
      const { page, estado, ...filters } = params;
      const { signal } = thunkAPI;
      const res = await propietarioService.list(page, estado, filters, { signal });
      return { propietarios: res.data.results, meta: res.data.meta };
    } catch (err: unknown) {
      return thunkAPI.rejectWithValue(extractRejectedPayload(err));
    }
  }
);

export const createPropietario = createAsyncThunk<
  Propietario,
  PropietarioCreateData,
  { rejectValue: unknown }
>(
  'propietarios/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await propietarioService.create(payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedPayload(err));
    }
  }
);

export const updatePropietario = createAsyncThunk<
  Propietario,
  { id: number; payload: PropietarioUpdateData },
  { rejectValue: unknown }
>(
  'propietarios/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await propietarioService.update(id, payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedPayload(err));
    }
  }
);

export const archivePropietario = createAsyncThunk<
  Propietario,
  number,
  { rejectValue: unknown }
>(
  'propietarios/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.archive(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: unknown) {
      const errorData = extractRejectedPayload(err);
      handleBackendNotification(errorData);
      return rejectWithValue(errorData);
    }
  }
);

export const restorePropietario = createAsyncThunk<
  Propietario,
  number,
  { rejectValue: unknown }
>(
  'propietarios/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.restore(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: unknown) {
      const errorData = extractRejectedPayload(err);
      handleBackendNotification(errorData);
      return rejectWithValue(errorData);
    }
  }
);

export const deletePropietario = createAsyncThunk<
  number,
  number,
  { rejectValue: unknown }
>(
  'propietarios/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: unknown) {
      const errorData = extractRejectedPayload(err);
      handleBackendNotification(errorData);
      return rejectWithValue(errorData);
    }
  }
);

export const fetchPropietarioOptions = createAsyncThunk<
  { label: string; value: number }[],
  { query: string },
  { rejectValue: unknown }
>(
  'propietarios/fetchOptions',
  async ({ query }, thunkAPI) => {
    try {
      const { signal } = thunkAPI;
      const res = await propietarioService.getConHuertas(query, { signal });
      return res.data.results.map((p) => ({ label: `${p.nombre} ${p.apellidos}`, value: p.id }));
    } catch (err: unknown) {
      return thunkAPI.rejectWithValue(extractRejectedPayload(err));
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
    setEstado: (state, action: PayloadAction<Estado>) => {
      state.estado = action.payload;
      state.page = 1;
    },
    setFilters: (state, action: PayloadAction<Record<string, string | number | boolean | undefined>>) => {
      state.filters = { ...action.payload };
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchPropietarios.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPropietarios.fulfilled, (state, { payload }) => {
      state.items = payload.propietarios;
      state.meta = payload.meta;
      state.loading = false;
      state.loaded = true;
    });
    builder.addCase(fetchPropietarios.rejected, (state, { payload, error }) => {
      state.loading = false;
      state.loaded = true;
      state.error = extractApiMessage(payload ?? error, 'Error');
    });

    builder.addCase(createPropietario.fulfilled, (state, { payload }) => {
      if (state.estado === 'activos') state.items.unshift(payload);
      state.meta.count += 1;
    });
    builder.addCase(updatePropietario.fulfilled, (state, { payload }) => {
      const index = state.items.findIndex((item) => item.id === payload.id);
      if (index !== -1) state.items[index] = payload;
    });

    builder.addCase(archivePropietario.fulfilled, (state, { payload }) => {
      if (state.estado === 'activos') {
        state.items = state.items.filter((item) => item.id !== payload.id);
      } else {
        const index = state.items.findIndex((item) => item.id === payload.id);
        if (index !== -1) state.items[index] = payload;
      }
    });
    builder.addCase(restorePropietario.fulfilled, (state, { payload }) => {
      if (state.estado === 'archivados') {
        state.items = state.items.filter((item) => item.id !== payload.id);
      } else {
        const index = state.items.findIndex((item) => item.id === payload.id);
        if (index !== -1) state.items[index] = payload;
      }
    });

    builder.addCase(deletePropietario.fulfilled, (state, { payload: id }) => {
      state.items = state.items.filter((item) => item.id !== id);
      if (state.meta.count > 0) state.meta.count -= 1;
    });

    builder.addCase(fetchPropietarioOptions.pending, (state) => {
      state.loadingOptions = true;
    });
    builder.addCase(fetchPropietarioOptions.fulfilled, (state, { payload }) => {
      state.loadingOptions = false;
      state.options = payload;
    });
    builder.addCase(fetchPropietarioOptions.rejected, (state) => {
      state.loadingOptions = false;
    });
  },
});

export const { setPage, setEstado, setFilters } = propietariosSlice.actions;
export default propietariosSlice.reducer;

