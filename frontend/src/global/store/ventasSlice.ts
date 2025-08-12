import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ventaService } from '../../modules/gestion_huerta/services/ventaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  VentaHuerta,
  VentaCreateData,
  VentaUpdateData,
  VentaFilters,
} from '../../modules/gestion_huerta/types/ventaTypes';
import type { RootState } from './store';

export interface PaginationMeta { count: number; next: string | null; previous: string | null; }
export interface VentasState {
  list: VentaHuerta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  meta: PaginationMeta;
  huertaId: number | null;
  /**
   * Identificador de la huerta rentada asociada.  Si la venta pertenece a
   * una huerta propia, este valor será null.  Se utiliza junto con
   * huertaId para determinar el contexto en el backend.
   */
  huertaRentadaId: number | null;
  temporadaId: number | null;
  cosechaId: number | null;
  /**
   * Filtros aplicados a la lista de ventas.  Incluye tipo de mango,
   * rangos de fechas y el estado (`activas`, `archivadas` o `todas`).
   */
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

/**
 * Thunk para cargar las ventas según contexto, página, estado y filtros.
 * Si no existe contexto (huerta, temporada, cosecha) devuelve reject.
 * El parámetro `estado` indica si se listan ventas activas, archivadas o todas.
 */
export const fetchVentas = createAsyncThunk<
  { ventas: VentaHuerta[]; meta: PaginationMeta; page: number },
  void,
  { state: RootState; rejectValue: string }
>(
  'ventas/fetch',
  async (_, { getState, rejectWithValue }) => {
    const state = getState().ventas;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId, page, filters } = state;
    // Debe existir al menos una huerta (propia o rentada) y las demás claves de contexto
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
      // Mostrar la notificación del backend, si existe
      handleBackendNotification(res);
      return { ventas: res.data.ventas, meta: res.data.meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al cargar ventas');
    }
  }
);

export const createVenta = createAsyncThunk<
  VentaHuerta,
  VentaCreateData,
  { state: RootState; rejectValue: string }
>(
  'ventas/create',
  async (payload, { getState, rejectWithValue }) => {
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = getState().ventas;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue('Contexto incompleto');
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
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al crear venta');
    }
  }
);

export const updateVenta = createAsyncThunk<
  VentaHuerta,
  { id: number; payload: VentaUpdateData },
  { rejectValue: string }
>(
  'ventas/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await ventaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al actualizar venta');
    }
  }
);

export const archiveVenta = createAsyncThunk<
  VentaHuerta,
  number,
  { rejectValue: string }
>(
  'ventas/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.archive(id);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al archivar venta');
    }
  }
);

export const restoreVenta = createAsyncThunk<
  VentaHuerta,
  number,
  { rejectValue: string }
>(
  'ventas/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.restore(id);
      handleBackendNotification(res);
      return res.data.venta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al restaurar venta');
    }
  }
);

export const deleteVenta = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>(
  'ventas/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.remove(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al eliminar venta');
    }
  }
);

const ventasSlice = createSlice({
  name: 'ventas',
  initialState,
  reducers: {
    setPage: (s, a: PayloadAction<number>) => {
      s.page = a.payload;
    },
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
    setFilters: (s, a: PayloadAction<VentaFilters>) => {
      s.filters = a.payload;
      s.page = 1;
    },
  },
  extraReducers: b => {
    b.addCase(fetchVentas.pending,  s => { s.loading = true; s.error = null; })
     .addCase(fetchVentas.fulfilled,(s,{payload})=>{
        s.list    = payload.ventas;
        s.meta    = payload.meta;
        s.page    = payload.page;
        s.loading = false;
        s.loaded  = true;
     })
     .addCase(fetchVentas.rejected,(s,{payload, error})=>{
        s.loading = false;
        s.error   = payload ?? error.message ?? 'Error';
        s.loaded  = true;
     })
     .addCase(createVenta.fulfilled,(s,{payload})=>{
        s.list.unshift(payload);
        s.meta.count += 1;
     })
     .addCase(updateVenta.fulfilled,(s,{payload})=>{
        const i = s.list.findIndex(v=>v.id===payload.id);
        if(i!==-1) s.list[i] = payload;
     })
     .addCase(archiveVenta.fulfilled,(s,{payload})=>{
        // Al archivar, eliminamos la venta de la lista actual (activos o estado actual)
        s.list = s.list.filter(v=>v.id!==payload.id);
     })
     .addCase(restoreVenta.fulfilled,(s,{payload})=>{
        // Al restaurar, insertamos la venta al inicio
        s.list.unshift(payload);
     })
     .addCase(deleteVenta.fulfilled,(s,{payload:id})=>{
        s.list = s.list.filter(v=>v.id!==id);
        if(s.meta.count>0) s.meta.count -= 1;
     });
  }
});

export const { setPage, setContext, setFilters } = ventasSlice.actions;
export default ventasSlice.reducer;