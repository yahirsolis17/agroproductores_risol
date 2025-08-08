// src/global/store/ventasSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ventaService } from '../../modules/gestion_huerta/services/ventaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  VentaHuerta,
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../../modules/gestion_huerta/types/ventaTypes';
import type { RootState } from './store';

export interface VentaFilters {
  tipoMango?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

interface PaginationMeta { count: number; next: string | null; previous: string | null; }
interface VentasState {
  list: VentaHuerta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  meta: PaginationMeta;
  huertaId: number | null;
  temporadaId: number | null;
  cosechaId: number | null;
  filters: VentaFilters;
}

const initialState: VentasState = {
  list: [], loading: false, loaded: false, error: null,
  page: 1,
  meta: { count: 0, next: null, previous: null },
  huertaId: null, temporadaId: null, cosechaId: null,
  filters: {}
};

export const fetchVentas = createAsyncThunk<
  { ventas: VentaHuerta[]; meta: PaginationMeta; page: number },
  void,
  { state: RootState; rejectValue: string }
>(
  'ventas/fetch',
  async (_, { getState, rejectWithValue }) => {
    const state = getState().ventas;
    const { huertaId, temporadaId, cosechaId, page, filters } = state;
    if (!huertaId || !temporadaId || !cosechaId) {
      return rejectWithValue('Faltan huerta, temporada o cosecha seleccionada');
    }
    try {
      const data = await ventaService.list(
        huertaId, temporadaId, cosechaId, page, 10, filters
      );
      return { ventas: data.ventas, meta: data.meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al cargar ventas');
    }
  }
);

export const createVenta = createAsyncThunk<
  VentaHuerta,
  VentaHuertaCreateData,
  { state: RootState; rejectValue: string }
>(
  'ventas/create',
  async (payload, { getState, rejectWithValue }) => {
    const { huertaId, temporadaId, cosechaId } = getState().ventas;
    if (!huertaId || !temporadaId || !cosechaId) {
      return rejectWithValue('Contexto incompleto');
    }
    try {
      const v = await ventaService.create(huertaId, temporadaId, cosechaId, payload);
      handleBackendNotification({ success: true, message_key: 'venta_create_success', data: { venta: v } });
      return v;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al crear venta');
    }
  }
);

export const updateVenta = createAsyncThunk<
  VentaHuerta,
  { id: number; payload: VentaHuertaUpdateData },
  { rejectValue: string }
>(
  'ventas/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const v = await ventaService.update(id, payload);
      handleBackendNotification({ success: true, message_key: 'venta_update_success', data: { venta: v } });
      return v;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
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
      const v = await ventaService.archive(id);
      handleBackendNotification({ success: true, message_key: 'venta_archivada', data: { venta: v } });
      return v;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
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
      const v = await ventaService.restore(id);
      handleBackendNotification({ success: true, message_key: 'venta_restaurada', data: { venta: v } });
      return v;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
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
      const info = await ventaService.remove(id);
      handleBackendNotification({ success: true, message_key: 'venta_delete_success', data: { info } });
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al eliminar venta');
    }
  }
);

const ventasSlice = createSlice({
  name: 'ventas',
  initialState,
  reducers: {
    setPage:      (s, a: PayloadAction<number>)       => { s.page = a.payload; },
    setContext:   (s, a: PayloadAction<{ huertaId: number; temporadaId: number; cosechaId: number }>) => {
      s.huertaId = a.payload.huertaId;
      s.temporadaId = a.payload.temporadaId;
      s.cosechaId = a.payload.cosechaId;
      s.page = 1;
    },
    setFilters:   (s, a: PayloadAction<VentaFilters>) => { s.filters = a.payload; s.page = 1; },
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
        s.list = s.list.filter(v=>v.id!==payload.id);
     })
     .addCase(restoreVenta.fulfilled,(s,{payload})=>{
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
