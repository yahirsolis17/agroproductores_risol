import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ventaService, VentaFilters as SvcFilters } from '../../modules/gestion_huerta/services/ventaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  VentaHuerta,
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../../modules/gestion_huerta/types/ventaTypes';
import type { RootState } from './store';

export type EstadoFiltro = 'activas' | 'archivadas' | 'todas';
export interface VentaFilters extends SvcFilters {}

interface PaginationMeta { count: number; next: string | null; previous: string | null };

interface VentasState {
  list: VentaHuerta[];
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

  filters: VentaFilters;
}

const initialState: VentasState = {
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
export const fetchVentas = createAsyncThunk<
  { ventas: VentaHuerta[]; meta: PaginationMeta; page: number },
  void,
  { state: RootState; rejectValue: string }
>(
  'ventas/fetch',
  async (_, { getState, rejectWithValue }) => {
    const s = getState().ventas;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId, page, filters } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue('Faltan IDs de contexto (huerta/huerta_rentada, temporada o cosecha).');
    }
    try {
      const res = await ventaService.list(
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
        ventas: res.data.ventas,
        meta: res.data.meta,
        page,
      };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue('Error al cargar ventas');
    }
  }
);

export const createVenta = createAsyncThunk<
  VentaHuerta,
  VentaHuertaCreateData,
  { state: RootState; rejectValue: any }
>(
  'ventas/create',
  async (payload, { getState, rejectWithValue }) => {
    const s = getState().ventas;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue({ message: 'Contexto incompleto' });
    }
    try {
      const res = await ventaService.create(
        {
          huertaId: huertaId ?? undefined,
          huertaRentadaId: huertaRentadaId ?? undefined,
          temporadaId: temporadaId!,
          cosechaId: cosechaId!,
        },
        payload
      );
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const updateVenta = createAsyncThunk<
  VentaHuerta,
  { id: number; payload: VentaHuertaUpdateData },
  { rejectValue: any }
>(
  'ventas/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await ventaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const archiveVenta = createAsyncThunk<
  VentaHuerta,
  number,
  { state: RootState; rejectValue: any }
>(
  'ventas/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.archivar(id);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const restoreVenta = createAsyncThunk<
  VentaHuerta,
  number,
  { state: RootState; rejectValue: any }
>(
  'ventas/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.restaurar(id);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

export const deleteVenta = createAsyncThunk<
  number,
  number,
  { rejectValue: any }
>(
  'ventas/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.remove(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

// ───────────────── Slice ─────────────────
const ventasSlice = createSlice({
  name: 'ventas',
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
    setFilters: (s, a: PayloadAction<VentaFilters>) => { s.filters = a.payload; s.page = 1; },
    clear: () => ({ ...initialState }),
  },
  extraReducers: b => {
    b.addCase(fetchVentas.pending, s => { s.loading = true; s.error = null; })
     .addCase(fetchVentas.fulfilled, (s, { payload }) => {
       s.list = payload.ventas;
       s.meta = payload.meta;
       s.page = payload.page;
       s.loading = false;
       s.loaded = true;
     })
     .addCase(fetchVentas.rejected, (s, { payload, error }) => {
       s.loading = false;
       s.error = (payload as string) ?? error.message ?? 'Error';
       s.loaded = true;
     })

     // CREATE → insert inmediata
     .addCase(createVenta.fulfilled, (s, { payload }) => {
       s.list.unshift(payload);
       s.meta.count += 1;
     })

     // UPDATE in-place
     .addCase(updateVenta.fulfilled, (s, { payload }) => {
       const i = s.list.findIndex(v => v.id === payload.id);
       if (i !== -1) s.list[i] = payload;
     })

     // ARCHIVAR: manejo tab-aware
     .addCase(archiveVenta.fulfilled, (s, { payload }) => {
       const estado = s.filters.estado ?? 'activas';
       if (estado === 'activas') {
         s.list = s.list.filter(v => v.id !== payload.id);
       } else if (estado === 'todas') {
         const i = s.list.findIndex(v => v.id === payload.id);
         if (i !== -1) s.list[i] = payload;
       }
       // en 'archivadas' no estaba visible
     })

     // RESTAURAR: manejo tab-aware
     .addCase(restoreVenta.fulfilled, (s, { payload }) => {
       const estado = s.filters.estado ?? 'activas';
       if (estado === 'archivadas') {
         s.list = s.list.filter(v => v.id !== payload.id);
       } else if (estado === 'activas') {
         // si no existe, unshift; si existe, actualiza
         const i = s.list.findIndex(v => v.id === payload.id);
         if (i === -1) s.list.unshift(payload);
         else s.list[i] = payload;
       } else {
         // 'todas'
         const i = s.list.findIndex(v => v.id === payload.id);
         if (i !== -1) s.list[i] = payload;
       }
     })

     // DELETE
     .addCase(deleteVenta.fulfilled, (s, { payload: id }) => {
       s.list = s.list.filter(v => v.id !== id);
       if (s.meta.count > 0) s.meta.count -= 1;
     });
  }
});

export const { setPage, setContext, setFilters, clear } = ventasSlice.actions;
export default ventasSlice.reducer;
