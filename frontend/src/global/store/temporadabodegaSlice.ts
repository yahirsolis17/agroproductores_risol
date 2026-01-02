// src/global/store/temporadabodegaSlice.ts
// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { handleBackendNotification } from "../utils/NotificationEngine";
import { extractApiMessage } from "../api/errorUtils";

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
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: unknown } })?.response?.data;
      if (resp) handleBackendNotification(resp);
      return rejectWithValue(resp || { message: 'Error desconocido' });
    }
  }
);

export const addTemporadaBodega = createAsyncThunk(
  "temporadabodega/create",
  async (payload: TemporadaBodegaCreateData, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.create(payload);
      handleBackendNotification(res);
      if (!res?.success) {
        const key = res?.notification?.key;
        const message = res?.notification?.message ?? "No se pudo crear la temporada.";
        return rejectWithValue({ key, message });
      }
      return res.data as TemporadaBodega;
    } catch (err: unknown) {
      const resp = (err as any)?.response?.data ?? { md_error: true, message: (err as Error)?.message ?? 'Error desconocido' };
      if ((err as any)?.response?.data) handleBackendNotification(resp);
      return rejectWithValue(resp);
    }
  }
);

export const editTemporadaBodega = createAsyncThunk(
  "temporadabodega/update",
  async ({ id, data }: { id: number; data: TemporadaBodegaUpdateData }, { rejectWithValue }) => {
    try {
      const resp = await temporadaBodegaService.update(id, data);
      handleBackendNotification(resp);
      if (!resp?.success) {
        const key = resp?.notification?.key;
        const message = resp?.notification?.message ?? "No se pudo actualizar la temporada.";
        return rejectWithValue({ key, message });
      }
      return resp.data as TemporadaBodega;
    } catch (err: unknown) {
      const resp = (err as any)?.response?.data ?? { md_error: true, message: (err as Error)?.message ?? 'Error desconocido' };
      if ((err as any)?.response?.data) handleBackendNotification(resp);
      return rejectWithValue(resp);
    }
  }
);

export const archiveTemporada = createAsyncThunk(
  "temporadabodega/archive",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.archivar(id);
      handleBackendNotification(res);
      if (!res?.success) {
        const key = res?.notification?.key;
        const message = res?.notification?.message ?? "No se pudo archivar la temporada.";
        return rejectWithValue({ key, message });
      }
      return res.data as TemporadaBodega | null;
    } catch (err: unknown) {
      const resp = (err as any)?.response?.data ?? { md_error: true, message: (err as Error)?.message ?? 'Error desconocido' };
      if ((err as any)?.response?.data) handleBackendNotification(resp);
      return rejectWithValue(resp);
    }
  }
);

export const restoreTemporada = createAsyncThunk(
  "temporadabodega/restore",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.restaurar(id);
      handleBackendNotification(res);
      if (!res?.success) {
        const key = res?.notification?.key;
        const message = res?.notification?.message ?? "No se pudo restaurar la temporada.";
        return rejectWithValue({ key, message });
      }
      return res.data as TemporadaBodega | null;
    } catch (err: unknown) {
      const resp = (err as any)?.response?.data ?? { md_error: true, message: (err as Error)?.message ?? 'Error desconocido' };
      if ((err as any)?.response?.data) handleBackendNotification(resp);
      return rejectWithValue(resp);
    }
  }
);

export const finalizeTemporada = createAsyncThunk(
  "temporadabodega/finalize",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.toggleFinalizar(id);
      handleBackendNotification(res);
      if (!res?.success) {
        const key = res?.notification?.key;
        const message = res?.notification?.message ?? "No se pudo actualizar el estado de la temporada.";
        return rejectWithValue({ key, message });
      }
      return res.data as TemporadaBodega | null;
    } catch (err: unknown) {
      const resp = (err as any)?.response?.data ?? { md_error: true, message: (err as Error)?.message ?? 'Error desconocido' };
      if ((err as any)?.response?.data) handleBackendNotification(resp);
      return rejectWithValue(resp);
    }
  }
);

export const deleteTemporada = createAsyncThunk(
  "temporadabodega/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await temporadaBodegaService.remove(id);
      handleBackendNotification(res);
      if (!res?.success) {
        const key = res?.notification?.key;
        const message = res?.notification?.message ?? "No se pudo eliminar la temporada.";
        return rejectWithValue({ key, message });
      }
      const payload = res.data as { deleted_id?: number; temporada_id?: number } | null;
      const deletedId = payload?.deleted_id ?? payload?.temporada_id ?? id;
      return deletedId;
    } catch (err: unknown) {
      const resp = (err as any)?.response?.data ?? { md_error: true, message: (err as Error)?.message ?? 'Error desconocido' };
      if ((err as any)?.response?.data) handleBackendNotification(resp);
      return rejectWithValue(resp);
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
      const msg = extractApiMessage(action.payload ?? action.error, "Error");
      state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
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
      const msg = extractApiMessage(action.payload ?? action.error, "Error");
      state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
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
      const msg = extractApiMessage(action.payload ?? action.error, "Error");
      state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
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
      const msg = extractApiMessage(action.payload ?? action.error, "Error");
      state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
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
      const msg = extractApiMessage(action.payload ?? action.error, "Error");
      state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
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
      const msg = extractApiMessage(action.payload ?? action.error, "Error");
      state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
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
      const msg = extractApiMessage(action.payload ?? action.error, "Error");
      state.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
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
