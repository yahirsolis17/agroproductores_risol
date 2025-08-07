import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ventaService, VentaFilters, Estado } from '../../modules/gestion_huerta/services/ventaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Venta, VentaCreate, VentaUpdate } from '../../modules/gestion_huerta/types/ventaTypes';

interface PaginationMeta { count: number; next: string | null; previous: string | null; }
interface VentaState {
  list: Venta[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  estado: Estado;
  filters: VentaFilters;
  meta: PaginationMeta;
  cosechaId?: number;
}

const initialState: VentaState = {
  list: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  estado: 'activos',
  filters: {},
  meta: { count: 0, next: null, previous: null },
  cosechaId: undefined,
};

export const fetchVentas = createAsyncThunk<
  { ventas: Venta[]; meta: PaginationMeta; page: number },
  { page: number; estado: Estado; filters: VentaFilters; cosechaId: number },
  { rejectValue: string }
>(
  'ventas/fetchAll',
  async ({ page, estado, filters, cosechaId }, { rejectWithValue }) => {
    try {
      const { ventas, meta } = await ventaService.list(page, estado, cosechaId, filters);
      return { ventas, meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al cargar ventas');
    }
  }
);

export const createVenta = createAsyncThunk<
  Venta,
  VentaCreate,
  { rejectValue: string }
>(
  'ventas/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await ventaService.create(payload);
      handleBackendNotification(res);
      return res.data.venta as Venta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al registrar venta');
    }
  }
);

export const updateVenta = createAsyncThunk<
  Venta,
  { id: number; payload: VentaUpdate },
  { rejectValue: string }
>(
  'ventas/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await ventaService.update(id, payload);
      handleBackendNotification(res);
      return res.data.venta as Venta;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al actualizar venta');
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
      const res = await ventaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al eliminar venta');
    }
  }
);

export const archiveVenta = createAsyncThunk<
  { id: number; archivado_en: string },
  number,
  { rejectValue: string }
>(
  'ventas/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.archivar(id);
      handleBackendNotification(res);
      return { id, archivado_en: new Date().toISOString() };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al archivar venta');
    }
  }
);

export const restoreVenta = createAsyncThunk<
  { id: number; archivado_en: null },
  number,
  { rejectValue: string }
>(
  'ventas/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ventaService.restaurar(id);
      handleBackendNotification(res);
      return { id, archivado_en: null };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al restaurar venta');
    }
  }
);

const ventasSlice = createSlice({
  name: 'ventas',
  initialState,
  reducers: {
    setVPage:    (s, a: PayloadAction<number>)            => { s.page = a.payload; },
    setVEstado:  (s, a: PayloadAction<Estado>)            => { s.estado = a.payload; s.page = 1; },
    setVFilters: (s, a: PayloadAction<VentaFilters>)      => { s.filters = a.payload; s.page = 1; },
    setVCosecha: (s, a: PayloadAction<number | undefined>)=> { s.cosechaId = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    b.addCase(fetchVentas.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchVentas.fulfilled, (s, { payload }) => {
      s.list = payload.ventas;
      s.meta = payload.meta;
      s.page = payload.page;
      s.loading = false;
      s.loaded = true;
    });
    b.addCase(fetchVentas.rejected, (s, { payload, error }) => {
      s.loading = false; s.loaded = true; s.error = payload ?? error.message ?? 'Error';
    });

    b.addCase(createVenta.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') s.list.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updateVenta.fulfilled, (s, { payload }) => {
      const i = s.list.findIndex(x => x.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });
    b.addCase(deleteVenta.fulfilled, (s, { payload: id }) => {
      s.list = s.list.filter(x => x.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    b.addCase(archiveVenta.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.list = s.list.filter(x => x.id !== payload.id);
      } else {
        const i = s.list.findIndex(x => x.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
    b.addCase(restoreVenta.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.list = s.list.filter(x => x.id !== payload.id);
      } else {
        const i = s.list.findIndex(x => x.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
  },
});

export const { setVPage, setVEstado, setVFilters, setVCosecha } = ventasSlice.actions;
export default ventasSlice.reducer;
