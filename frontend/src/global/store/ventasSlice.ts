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

const PAGE_SIZE = 10;

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

// Helpers
function ctxFromState(s: VentasState) {
  return {
    huertaId: s.huertaId ?? undefined,
    huertaRentadaId: s.huertaRentadaId ?? undefined,
    temporadaId: s.temporadaId!,
    cosechaId: s.cosechaId!,
  };
}

type PagePayload = { ventas: VentaHuerta[]; meta: PaginationMeta; page: number };

async function fetchSameOrPrevPageSilently(s: VentasState): Promise<PagePayload> {
  // 1) intento con la página actual
  const res1 = await ventaService.list(ctxFromState(s), s.page, PAGE_SIZE, s.filters);
  const items1 = res1?.data?.ventas ?? [];
  const meta1  = res1?.data?.meta ?? { count: 0, next: null, previous: null };

  if (items1.length > 0 || s.page === 1) {
    return { ventas: items1, meta: meta1, page: s.page };
  }

  // 2) si quedó vacía y no es la primera, pedir la anterior
  const newPage = Math.max(1, s.page - 1);
  const res2 = await ventaService.list(ctxFromState(s), newPage, PAGE_SIZE, s.filters);
  const items2 = res2?.data?.ventas ?? [];
  const meta2  = res2?.data?.meta ?? { count: 0, next: null, previous: null };

  return { ventas: items2, meta: meta2, page: newPage };
}

/* ───────────────── Thunks ───────────────── */
export const fetchVentas = createAsyncThunk<
  PagePayload,
  void,
  { state: RootState; rejectValue: string }
>(
  'ventas/fetch',
  async (_, { getState, rejectWithValue }) => {
    const s = getState().ventas;
    const { huertaId, huertaRentadaId, temporadaId, cosechaId } = s;
    if ((!huertaId && !huertaRentadaId) || !temporadaId || !cosechaId) {
      return rejectWithValue('Faltan IDs de contexto (huerta/huerta_rentada, temporada o cosecha).');
    }
    try {
      const res = await ventaService.list(ctxFromState(s), s.page, PAGE_SIZE, s.filters);
      handleBackendNotification(res);
      return { ventas: res.data.ventas, meta: res.data.meta, page: s.page };
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
      const res = await ventaService.create(ctxFromState(s), payload);
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

// ARCHIVAR: repaginar si corresponde (como inversiones)
export const archiveVenta = createAsyncThunk<
  { venta: VentaHuerta; pageData: PagePayload | null },
  number,
  { state: RootState; rejectValue: any }
>(
  'ventas/archive',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await ventaService.archivar(id);
      handleBackendNotification(res);

      const s = getState().ventas;
      const estado = s.filters.estado ?? 'activas';

      if (estado === 'todas') {
        // en "todas" basta refrescar la fila
        return { venta: res.data.venta, pageData: null };
      }
      // en "activas" (desaparece) y en "archivadas" no estaba: repaginar
      const pageData = await fetchSameOrPrevPageSilently(s);
      return { venta: res.data.venta, pageData };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

// RESTAURAR: repaginar en "archivadas"; en "todas" actualizar fila
export const restoreVenta = createAsyncThunk<
  { venta: VentaHuerta; pageData: PagePayload | null },
  number,
  { state: RootState; rejectValue: any }
>(
  'ventas/restore',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await ventaService.restaurar(id);
      handleBackendNotification(res);

      const s = getState().ventas;
      const estado = s.filters.estado ?? 'activas';

      if (estado === 'todas') {
        return { venta: res.data.venta, pageData: null };
      }
      if (estado === 'archivadas') {
        const pageData = await fetchSameOrPrevPageSilently(s);
        return { venta: res.data.venta, pageData };
      }
      // en "activas" normalmente no hay restaurar
      return { venta: res.data.venta, pageData: null };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

// ELIMINAR: repaginar siempre
export const deleteVenta = createAsyncThunk<
  { id: number; pageData: PagePayload },
  number,
  { state: RootState; rejectValue: any }
>(
  'ventas/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await ventaService.remove(id);
      handleBackendNotification(res);

      const s = getState().ventas;
      const pageData = await fetchSameOrPrevPageSilently(s);
      return { id, pageData };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data || err);
      return rejectWithValue(err?.response?.data || err);
    }
  }
);

/* ───────────────── Slice ───────────────── */
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

     // ARCHIVAR
     .addCase(archiveVenta.fulfilled, (s, { payload }) => {
       const estado = s.filters.estado ?? 'activas';
       if (estado === 'todas') {
         const i = s.list.findIndex(v => v.id === payload.venta.id);
         if (i !== -1) s.list[i] = payload.venta;
       } else if (payload.pageData) {
         s.list = payload.pageData.ventas;
         s.meta = payload.pageData.meta;
         s.page = payload.pageData.page;
       }
     })

     // RESTAURAR
     .addCase(restoreVenta.fulfilled, (s, { payload }) => {
       const estado = s.filters.estado ?? 'activas';
       if (estado === 'todas') {
         const i = s.list.findIndex(v => v.id === payload.venta.id);
         if (i !== -1) s.list[i] = payload.venta;
       } else if (estado === 'archivadas' && payload.pageData) {
         s.list = payload.pageData.ventas;
         s.meta = payload.pageData.meta;
         s.page = payload.pageData.page;
       } else if (estado === 'activas') {
         const i = s.list.findIndex(v => v.id === payload.venta.id);
         if (i !== -1) s.list.splice(i, 1);
         s.list.unshift(payload.venta);
       }
     })

     // DELETE
     .addCase(deleteVenta.fulfilled, (s, { payload }) => {
       s.list = payload.pageData.ventas;
       s.meta = payload.pageData.meta;
       s.page = payload.pageData.page;
     });
  }
});

export const { setPage, setContext, setFilters, clear } = ventasSlice.actions;
export default ventasSlice.reducer;
