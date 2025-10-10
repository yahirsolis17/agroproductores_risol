// src/global/store/temporadabodegaSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { handleBackendNotification } from "../utils/NotificationEngine";

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
  estado?: EstadoTemporadaBodega; // "activas" | "archivadas" | "todas"
  bodegaId?: number;
  year?: number;
  finalizada?: boolean | null;
};

type OpsState = {
  listing: boolean;
  creating: boolean;
  updating: boolean;
  archiving: boolean;
  restoring: boolean;
  finalizing: boolean;
  deleting: boolean;
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
    estado: "activas",
    bodegaId: undefined,
    year: undefined,
    finalizada: null,
  },
  current: null,
  ops: {
    listing: false,
    creating: false,
    updating: false,
    archiving: false,
    restoring: false,
    finalizing: false,
    deleting: false,
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
      const response = await temporadaBodegaService.list({
        page: args?.page,
        page_size: args?.page_size,
        estado: args?.estado,
        bodegaId: args?.bodegaId,
        año: args?.year, // el service espera 'año'
        finalizada: args?.finalizada ?? null,
        ordering: args?.ordering,
      });
      handleBackendNotification(response);
      return { temporadas: response.data.temporadas, meta: response.data.meta as PaginationMeta };
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp) handleBackendNotification(resp);
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const addTemporadaBodega = createAsyncThunk(
  "temporadabodega/create",
  async (payload: TemporadaBodegaCreateData, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.create(payload);
      handleBackendNotification(res);
      return res.data as TemporadaBodega;
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp) handleBackendNotification(resp);
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const editTemporadaBodega = createAsyncThunk(
  "temporadabodega/update",
  async ({ id, data }: { id: number; data: TemporadaBodegaUpdateData }, { rejectWithValue }) => {
    try {
      const resp = await temporadaBodegaService.update(id, data);
      handleBackendNotification(resp);
      return resp.data as TemporadaBodega;
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp) handleBackendNotification(resp);
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const archiveTemporada = createAsyncThunk(
  "temporadabodega/archive",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.archivar(id);
      handleBackendNotification(res);
      return res.data as TemporadaBodega | null;
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp) handleBackendNotification(resp);
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const restoreTemporada = createAsyncThunk(
  "temporadabodega/restore",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.restaurar(id);
      handleBackendNotification(res);
      return res.data as TemporadaBodega | null;
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp) handleBackendNotification(resp);
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const finalizeTemporada = createAsyncThunk(
  "temporadabodega/finalize",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.toggleFinalizar(id);
      handleBackendNotification(res);
      return res.data as TemporadaBodega | null;
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp) handleBackendNotification(resp);
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const deleteTemporada = createAsyncThunk(
  "temporadabodega/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.remove(id);
      handleBackendNotification(res);
      const payload = res.data as { deleted_id?: number; temporada_id?: number } | null;
      const deletedId = payload?.deleted_id ?? payload?.temporada_id ?? id;
      return deletedId;
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp) handleBackendNotification(resp);
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
    setFinalizadaFilter(state, action: PayloadAction<boolean | null | undefined>) {
      state.filters.finalizada = action.payload ?? null;
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
      const temporada = action.payload;
      if (temporada) {
        const currentEstado = state.filters.estado ?? "activas";
        if (currentEstado === "activas") {
          state.items = state.items.filter((t) => t.id !== temporada.id);
          if (state.meta.count > 0) {
            state.meta.count -= 1;
          }
        } else {
          const idx = state.items.findIndex((t) => t.id === temporada.id);
          if (idx >= 0) state.items[idx] = temporada;
        }
        if (state.current?.id === temporada.id) {
          state.current = currentEstado === "activas" ? null : temporada;
        }
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
      const temporada = action.payload;
      if (temporada) {
        const currentEstado = state.filters.estado ?? "activas";
        if (currentEstado === "archivadas") {
          state.items = state.items.filter((t) => t.id !== temporada.id);
          if (state.meta.count > 0) {
            state.meta.count -= 1;
          }
        } else {
          const idx = state.items.findIndex((t) => t.id === temporada.id);
          if (idx >= 0) state.items[idx] = temporada;
        }
        if (state.current?.id === temporada.id) {
          state.current = currentEstado === "archivadas" ? null : temporada;
        }
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
      const temporada = action.payload;
      if (temporada) {
        const idx = state.items.findIndex((t) => t.id === temporada.id);
        if (idx >= 0) state.items[idx] = temporada;
        if (state.current?.id === temporada.id) {
          state.current = temporada;
        }
      }
    });
    builder.addCase(finalizeTemporada.rejected, (state, action) => {
      state.ops.finalizing = false;
      state.error = (action.payload as string) ?? "Error al finalizar/reactivar temporada";
    });

    // DELETE
    builder.addCase(deleteTemporada.pending, (state) => {
      state.ops.deleting = true;
      state.error = null;
    });
    builder.addCase(deleteTemporada.fulfilled, (state, action) => {
      state.ops.deleting = false;
      const deletedId = action.payload;
      state.items = state.items.filter((t) => t.id !== deletedId);
      if (state.current?.id === deletedId) {
        state.current = null;
      }
      if (state.meta.count > 0) {
        state.meta.count -= 1;
        if (state.meta.page_size) {
          state.meta.total_pages = Math.max(1, Math.ceil(state.meta.count / state.meta.page_size));
        }
      }
    });
    builder.addCase(deleteTemporada.rejected, (state, action) => {
      state.ops.deleting = false;
      state.error = (action.payload as string) ?? "Error al eliminar temporada";
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
  setFinalizadaFilter,
  setEstado,
  setCurrentTemporada,
  resetTemporadasState,
} = slice.actions;

// -------------------------
// Selectors
// -------------------------
// Selectores alineados con la clave "temporadasBodega" definida en store.ts.
export const selectTemporadas = (s: RootState) => s.temporadasBodega.items;
export const selectTemporadasMeta = (s: RootState) => s.temporadasBodega.meta;
export const selectTemporadasFilters = (s: RootState) => s.temporadasBodega.filters;
export const selectTemporadaCurrent = (s: RootState) => s.temporadasBodega.current;
export const selectTemporadaOps = (s: RootState) => s.temporadasBodega.ops;
export const selectTemporadasError = (s: RootState) => s.temporadasBodega.error;

// -------------------------
// Reducer
// -------------------------
export default slice.reducer;
