// STATE-UPDATE: local list pruning after archive/restore/delete is intentional in Redux store.
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { handleBackendNotification } from "../utils/NotificationEngine";
import { extractApiMessage } from "../api/errorUtils";
import { extractRejectedTransportPayload } from "../types/apiTypes";

import type {
  TemporadaBodega,
  TemporadaBodegaCreateData,
  TemporadaBodegaUpdateData,
  EstadoTemporadaBodega,
} from "../../modules/gestion_bodega/types/temporadaBodegaTypes";
import temporadaBodegaService from "../../modules/gestion_bodega/services/temporadaBodegaService";

type PaginationMeta = {
  page: number;
  page_size: number;
  total_pages: number;
  count: number;
  next: string | null;
  previous: string | null;
};

export type TemporadasBodegaFilters = {
  page: number;
  page_size: number;
  ordering?: string;
  estado?: EstadoTemporadaBodega;
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

const emptyMeta: PaginationMeta = {
  page: 1,
  page_size: 10,
  total_pages: 1,
  count: 0,
  next: null,
  previous: null,
};

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

const unknownError = (err: unknown): { message: string; md_error: true } => ({
  md_error: true,
  message: err instanceof Error ? err.message : "Error desconocido",
});

export const fetchTemporadasBodega = createAsyncThunk(
  "temporadabodega/fetch",
  async (args: Partial<TemporadasBodegaFilters> | undefined, { rejectWithValue }) => {
    try {
      const response = await temporadaBodegaService.list({
        page: args?.page,
        page_size: args?.page_size,
        estado: args?.estado,
        bodegaId: args?.bodegaId,
        año: args?.year,
        finalizada: args?.finalizada ?? null,
        ordering: args?.ordering,
      });

      if (!response.success) {
        return rejectWithValue({
          key: response.notification?.key,
          message: response.notification?.message ?? "No se pudieron cargar las temporadas.",
        });
      }

      return { temporadas: response.data.temporadas, meta: response.data.meta as PaginationMeta };
    } catch (err: unknown) {
      const transportPayload = extractRejectedTransportPayload(err);
      if (transportPayload) handleBackendNotification(transportPayload);
      return rejectWithValue(transportPayload ?? unknownError(err));
    }
  }
);

export const addTemporadaBodega = createAsyncThunk(
  "temporadabodega/create",
  async (payload: TemporadaBodegaCreateData, { rejectWithValue }) => {
    try {
      const response = await temporadaBodegaService.create(payload);
      if (!response?.success) {
        const key = response?.notification?.key;
        const message = response?.notification?.message ?? "No se pudo crear la temporada.";
        return rejectWithValue({ key, message });
      }
      return response.data as TemporadaBodega;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedTransportPayload(err) ?? unknownError(err));
    }
  }
);

export const editTemporadaBodega = createAsyncThunk(
  "temporadabodega/update",
  async ({ id, data }: { id: number; data: TemporadaBodegaUpdateData }, { rejectWithValue }) => {
    try {
      const response = await temporadaBodegaService.update(id, data);
      if (!response?.success) {
        const key = response?.notification?.key;
        const message = response?.notification?.message ?? "No se pudo actualizar la temporada.";
        return rejectWithValue({ key, message });
      }
      return response.data as TemporadaBodega;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedTransportPayload(err) ?? unknownError(err));
    }
  }
);

export const archiveTemporada = createAsyncThunk(
  "temporadabodega/archive",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await temporadaBodegaService.archivar(id);
      if (!response?.success) {
        const key = response?.notification?.key;
        const message = response?.notification?.message ?? "No se pudo archivar la temporada.";
        return rejectWithValue({ key, message });
      }
      return response.data as TemporadaBodega | null;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedTransportPayload(err) ?? unknownError(err));
    }
  }
);

export const restoreTemporada = createAsyncThunk(
  "temporadabodega/restore",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await temporadaBodegaService.restaurar(id);
      if (!response?.success) {
        const key = response?.notification?.key;
        const message = response?.notification?.message ?? "No se pudo restaurar la temporada.";
        return rejectWithValue({ key, message });
      }
      return response.data as TemporadaBodega | null;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedTransportPayload(err) ?? unknownError(err));
    }
  }
);

export const finalizeTemporada = createAsyncThunk(
  "temporadabodega/finalize",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await temporadaBodegaService.toggleFinalizar(id);
      if (!response?.success) {
        const key = response?.notification?.key;
        const message = response?.notification?.message ?? "No se pudo actualizar el estado de la temporada.";
        return rejectWithValue({ key, message });
      }
      return response.data as TemporadaBodega | null;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedTransportPayload(err) ?? unknownError(err));
    }
  }
);

export const deleteTemporada = createAsyncThunk(
  "temporadabodega/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await temporadaBodegaService.remove(id);
      if (!response?.success) {
        const key = response?.notification?.key;
        const message = response?.notification?.message ?? "No se pudo eliminar la temporada.";
        return rejectWithValue({ key, message });
      }
      const payload = response.data as { deleted_id?: number; temporada_id?: number } | null;
      const deletedId = payload?.deleted_id ?? payload?.temporada_id ?? id;
      return deletedId;
    } catch (err: unknown) {
      return rejectWithValue(extractRejectedTransportPayload(err) ?? unknownError(err));
    }
  }
);

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
      state.filters.page = 1;
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
      state.error = extractApiMessage(action.payload ?? action.error, "Error");
    });

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
      state.error = extractApiMessage(action.payload ?? action.error, "Error");
    });

    builder.addCase(editTemporadaBodega.pending, (state) => {
      state.ops.updating = true;
      state.error = null;
    });
    builder.addCase(editTemporadaBodega.fulfilled, (state, action) => {
      state.ops.updating = false;
      const updated = action.payload;
      const index = state.items.findIndex((item) => item.id === updated.id);
      if (index >= 0) state.items[index] = updated;
      if (state.current?.id === updated.id) state.current = updated;
    });
    builder.addCase(editTemporadaBodega.rejected, (state, action) => {
      state.ops.updating = false;
      state.error = extractApiMessage(action.payload ?? action.error, "Error");
    });

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
          state.items = state.items.filter((item) => item.id !== temporada.id);
          if (state.meta.count > 0) state.meta.count -= 1;
        } else {
          const index = state.items.findIndex((item) => item.id === temporada.id);
          if (index >= 0) state.items[index] = temporada;
        }
        if (state.current?.id === temporada.id) {
          state.current = currentEstado === "activas" ? null : temporada;
        }
      }
    });
    builder.addCase(archiveTemporada.rejected, (state, action) => {
      state.ops.archiving = false;
      state.error = extractApiMessage(action.payload ?? action.error, "Error");
    });

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
          state.items = state.items.filter((item) => item.id !== temporada.id);
          if (state.meta.count > 0) state.meta.count -= 1;
        } else {
          const index = state.items.findIndex((item) => item.id === temporada.id);
          if (index >= 0) state.items[index] = temporada;
        }
        if (state.current?.id === temporada.id) {
          state.current = currentEstado === "archivadas" ? null : temporada;
        }
      }
    });
    builder.addCase(restoreTemporada.rejected, (state, action) => {
      state.ops.restoring = false;
      state.error = extractApiMessage(action.payload ?? action.error, "Error");
    });

    builder.addCase(finalizeTemporada.pending, (state) => {
      state.ops.finalizing = true;
      state.error = null;
    });
    builder.addCase(finalizeTemporada.fulfilled, (state, action) => {
      state.ops.finalizing = false;
      const temporada = action.payload;
      if (temporada) {
        const index = state.items.findIndex((item) => item.id === temporada.id);
        if (index >= 0) state.items[index] = temporada;
        if (state.current?.id === temporada.id) state.current = temporada;
      }
    });
    builder.addCase(finalizeTemporada.rejected, (state, action) => {
      state.ops.finalizing = false;
      state.error = extractApiMessage(action.payload ?? action.error, "Error");
    });

    builder.addCase(deleteTemporada.pending, (state) => {
      state.ops.deleting = true;
      state.error = null;
    });
    builder.addCase(deleteTemporada.fulfilled, (state, action) => {
      state.ops.deleting = false;
      const deletedId = action.payload;
      state.items = state.items.filter((item) => item.id !== deletedId);
      if (state.current?.id === deletedId) state.current = null;
      if (state.meta.count > 0) {
        state.meta.count -= 1;
        if (state.meta.page_size) {
          state.meta.total_pages = Math.max(1, Math.ceil(state.meta.count / state.meta.page_size));
        }
      }
    });
    builder.addCase(deleteTemporada.rejected, (state, action) => {
      state.ops.deleting = false;
      state.error = extractApiMessage(action.payload ?? action.error, "Error");
    });
  },
});

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

export const selectTemporadas = (state: RootState) => state.temporadasBodega.items;
export const selectTemporadasMeta = (state: RootState) => state.temporadasBodega.meta;
export const selectTemporadasFilters = (state: RootState) => state.temporadasBodega.filters;
export const selectTemporadaCurrent = (state: RootState) => state.temporadasBodega.current;
export const selectTemporadaOps = (state: RootState) => state.temporadasBodega.ops;
export const selectTemporadasError = (state: RootState) => state.temporadasBodega.error;

export default slice.reducer;

