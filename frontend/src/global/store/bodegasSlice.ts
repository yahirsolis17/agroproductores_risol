// src/global/store/bodegasSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { bodegaService } from '../../modules/gestion_bodega/services/bodegaService';

import type {
  Bodega,
  BodegaCreateData,
  BodegaUpdateData,
  BodegaFilters,
  EstadoBodega,
  PaginationMeta,
} from '../../modules/gestion_bodega/types/bodegaTypes';

/** Estado del slice (homólogo a huerta). */
interface BodegasState {
  list: Bodega[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  estado: EstadoBodega;
  filters: BodegaFilters;
  meta: PaginationMeta;
}

const initialState: BodegasState = {
  list: [],
  loading: false,
  loaded: false,
  error: null,
  page: 1,
  estado: 'activos',
  filters: {},
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 },
};

/* ───────────────────────────────────────────────────────────
 * THUNKS  (mismo patrón que gestión_huerta)
 * ─────────────────────────────────────────────────────────── */

/** Listado con filtros/estado y paginación. */
export const fetchBodegas = createAsyncThunk<
  { bodegas: Bodega[]; meta: PaginationMeta; page: number },
  { page: number; estado: EstadoBodega; filters: BodegaFilters },
  { rejectValue: string }
>('bodegas/fetchAll', async ({ page, estado, filters }, thunkAPI) => {
  try {
    const { signal } = thunkAPI;
    const { bodegas, meta } = await bodegaService.list(page, estado, filters, { signal });
    return { bodegas, meta, page };
  } catch (err: any) {
    handleBackendNotification(err?.response?.data);
    return thunkAPI.rejectWithValue('Error al cargar bodegas');
  }
});

/** Crear. */
export const createBodega = createAsyncThunk<Bodega, BodegaCreateData, { rejectValue: string }>(
  'bodegas/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await bodegaService.create(payload);
      handleBackendNotification(res);
      return res?.data?.bodega as Bodega;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al crear bodega');
    }
  }
);

/** Update parcial. */
export const updateBodega = createAsyncThunk<
  Bodega,
  { id: number; payload: BodegaUpdateData },
  { rejectValue: string }
>('bodegas/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await bodegaService.update(id, payload);
    handleBackendNotification(res);
    return res?.data?.bodega as Bodega;
  } catch (err: any) {
    handleBackendNotification(err?.response?.data);
    return rejectWithValue('Error al actualizar bodega');
  }
});

/** Delete (hard en vista). */
export const deleteBodega = createAsyncThunk<number, number, { rejectValue: string }>(
  'bodegas/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await bodegaService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al eliminar bodega');
    }
  }
);

/** Archivar (soft). */
export const archiveBodega = createAsyncThunk<{ id: number }, number, { rejectValue: string }>(
  'bodegas/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await bodegaService.archivar(id);
      handleBackendNotification(res);
      return { id };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al archivar bodega');
    }
  }
);

/** Restaurar. */
export const restoreBodega = createAsyncThunk<{ id: number }, number, { rejectValue: string }>(
  'bodegas/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await bodegaService.restaurar(id);
      handleBackendNotification(res);
      return { id };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      return rejectWithValue('Error al restaurar bodega');
    }
  }
);

/* ───────────────────────────────────────────────────────────
 * SLICE
 * ─────────────────────────────────────────────────────────── */

const bodegasSlice = createSlice({
  // IMPORTANTE: este name debe ser 'bodegas' para que el hook useBodegas seleccione s.bodegas
  name: 'bodegas',
  initialState,
  reducers: {
    setBPage: (s, a: PayloadAction<number>) => {
      s.page = a.payload;
    },
    setBEstado: (s, a: PayloadAction<EstadoBodega>) => {
      s.estado = a.payload;
      s.page = 1; // reset al cambiar pestaña
    },
    setBFilters: (s, a: PayloadAction<BodegaFilters>) => {
      s.filters = { ...a.payload };
      s.page = 1; // reset para evitar out-of-range
    },
    clear: () => ({ ...initialState }),
  },
  extraReducers: (b) => {
    // fetch
    b.addCase(fetchBodegas.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchBodegas.fulfilled, (s, { payload }) => {
      s.list = payload.bodegas;
      s.meta = payload.meta;
      s.page = payload.page;
      s.loading = false;
      s.loaded = true;
    });
    b.addCase(fetchBodegas.rejected, (s, { payload, error }) => {
      s.loading = false;
      s.loaded = true;
      s.error = (payload as string) ?? error.message ?? 'Error';
    });

    // create
    b.addCase(createBodega.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') s.list.unshift(payload); // UX: aparece arriba si estamos en activos
      s.meta.count += 1;
    });

    // update
    b.addCase(updateBodega.fulfilled, (s, { payload }) => {
      const i = s.list.findIndex((x) => x.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });

    // delete
    b.addCase(deleteBodega.fulfilled, (s, { payload: id }) => {
      s.list = s.list.filter((x) => x.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    // archive
    b.addCase(archiveBodega.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.list = s.list.filter((x) => x.id !== payload.id);
      } else {
        const i = s.list.findIndex((x) => x.id === payload.id);
        if (i !== -1) {
          s.list[i].archivado_en = new Date().toISOString();
          s.list[i].is_active = false;
        }
      }
    });

    // restore
    b.addCase(restoreBodega.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.list = s.list.filter((x) => x.id !== payload.id);
      } else {
        const i = s.list.findIndex((x) => x.id === payload.id);
        if (i !== -1) {
          s.list[i].archivado_en = null;
          s.list[i].is_active = true;
        }
      }
    });
  },
});

export const { setBPage, setBEstado, setBFilters, clear } = bodegasSlice.actions;
export default bodegasSlice.reducer;
