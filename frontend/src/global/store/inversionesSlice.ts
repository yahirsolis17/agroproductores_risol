import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inversionService, InversionFilters, Estado } from '../../modules/gestion_huerta/services/inversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { Inversion, InversionCreate, InversionUpdate } from '../../modules/gestion_huerta/types/inversionTypes';

interface PaginationMeta { count: number; next: string | null; previous: string | null; }
interface InversionState {
  list: Inversion[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  page: number;
  estado: Estado;
  filters: InversionFilters;
  meta: PaginationMeta;
  cosechaId?: number; // contexto obligatorio
}

const initialState: InversionState = {
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

export const fetchInversiones = createAsyncThunk<
  { inversiones: Inversion[]; meta: PaginationMeta; page: number },
  { page: number; estado: Estado; filters: InversionFilters; cosechaId: number },
  { rejectValue: string }
>(
  'inversiones/fetchAll',
  async ({ page, estado, filters, cosechaId }, { rejectWithValue }) => {
    try {
      const { inversiones, meta } = await inversionService.list(page, estado, cosechaId, filters);
      return { inversiones, meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al cargar inversiones');
    }
  }
);

export const createInversion = createAsyncThunk<
  Inversion,
  InversionCreate,
  { rejectValue: string }
>(
  'inversiones/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await inversionService.create(payload);
      handleBackendNotification(res);
      return res.data.inversion as Inversion;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al crear inversión');
    }
  }
);

export const updateInversion = createAsyncThunk<
  Inversion,
  { id: number; payload: InversionUpdate },
  { rejectValue: string }
>(
  'inversiones/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await inversionService.update(id, payload);
      handleBackendNotification(res);
      return res.data.inversion as Inversion;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al actualizar inversión');
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
      const res = await inversionService.delete(id);
      handleBackendNotification(res);
      return id;
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al eliminar inversión');
    }
  }
);

export const archiveInversion = createAsyncThunk<
  { id: number; archivado_en: string },
  number,
  { rejectValue: string }
>(
  'inversiones/archive',
  async (id, { rejectWithValue }) => {
    try {
      const res = await inversionService.archivar(id);
      handleBackendNotification(res);
      return { id, archivado_en: new Date().toISOString() };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al archivar inversión');
    }
  }
);

export const restoreInversion = createAsyncThunk<
  { id: number; archivado_en: null },
  number,
  { rejectValue: string }
>(
  'inversiones/restore',
  async (id, { rejectWithValue }) => {
    try {
      const res = await inversionService.restaurar(id);
      handleBackendNotification(res);
      return { id, archivado_en: null };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue('Error al restaurar inversión');
    }
  }
);

const inversionesSlice = createSlice({
  name: 'inversiones',
  initialState,
  reducers: {
    setIPage:    (s, a: PayloadAction<number>)              => { s.page = a.payload; },
    setIEstado:  (s, a: PayloadAction<Estado>)              => { s.estado = a.payload; s.page = 1; },
    setIFilters: (s, a: PayloadAction<InversionFilters>)    => { s.filters = a.payload; s.page = 1; },
    setICosecha: (s, a: PayloadAction<number | undefined>)  => { s.cosechaId = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    b.addCase(fetchInversiones.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchInversiones.fulfilled, (s, { payload }) => {
      s.list = payload.inversiones;
      s.meta = payload.meta;
      s.page = payload.page;
      s.loading = false;
      s.loaded = true;
    });
    b.addCase(fetchInversiones.rejected, (s, { payload, error }) => {
      s.loading = false; s.loaded = true; s.error = payload ?? error.message ?? 'Error';
    });

    b.addCase(createInversion.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') s.list.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updateInversion.fulfilled, (s, { payload }) => {
      const i = s.list.findIndex(x => x.id === payload.id);
      if (i !== -1) s.list[i] = payload;
    });
    b.addCase(deleteInversion.fulfilled, (s, { payload: id }) => {
      s.list = s.list.filter(x => x.id !== id);
      if (s.meta.count > 0) s.meta.count -= 1;
    });

    b.addCase(archiveInversion.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.list = s.list.filter(x => x.id !== payload.id);
      } else {
        const i = s.list.findIndex(x => x.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
    b.addCase(restoreInversion.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.list = s.list.filter(x => x.id !== payload.id);
      } else {
        const i = s.list.findIndex(x => x.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
  },
});

export const { setIPage, setIEstado, setIFilters, setICosecha } = inversionesSlice.actions;
export default inversionesSlice.reducer;
