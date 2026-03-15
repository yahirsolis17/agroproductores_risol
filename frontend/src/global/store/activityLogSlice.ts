import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';
import { ensureSuccess } from '../utils/backendEnvelope';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { extractApiError } from '../types/apiTypes';

export interface ActivityLogEntry {
  id: number;
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
    role: 'admin' | 'usuario';
  };
  accion: string;
  fecha_hora: string;
  detalles?: string;
  ip?: string;
  categoria?: 'seguridad' | 'autenticacion' | 'gestion_bodega' | 'gestion_huerta' | 'gestion_usuarios' | 'sistema';
  severidad?: 'warning' | 'info' | 'success';
  ruta?: string | null;
  metodo?: string | null;
  es_denegado?: boolean;
}

export interface ActivityLogMeta {
  count: number;
  next: string | null;
  previous: string | null;
  page?: number | null;
  page_size?: number | null;
  total_pages?: number | null;
}

interface ActivityLogState {
  items: ActivityLogEntry[];
  meta: ActivityLogMeta;
  page: number;
  ordering: string;
  search: string;
  tipo: string;
  rol: 'todos' | 'admin' | 'usuario';
  loading: boolean;
  error: { message: string; status?: number } | null;
}

const initialPage = Number(localStorage.getItem('activityPage')) || 1;

const initialState: ActivityLogState = {
  items: [],
  meta: { count: 0, next: null, previous: null, page: null, page_size: null, total_pages: null },
  page: initialPage,
  ordering: '-fecha_hora',
  search: '',
  tipo: 'todos',
  rol: 'todos',
  loading: false,
  error: null,
};

export const fetchActivityLog = createAsyncThunk<
  { results: ActivityLogEntry[]; meta: ActivityLogMeta; page: number },
  { page: number; ordering: string; search?: string; tipo?: string; rol?: 'todos' | 'admin' | 'usuario' },
  { rejectValue: { message: string; status?: number } }
>('activityLog/fetch', async ({ page, ordering, search, tipo, rol }, { rejectWithValue }) => {
  try {
    const params: Record<string, string | number> = { page, ordering };
    if (search?.trim()) params.search = search.trim();
    if (tipo && tipo !== 'todos') params.tipo = tipo;
    if (rol && rol !== 'todos') params.rol = rol;
    const res = await apiClient.get('/usuarios/actividad/', { params });
    const env = ensureSuccess<{ results: ActivityLogEntry[]; meta: ActivityLogMeta }>(res.data);
    handleBackendNotification(res.data);
    return { results: env.data.results ?? [], meta: env.data.meta ?? initialState.meta, page };
  } catch (err: unknown) {
    const apiError = extractApiError(err);
    handleBackendNotification(apiError);
    const status = (err as { response?: { status?: number } })?.response?.status;
    return rejectWithValue({ message: 'No se pudo obtener el historial de actividades.', status });
  }
});

const activityLogSlice = createSlice({
  name: 'activityLog',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
      localStorage.setItem('activityPage', String(action.payload));
    },
    setOrdering(state, action: PayloadAction<string>) {
      state.ordering = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    setTipo(state, action: PayloadAction<string>) {
      state.tipo = action.payload;
      state.page = 1;
    },
    setRol(state, action: PayloadAction<'todos' | 'admin' | 'usuario'>) {
      state.rol = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchActivityLog.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchActivityLog.fulfilled, (state, action) => {
      state.items = action.payload.results;
      state.meta = action.payload.meta;
      state.page = action.payload.page;
      state.loading = false;
    });
    builder.addCase(fetchActivityLog.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? { message: 'No se pudo obtener el historial de actividades.' };
    });
  },
});

export const { setPage, setOrdering, setSearch, setTipo, setRol } = activityLogSlice.actions;
export default activityLogSlice.reducer;
