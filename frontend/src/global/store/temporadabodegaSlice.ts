// src/global/store/temporadabodegaSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

import type {
  TemporadaBodega,
  TemporadaBodegaCreateData,
  TemporadaBodegaUpdateData,
  EstadoTemporadaBodega,
} from "../../modules/gestion_bodega/types/temporadaBodegaTypes";

// Nota: defino PaginationMeta local para evitar el error de export faltante.
type PaginationMeta = {
  page: number;
  page_size: number;
  total_pages: number;
  count: number;
  next: string | null;
  previous: string | null;
};

// Importa el service como default (tu archivo exporta un objeto, no funciones sueltas)
import temporadaBodegaService from "../../modules/gestion_bodega/services/temporadaBodegaService";

// -------------------------
// Types de estado local
// -------------------------
export type TemporadasBodegaFilters = {
  page: number;
  page_size: number;
  ordering?: string;
  estado?: EstadoTemporadaBodega; // "activos" | "archivados" | "todos"
  bodegaId?: number;
  year?: number;
};

type OpsState = {
  listing: boolean;
  creating: boolean;
  updating: boolean;
  archiving: boolean;
  restoring: boolean;
  finalizing: boolean;
};

type SliceState = {
  items: TemporadaBodega[];
  meta: PaginationMeta;
  filters: TemporadasBodegaFilters;
  current: TemporadaBodega | null;
  ops: OpsState;
  error: string | null;
};

// -------------------------
// Helpers
// -------------------------
const emptyMeta: PaginationMeta = {
  page: 1,
  page_size: 10,
  total_pages: 1,
  count: 0,
  next: null,
  previous: null,
};

function getErrorMessage(err: any): string {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);
  if (data?.message) return String(data.message);
  return err?.message ?? "Ocurrió un error";
}

// -------------------------
// Initial state
// -------------------------
const initialState: SliceState = {
  items: [],
  meta: emptyMeta,
  filters: {
    page: 1,
    page_size: 10,
    ordering: undefined,
    estado: "activos",
    bodegaId: undefined,
    year: undefined,
  },
  current: null,
  ops: {
    listing: false,
    creating: false,
    updating: false,
    archiving: false,
    restoring: false,
    finalizing: false,
  },
  error: null,
};

// -------------------------
// Thunks
// -------------------------
export const fetchTemporadasBodega = createAsyncThunk(
  "temporadabodega/fetch",
  async (args: Partial<TemporadasBodegaFilters> | undefined, { rejectWithValue }) => {
    try {
      const { data } = await temporadaBodegaService.list({
        page: args?.page,
        page_size: args?.page_size,
        estado: args?.estado,
        bodegaId: args?.bodegaId,
        año: args?.year, // el service espera 'año'
        ordering: args?.ordering,
      });
      return { temporadas: data.temporadas, meta: data.meta as PaginationMeta };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const addTemporadaBodega = createAsyncThunk(
  "temporadabodega/create",
  async (payload: TemporadaBodegaCreateData & { bodegaId: number }, { rejectWithValue }) => {
    try {
      const { data } = await temporadaBodegaService.create(payload);
      return data as TemporadaBodega;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const editTemporadaBodega = createAsyncThunk(
  "temporadabodega/update",
  async ({ id, data }: { id: number; data: TemporadaBodegaUpdateData }, { rejectWithValue }) => {
    try {
      const resp = await temporadaBodegaService.update(id, data);
      return resp.data as TemporadaBodega;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const archiveTemporada = createAsyncThunk(
  "temporadabodega/archive",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.archivar(id);
      return { id, affected: (res as any).affected };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const restoreTemporada = createAsyncThunk(
  "temporadabodega/restore",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.restaurar(id);
      return { id, affected: (res as any).affected };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const finalizeTemporada = createAsyncThunk(
  "temporadabodega/finalize",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.toggleFinalizar(id);
      const temporada = res.data as TemporadaBodega | null;
      return { id: temporada?.id ?? id };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// -------------------------
// Slice
// -------------------------
const slice = createSlice({
  name: "temporadabodega",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<TemporadasBodegaFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload || 1;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.filters.page_size = action.payload || 10;
      state.filters.page = 1; // reset a página 1 al cambiar page_size
    },
    setOrdering(state, action: PayloadAction<string | undefined>) {
      state.filters.ordering = action.payload;
    },
    setBodegaFilter(state, action: PayloadAction<number | undefined>) {
      state.filters.bodegaId = action.payload;
      state.filters.page = 1;
    },
    setYearFilter(state, action: PayloadAction<number | undefined>) {
      state.filters.year = action.payload;
      state.filters.page = 1;
    },
    setEstado(state, action: PayloadAction<EstadoTemporadaBodega>) {
      state.filters.estado = action.payload;
      state.filters.page = 1;
    },
    setCurrentTemporada(state, action: PayloadAction<TemporadaBodega | null>) {
      state.current = action.payload;
    },
    resetTemporadasState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // LIST
    builder.addCase(fetchTemporadasBodega.pending, (state) => {
      state.ops.listing = true;
      state.error = null;
    });
    builder.addCase(fetchTemporadasBodega.fulfilled, (state, action) => {
      state.ops.listing = false;
      state.items = action.payload.temporadas;
      state.meta = action.payload.meta;
    });
    builder.addCase(fetchTemporadasBodega.rejected, (state, action) => {
      state.ops.listing = false;
      state.error = (action.payload as string) ?? "Error al cargar temporadas";
    });

    // CREATE
    builder.addCase(addTemporadaBodega.pending, (state) => {
      state.ops.creating = true;
      state.error = null;
    });
    builder.addCase(addTemporadaBodega.fulfilled, (state, action) => {
      state.ops.creating = false;
      state.current = action.payload;
    });
    builder.addCase(addTemporadaBodega.rejected, (state, action) => {
      state.ops.creating = false;
      state.error = (action.payload as string) ?? "Error al crear temporada";
    });

    // UPDATE
    builder.addCase(editTemporadaBodega.pending, (state) => {
      state.ops.updating = true;
      state.error = null;
    });
    builder.addCase(editTemporadaBodega.fulfilled, (state, action) => {
      state.ops.updating = false;
      const updated = action.payload;
      const idx = state.items.findIndex((t) => t.id === updated.id);
      if (idx >= 0) state.items[idx] = updated;
      if (state.current?.id === updated.id) state.current = updated;
    });
    builder.addCase(editTemporadaBodega.rejected, (state, action) => {
      state.ops.updating = false;
      state.error = (action.payload as string) ?? "Error al actualizar temporada";
    });

    // ARCHIVE
    builder.addCase(archiveTemporada.pending, (state) => {
      state.ops.archiving = true;
      state.error = null;
    });
    builder.addCase(archiveTemporada.fulfilled, (state, action) => {
      state.ops.archiving = false;
      const { id } = action.payload;
      const idx = state.items.findIndex((t) => t.id === id);
      if (idx >= 0) {
        (state.items[idx] as any).is_active = false;
        (state.items[idx] as any).archivado_en = new Date().toISOString();
      }
      if (state.current?.id === id) {
        (state.current as any).is_active = false;
      }
    });
    builder.addCase(archiveTemporada.rejected, (state, action) => {
      state.ops.archiving = false;
      state.error = (action.payload as string) ?? "Error al archivar temporada";
    });

    // RESTORE
    builder.addCase(restoreTemporada.pending, (state) => {
      state.ops.restoring = true;
      state.error = null;
    });
    builder.addCase(restoreTemporada.fulfilled, (state, action) => {
      state.ops.restoring = false;
      const { id } = action.payload;
      const idx = state.items.findIndex((t) => t.id === id);
      if (idx >= 0) {
        (state.items[idx] as any).is_active = true;
        (state.items[idx] as any).archivado_en = null;
      }
      if (state.current?.id === id) {
        (state.current as any).is_active = true;
      }
    });
    builder.addCase(restoreTemporada.rejected, (state, action) => {
      state.ops.restoring = false;
      state.error = (action.payload as string) ?? "Error al restaurar temporada";
    });

    // FINALIZE (toggle)
    builder.addCase(finalizeTemporada.pending, (state) => {
      state.ops.finalizing = true;
      state.error = null;
    });
    builder.addCase(finalizeTemporada.fulfilled, (state, action) => {
      state.ops.finalizing = false;
      const id = action.payload.id;
      const idx = state.items.findIndex((t) => t.id === id);
      if (idx >= 0) {
        (state.items[idx] as any).finalizada = !(state.items[idx] as any).finalizada;
      }
      if (state.current?.id === id) {
        (state.current as any).finalizada = !(state.current as any).finalizada;
      }
    });
    builder.addCase(finalizeTemporada.rejected, (state, action) => {
      state.ops.finalizing = false;
      state.error = (action.payload as string) ?? "Error al finalizar/reactivar temporada";
    });
  },
});

// -------------------------
// Actions
// -------------------------
export const {
  setFilters,
  setPage,
  setPageSize,
  setOrdering,
  setBodegaFilter,
  setYearFilter,
  setEstado,
  setCurrentTemporada,
  resetTemporadasState,
} = slice.actions;

// -------------------------
// Selectors
// -------------------------
// OJO: ajusta "temporadabodega" si en tu store.ts registraste el reducer con otro key.
export const selectTemporadas = (s: RootState) => (s as any).temporadabodega.items;
export const selectTemporadasMeta = (s: RootState) => (s as any).temporadabodega.meta;
export const selectTemporadasFilters = (s: RootState) => (s as any).temporadabodega.filters;
export const selectTemporadaCurrent = (s: RootState) => (s as any).temporadabodega.current;
export const selectTemporadaOps = (s: RootState) => (s as any).temporadabodega.ops;
export const selectTemporadasError = (s: RootState) => (s as any).temporadabodega.error;

// -------------------------
// Reducer
// -------------------------
export default slice.reducer;
