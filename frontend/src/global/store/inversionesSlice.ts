import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inversionService, InversionFilters as SvcFilters } from '../../modules/gestion_huerta/services/inversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  InversionHuerta,
  InversionHuertaCreateData,
  InversionHuertaUpdateData,
} from '../../modules/gestion_huerta/types/inversionTypes';
import type { RootState } from './store';

export type EstadoFiltro = 'activas' | 'archivadas' | 'todas';
export interface InversionFilters extends SvcFilters {}

interface PaginationMeta { count: number; next: string | null; previous: string | null };

interface InversionesState {
  list: InversionHuerta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  meta: PaginationMeta;

  // contexto (FKs)
  huertaId: number | null;
  huertaRentadaId: number | null;
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

// ───────────────── Thunks ─────────────────
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
      const res = await inversionService.list(
        {
          huertaId: huertaId ?? undefined,
          huertaRentadaId: huertaRentadaId ?? undefined,
          temporadaId: temporadaId!,
          cosechaId: cosechaId!,
        },
        page,
        10,
        filters
      );
      handleBackendNotification(res);
      return {
        inversiones: res.data.inversiones,
        meta: res.data.meta,
        page,
      };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al cargar inversiones');
    }
  }
);

export const createInversion = createAsyncThunk<
  InversionHuerta,
  InversionHuertaCreateData,
  { state: RootState; rejectValue: any }
>(
  'inversiones/create',
  async (payload, { getState, rejectWithValue }) => {
    const s = getState().inversiones;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue({ message: 'Contexto incompleto' });
    }
    try {
      const res = await inversionService.create(
        {
          huertaId: huertaId ?? undefined,
          huertaRentadaId: huertaRentadaId ?? undefined,
          temporadaId: temporadaId!,
          cosechaId: cosechaId!,
        },
        payload
      );
      handleBackendNotification(res);
      return res.data.inversion;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const updateInversion = createAsyncThunk<
  InversionHuerta,
  { id: number; payload: InversionHuertaUpdateData },
  { rejectValue: any }
>(
  'inversiones/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await inversionService.update(id, payload);
      handleBackendNotification(res);
      return res.data.inversion;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const archiveInversion = createAsyncThunk<
  InversionHuerta,
  number,
  { rejectValue: any }
>(
  'inversiones/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await inversionService.archivar(id);
      handleBackendNotification(res);
      return res.data.inversion;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const restoreInversion = createAsyncThunk<
  InversionHuerta,
  number,
  { rejectValue: any }
>(
  'inversiones/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await inversionService.restaurar(id);
      handleBackendNotification(res);
      return res.data.inversion;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const deleteInversion = createAsyncThunk<
  number,
  number,
  { rejectValue: any }
>(
  'inversiones/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await inversionService.remove(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

// ───────────────── Slice ─────────────────
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
    clear: () => ({ ...initialState }),
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

     // CREATE → insert inmediata
     .addCase(createInversion.fulfilled, (s, { payload }) => {
       s.list.unshift(payload);
       s.meta.count += 1;
     })

     // UPDATE in-place
     .addCase(updateInversion.fulfilled, (s, { payload }) => {
       const i = s.list.findIndex(inv => inv.id === payload.id);
       if (i !== -1) s.list[i] = payload;
     })

     // ARCHIVAR: si estás en "activas", se remueve de la vista
     .addCase(archiveInversion.fulfilled, (s, { payload }) => {
       s.list = s.list.filter(inv => inv.id !== payload.id);
     })

     // RESTAURAR: vuelve arriba
     .addCase(restoreInversion.fulfilled, (s, { payload }) => {
       s.list.unshift(payload);
     })

     // DELETE
     .addCase(deleteInversion.fulfilled, (s, { payload: id }) => {
       s.list = s.list.filter(inv => inv.id !== id);
       if (s.meta.count > 0) s.meta.count -= 1;
     });
  }
});

export const { setPage, setContext, setFilters, clear } = inversionesSlice.actions;
export default inversionesSlice.reducer;
