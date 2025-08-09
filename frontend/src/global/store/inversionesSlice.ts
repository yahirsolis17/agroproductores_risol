import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inversionService } from '../../modules/gestion_huerta/services/inversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  InversionHuerta,
  InversionHuertaCreateData,
  InversionHuertaUpdateData,
} from '../../modules/gestion_huerta/types/inversionTypes';
import type { RootState } from './store';

export type EstadoFiltro = 'activas' | 'archivadas' | 'todas';

export interface InversionFilters {
  categoria?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: EstadoFiltro; // ← tabs
}

interface PaginationMeta { count: number; next: string | null; previous: string | null; }

interface InversionesState {
  list: InversionHuerta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  meta: PaginationMeta;

  // contexto (FKs)
  huertaId: number | null;
  huertaRentadaId: number | null; // ← clave cuando es rentada
  temporadaId: number | null;
  cosechaId: number | null;

  filters: InversionFilters;
}

const initialState: InversionesState = {
  list: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  meta: { count: 0, next: null, previous: null },
  huertaId: null,
  huertaRentadaId: null,
  temporadaId: null,
  cosechaId: null,
  filters: { estado: 'activas' },
};

export const fetchInversiones = createAsyncThunk<
  { inversiones: InversionHuerta[]; meta: PaginationMeta; page: number },
  void,
  { state: RootState; rejectValue: string }
>(
  'inversiones/fetch',
  async (_, { getState, rejectWithValue }) => {
    const s = getState().inversiones;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId, page, filters } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue('Faltan IDs de contexto (huerta/huerta_rentada, temporada o cosecha).');
    }
    try {
      const data = await inversionService.list(
        { huertaId: huertaId ?? undefined, huertaRentadaId: huertaRentadaId ?? undefined, temporadaId, cosechaId },
        page, 10, filters
      );
      return { inversiones: data.inversiones, meta: data.meta, page };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al cargar inversiones');
    }
  }
);

export const createInversion = createAsyncThunk<
  InversionHuerta,
  InversionHuertaCreateData,
  { state: RootState; rejectValue: string }
>(
  'inversiones/create',
  async (payload, { getState, rejectWithValue }) => {
    const s = getState().inversiones;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue('Contexto incompleto');
    }
    try {
      const inv = await inversionService.create(
        { huertaId: huertaId ?? undefined, huertaRentadaId: huertaRentadaId ?? undefined, temporadaId, cosechaId },
        payload
      );
      handleBackendNotification({ success: true, message_key: 'inversion_create_success', data: { inversion: inv } });
      return inv;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al crear inversión');
    }
  }
);

export const updateInversion = createAsyncThunk<
  InversionHuerta,
  { id: number; payload: InversionHuertaUpdateData },
  { rejectValue: string }
>(
  'inversiones/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const inv = await inversionService.update(id, payload);
      handleBackendNotification({ success: true, message_key: 'inversion_update_success', data: { inversion: inv } });
      return inv;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al actualizar inversión');
    }
  }
);

export const archiveInversion = createAsyncThunk<
  InversionHuerta,
  number,
  { rejectValue: string }
>(
  'inversiones/archive',
  async (id, { rejectWithValue }) => {
    try {
      const inv = await inversionService.archive(id);
      handleBackendNotification({ success: true, message_key: 'inversion_archivada', data: { inversion: inv } });
      return inv;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al archivar inversión');
    }
  }
);

export const restoreInversion = createAsyncThunk<
  InversionHuerta,
  number,
  { rejectValue: string }
>(
  'inversiones/restore',
  async (id, { rejectWithValue }) => {
    try {
      const inv = await inversionService.restore(id);
      handleBackendNotification({ success: true, message_key: 'inversion_restaurada', data: { inversion: inv } });
      return inv;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al restaurar inversión');
    }
  }
);

export const deleteInversion = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>(
  'inversiones/delete',
  async (id, { rejectWithValue }) => {
    try {
      const info = await inversionService.remove(id);
      handleBackendNotification({ success: true, message_key: 'inversion_delete_success', data: { info } });
      return id;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al eliminar inversión');
    }
  }
);

const inversionesSlice = createSlice({
  name: 'inversiones',
  initialState,
  reducers: {
    setPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setContext: (
      s,
      a: PayloadAction<{ huertaId?: number; huertaRentadaId?: number; temporadaId: number; cosechaId: number }>
    ) => {
      s.huertaId = a.payload.huertaId ?? null;
      s.huertaRentadaId = a.payload.huertaRentadaId ?? null;
      s.temporadaId = a.payload.temporadaId;
      s.cosechaId = a.payload.cosechaId;
      s.page = 1;
    },
    setFilters: (s, a: PayloadAction<InversionFilters>) => { s.filters = a.payload; s.page = 1; },
  },
  extraReducers: b => {
    b.addCase(fetchInversiones.pending, s => { s.loading = true; s.error = null; })
     .addCase(fetchInversiones.fulfilled, (s, { payload }) => {
       s.list = payload.inversiones;
       s.meta = payload.meta;
       s.page = payload.page;
       s.loading = false;
       s.loaded = true;
     })
     .addCase(fetchInversiones.rejected, (s, { payload, error }) => {
       s.loading = false;
       s.error = (payload as string) ?? error.message ?? 'Error';
       s.loaded = true;
     })

     .addCase(createInversion.fulfilled, (s, { payload }) => {
       s.list.unshift(payload);
       s.meta.count += 1;
     })
     .addCase(updateInversion.fulfilled, (s, { payload }) => {
       const i = s.list.findIndex(inv => inv.id === payload.id);
       if (i !== -1) s.list[i] = payload;
     })
     .addCase(archiveInversion.fulfilled, (s, { payload }) => {
       s.list = s.list.filter(inv => inv.id !== payload.id);
     })
     .addCase(restoreInversion.fulfilled, (s, { payload }) => {
       s.list.unshift(payload);
     })
     .addCase(deleteInversion.fulfilled, (s, { payload: id }) => {
       s.list = s.list.filter(inv => inv.id !== id);
       if (s.meta.count > 0) s.meta.count -= 1;
     });
  }
});

export const { setPage, setContext, setFilters } = inversionesSlice.actions;
export default inversionesSlice.reducer;
