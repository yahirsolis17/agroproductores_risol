// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService } from '../../modules/gestion_huerta/services/propietarioService';
import { PaginationMeta } from '../../modules/gestion_huerta/types/shared';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                      */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*  THUNKS                                                                     */
/* -------------------------------------------------------------------------- */
type FetchParams = { page: number; estado: Estado } & Record<string, string | number | boolean | undefined>;

export const fetchPropietarios = createAsyncThunk<
  { propietarios: Propietario[]; meta: PaginationMeta },
  FetchParams,
  { rejectValue: string }
>(
  'propietarios/fetch',
  async (params, thunkAPI) => {
    try {
      const { page, estado, ...filters } = params;
      const { signal } = thunkAPI;
      const res = await propietarioService.list(page, estado, filters, { signal });
      return { propietarios: res.data.results, meta: res.data.meta };
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
      return thunkAPI.rejectWithValue('Error al cargar propietarios');
    }
  }
);

export const createPropietario = createAsyncThunk<
  Propietario,
  PropietarioCreateData,
  { rejectValue: string }
>(
  'propietarios/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await propietarioService.create(payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
      return rejectWithValue('Error al crear propietario');
    }
  }
);

export const updatePropietario = createAsyncThunk<
  Propietario,
  { id: number; payload: PropietarioUpdateData },
  { rejectValue: string }
>(
  'propietarios/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await propietarioService.update(id, payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
      return rejectWithValue('Error al actualizar propietario');
    }
  }
);

export const archivePropietario = createAsyncThunk<
  Propietario,
  number,
  { rejectValue: string }
>(
  'propietarios/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.archive(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario; // Objeto ya archivado
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
      return rejectWithValue('Error al archivar propietario');
    }
  }
);

export const restorePropietario = createAsyncThunk<
  Propietario,
  number,
  { rejectValue: string }
>(
  'propietarios/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.restore(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario; // Objeto restaurado
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
      return rejectWithValue('Error al restaurar propietario');
    }
  }
);

export const deletePropietario = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>(
  'propietarios/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await propietarioService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
      return rejectWithValue('Error al eliminar propietario');
    }
  }
);

export const fetchPropietarioOptions = createAsyncThunk<
  { label: string; value: number }[],
  { query: string },
  { rejectValue: string }
>(
  'propietarios/fetchOptions',
  async ({ query }, thunkAPI) => {
    try {
      const { signal } = thunkAPI;
      const res = await propietarioService.getConHuertas(query, { signal });
      return res.data.results.map((p) => ({ label: `${p.nombre} ${p.apellidos}`, value: p.id }));
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
      return thunkAPI.rejectWithValue('Error al cargar propietarios');
    }
  }
);

/* -------------------------------------------------------------------------- */
/*  SLICE                                                                      */
/* -------------------------------------------------------------------------- */
const propietariosSlice = createSlice({
  name: 'propietarios',
  initialState,
  reducers: {
    setPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setEstado: (s, a: PayloadAction<Estado>) => { s.estado = a.payload; s.page = 1; },
    setFilters: (s, a: PayloadAction<Record<string, string | number | boolean | undefined>>) => {
      s.filters = { ...a.payload };
      s.page = 1;
    },
  },
  extraReducers: (b) => {
    /* -------- fetch -------- */
    b.addCase(fetchPropietarios.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchPropietarios.fulfilled, (s, { payload }) => {
      s.items = payload.propietarios;
      s.meta = payload.meta;
      s.loading = false;
      s.loaded = true;
    });
    b.addCase(fetchPropietarios.rejected, (s, { payload, error }) => {
      s.loading = false;
      s.loaded = true;
      s.error = (payload as string) ?? error.message ?? 'Error';
    });

    /* -------- create / update -------- */
    b.addCase(createPropietario.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') s.items.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updatePropietario.fulfilled, (s, { payload }) => {
      const i = s.items.findIndex(p => p.id === payload.id);
      if (i !== -1) s.items[i] = payload;
    });

    /* -------- archive / restore -------- */
    b.addCase(archivePropietario.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.items = s.items.filter(p => p.id !== payload.id);
      } else {
        const i = s.items.findIndex(p => p.id === payload.id);
        if (i !== -1) s.items[i] = payload;
      }
    });
    b.addCase(restorePropietario.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.items = s.items.filter(p => p.id !== payload.id);
      } else {
        const i = s.items.findIndex(p => p.id === payload.id);
        if (i !== -1) s.items[i] = payload;
      }
    });

    /* -------- delete -------- */
    b.addCase(deletePropietario.fulfilled, (s, { payload: id }) => {
      s.items = s.items.filter(p => p.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    b.addCase(fetchPropietarioOptions.pending, (s) => {
      s.loadingOptions = true;
    });
    b.addCase(fetchPropietarioOptions.fulfilled, (s, { payload }) => {
      s.loadingOptions = false;
      s.options = payload;
    });
    b.addCase(fetchPropietarioOptions.rejected, (s) => {
      s.loadingOptions = false;
    });
  },
});

export const { setPage, setEstado, setFilters } = propietariosSlice.actions;
export default propietariosSlice.reducer;
