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
  loading: boolean;
  error: { message: string; status?: number } | null;
}

const initialPage = Number(localStorage.getItem('activityPage')) || 1;

const initialState: ActivityLogState = {
  items: [],
  meta: { count: 0, next: null, previous: null, page: null, page_size: null, total_pages: null },
  page: initialPage,
  ordering: '-fecha_hora',
  loading: false,
  error: null,
};

export const fetchActivityLog = createAsyncThunk<
  { results: ActivityLogEntry[]; meta: ActivityLogMeta; page: number },
  { page: number; ordering: string },
  { rejectValue: { message: string; status?: number } }
>('activityLog/fetch', async ({ page, ordering }, { rejectWithValue }) => {
  try {
    const res = await apiClient.get('/usuarios/actividad/', { params: { page, ordering } });
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

export const { setPage, setOrdering } = activityLogSlice.actions;
export default activityLogSlice.reducer;
