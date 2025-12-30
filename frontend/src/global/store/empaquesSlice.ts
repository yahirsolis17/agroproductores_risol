// frontend/src/global/store/empaquesSlice.ts
// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { isApiClientAxiosError, getApiClientErrorPayload } from "../../global/api/apiClient";
import type { RootState } from "./store";
import type { PaginationMeta } from "../../modules/gestion_bodega/types/shared";
import type {
  EmpaqueRow,
  EmpaquesFilters,
  EmpaqueCreateDTO,
  EmpaqueUpdateDTO,
  EmpaqueBulkUpsertDTO,
  EmpaqueBulkUpsertSummary,
  EmpaqueBulkUpsertResponse,
} from "../../modules/gestion_bodega/types/empaquesTypes";
import { empaquesService } from "../../modules/gestion_bodega/services/empaquesService";

type Status = "idle" | "loading" | "succeeded" | "failed";

export type EstadoFiltro = "activos" | "archivados" | "todos";

/**
 * Query params tipados para evitar casts y tipos laxos.
 * Conserva EmpaquesFilters como base y agrega params operativos reales.
 */
export type EmpaquesQueryParams = EmpaquesFilters &
  Partial<{
    page: number;
    page_size: number;
    estado: EstadoFiltro;
    search: string;
    ordering: string;
    temporada_id: number;
    semana: number;
    recepcion: number;
    bodega: number;
    is_active: boolean;
    material: string;
    calidad: string;
    tipo_mango: string;
  }>;

type BackendErrorEnvelope = {
  success?: boolean;
  message_key?: string;
  message?: string;
  data?: unknown;
};

const normalizeBackendError = (err: unknown): BackendErrorEnvelope => {
  if (isApiClientAxiosError(err)) {
    const payload = getApiClientErrorPayload(err);
    if (payload && typeof payload === "object") {
      const p = payload as Record<string, unknown>;
      return {
        success: typeof p.success === "boolean" ? p.success : false,
        message_key: typeof p.message_key === "string" ? p.message_key : "unexpected_error",
        message: typeof p.message === "string" ? p.message : "Error inesperado",
        data: p.data,
      };
    }
    return {
      success: false,
      message_key: "unexpected_error",
      message: err.message || "Error de red/servidor",
    };
  }

  if (err instanceof Error) {
    return { success: false, message_key: "unexpected_error", message: err.message };
  }

  return { success: false, message_key: "unexpected_error", message: "Error inesperado" };
};

const toErrorMessage = (env?: BackendErrorEnvelope | string | null): string => {
  if (!env) return "Error inesperado.";
  if (typeof env === "string") return env;
  return env.message ?? "Error inesperado.";
};

interface EmpaquesState {
  items: EmpaqueRow[];
  meta: PaginationMeta;
  filters: EmpaquesFilters;

  status: Status;
  saving: boolean;
  error: string | null;

  current: EmpaqueRow | null;

  bulkSaving: boolean;
  bulkError: string | null;
  lastBulkSummary: EmpaqueBulkUpsertSummary | null;
  lastBulkCreatedIds: number[];
  lastBulkUpdatedIds: number[];
}

type EmpaquesListResponse = {
  results: EmpaqueRow[];
  meta: PaginationMeta;
};

const emptyMeta: PaginationMeta = {
  count: 0,
  next: null,
  previous: null,
  page: 1,
  page_size: 10,
  total_pages: 1,
};

const initialState: EmpaquesState = {
  items: [],
  meta: emptyMeta,
  filters: { page: 1, page_size: 10, is_active: true },

  status: "idle",
  saving: false,
  error: null,

  current: null,

  bulkSaving: false,
  bulkError: null,
  lastBulkSummary: null,
  lastBulkCreatedIds: [],
  lastBulkUpdatedIds: [],
};

export const fetchEmpaques = createAsyncThunk<
  EmpaquesListResponse,
  EmpaquesQueryParams,
  { rejectValue: BackendErrorEnvelope }
>("empaques/fetchList", async (params, { rejectWithValue }) => {
  try {
    return await empaquesService.list(params);
  } catch (err: unknown) {
    return rejectWithValue(normalizeBackendError(err));
  }
});

export const fetchEmpaqueById = createAsyncThunk<
  EmpaqueRow,
  number,
  { rejectValue: BackendErrorEnvelope }
>("empaques/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await empaquesService.retrieve(id);
  } catch (err: unknown) {
    return rejectWithValue(normalizeBackendError(err));
  }
});

export const createEmpaque = createAsyncThunk<
  EmpaqueRow,
  EmpaqueCreateDTO,
  { rejectValue: BackendErrorEnvelope }
>("empaques/create", async (dto, { rejectWithValue }) => {
  try {
    return await empaquesService.create(dto);
  } catch (err: unknown) {
    return rejectWithValue(normalizeBackendError(err));
  }
});

export const updateEmpaque = createAsyncThunk<
  EmpaqueRow,
  { id: number; dto: EmpaqueUpdateDTO },
  { rejectValue: BackendErrorEnvelope }
>("empaques/update", async ({ id, dto }, { rejectWithValue }) => {
  try {
    return await empaquesService.update(id, dto);
  } catch (err: unknown) {
    return rejectWithValue(normalizeBackendError(err));
  }
});

export const archivarEmpaque = createAsyncThunk<
  { id: number },
  number,
  { rejectValue: BackendErrorEnvelope }
>("empaques/archivar", async (id, { rejectWithValue }) => {
  try {
    return await empaquesService.archivar(id);
  } catch (err: unknown) {
    return rejectWithValue(normalizeBackendError(err));
  }
});

export const bulkUpsertEmpaques = createAsyncThunk<
  EmpaqueBulkUpsertResponse,
  EmpaqueBulkUpsertDTO,
  { rejectValue: BackendErrorEnvelope }
>("empaques/bulkUpsert", async (dto, { rejectWithValue }) => {
  try {
    return await empaquesService.bulkUpsert(dto);
  } catch (err: unknown) {
    return rejectWithValue(normalizeBackendError(err));
  }
});

const empaquesSlice = createSlice({
  name: "empaques",
  initialState,
  reducers: {
    setEmpaquesFilters(state, action: PayloadAction<EmpaquesFilters>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearEmpaquesError(state) {
      state.error = null;
    },
    clearEmpaquesCurrent(state) {
      state.current = null;
    },
    clearEmpaquesBulkState(state) {
      state.bulkError = null;
      state.lastBulkSummary = null;
      state.lastBulkCreatedIds = [];
      state.lastBulkUpdatedIds = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // LIST
      .addCase(fetchEmpaques.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchEmpaques.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.results;
        state.meta = action.payload.meta;
      })
      .addCase(fetchEmpaques.rejected, (state, action) => {
        state.status = "failed";
        state.error = toErrorMessage(action.payload ?? null);
      })

      // BY ID
      .addCase(fetchEmpaqueById.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchEmpaqueById.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(fetchEmpaqueById.rejected, (state, action) => {
        state.error = toErrorMessage(action.payload ?? null);
      })

      // CREATE
      .addCase(createEmpaque.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createEmpaque.fulfilled, (state, action) => {
        state.saving = false;
        state.current = action.payload;

        // Si estás en page 1 y filtrando activos, lo insertamos para UX reactiva.
        const onFirstPage = (state.filters.page ?? 1) === 1;
        const onlyActive = state.filters.is_active !== false;

        if (onFirstPage && onlyActive) {
          state.items = [action.payload, ...state.items];
        }
      })
      .addCase(createEmpaque.rejected, (state, action) => {
        state.saving = false;
        state.error = toErrorMessage(action.payload ?? null);
      })

      // UPDATE
      .addCase(updateEmpaque.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateEmpaque.fulfilled, (state, action) => {
        state.saving = false;
        state.current = action.payload;

        const idx = state.items.findIndex((x) => x.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(updateEmpaque.rejected, (state, action) => {
        state.saving = false;
        state.error = toErrorMessage(action.payload ?? null);
      })

      // ARCHIVAR (DELETE soft)
      .addCase(archivarEmpaque.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(archivarEmpaque.fulfilled, (state, action) => {
        state.saving = false;
        const id = action.payload.id;

        // Si la vista está en activos, lo removemos; si no, marcamos is_active=false si existe.
        const onlyActive = state.filters.is_active !== false;

        if (onlyActive) {
          state.items = state.items.filter((x) => x.id !== id);
        } else {
          const idx = state.items.findIndex((x) => x.id === id);
          if (idx >= 0) state.items[idx] = { ...state.items[idx], is_active: false };
        }

        if (state.current?.id === id) {
          state.current = { ...state.current, is_active: false };
        }
      })
      .addCase(archivarEmpaque.rejected, (state, action) => {
        state.saving = false;
        state.error = toErrorMessage(action.payload ?? null);
      })

      // BULK UPSERT
      .addCase(bulkUpsertEmpaques.pending, (state) => {
        state.bulkSaving = true;
        state.bulkError = null;
        state.lastBulkSummary = null;
        state.lastBulkCreatedIds = [];
        state.lastBulkUpdatedIds = [];
      })
      .addCase(bulkUpsertEmpaques.fulfilled, (state, action) => {
        state.bulkSaving = false;
        state.lastBulkCreatedIds = action.payload.created_ids ?? [];
        state.lastBulkUpdatedIds = action.payload.updated_ids ?? [];
        state.lastBulkSummary = action.payload.summary ?? null;
      })
      .addCase(bulkUpsertEmpaques.rejected, (state, action) => {
        state.bulkSaving = false;
        state.bulkError = toErrorMessage(action.payload ?? null);
      });
  },
});

export const { setEmpaquesFilters, clearEmpaquesError, clearEmpaquesCurrent, clearEmpaquesBulkState } =
  empaquesSlice.actions;

export default empaquesSlice.reducer;

// Selectores
export const selectEmpaquesState = (state: RootState) => state.empaques;
export const selectEmpaques = (state: RootState) => state.empaques.items;
export const selectEmpaquesMeta = (state: RootState) => state.empaques.meta;
export const selectEmpaquesFilters = (state: RootState) => state.empaques.filters;
export const selectEmpaquesStatus = (state: RootState) => state.empaques.status;
export const selectEmpaquesSaving = (state: RootState) => state.empaques.saving;
export const selectEmpaquesError = (state: RootState) => state.empaques.error;

export const selectEmpaquesBulkSaving = (state: RootState) => state.empaques.bulkSaving;
export const selectEmpaquesBulkError = (state: RootState) => state.empaques.bulkError;
export const selectEmpaquesLastBulkSummary = (state: RootState) => state.empaques.lastBulkSummary;
