// frontend/src/global/store/empaquesSlice.ts
// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import type { PaginationMeta } from "../../modules/gestion_bodega/types/shared";
import type {
  EmpaqueRow,
  EmpaquesFilters,
  EmpaqueCreateDTO,
  EmpaqueUpdateDTO,
  EmpaqueBulkUpsertDTO,
  EmpaqueBulkUpsertSummary,
} from "../../modules/gestion_bodega/types/empaquesTypes";
import { empaquesService } from "../../modules/gestion_bodega/services/empaquesService";

type Status = "idle" | "loading" | "succeeded" | "failed";

/**
 * Query params permitidos para fetch list sin caer en "as any".
 * Mantiene EmpaquesFilters como base, y agrega los params operativos reales.
 */
export type EmpaquesQueryParams = EmpaquesFilters & {
  // filtros típicos usados en tablero/recepciones/empaque
  recepcion?: number;
  bodega?: number;
  temporada?: number;
  semana?: number | null;

  // flags/paginación/orden
  is_active?: boolean;
  page?: number;
  page_size?: number;
  ordering?: string;

  // opcionales (si existen en backend)
  material?: string;
  calidad?: string;
  tipo_mango?: string;
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

function extractErrorMessage(err: unknown): string {
  const e = err as any;
  const data = e?.response?.data;

  // NotificationHandler común: { success, message_key, message, data }
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
    if (typeof d.detail === "string") return d.detail;

    // Errores DRF típicos: { field: ["..."] }
    // Intentamos colapsar en texto.
    const fieldErrors = Object.values(d)
      .flatMap((v) => (Array.isArray(v) ? v : []))
      .filter((x) => typeof x === "string") as string[];

    if (fieldErrors.length) return fieldErrors[0];
  }

  if (typeof data === "string") return data;

  return err instanceof Error ? err.message : "Ocurrió un error inesperado.";
}

export const fetchEmpaques = createAsyncThunk(
  "empaques/fetchList",
  async (params: EmpaquesQueryParams, { rejectWithValue }) => {
    try {
      return await empaquesService.list(params);
    } catch (e: unknown) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const fetchEmpaqueById = createAsyncThunk(
  "empaques/fetchById",
  async (id: number, { rejectWithValue }) => {
    try {
      return await empaquesService.retrieve(id);
    } catch (e: unknown) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const createEmpaque = createAsyncThunk(
  "empaques/create",
  async (dto: EmpaqueCreateDTO, { rejectWithValue }) => {
    try {
      return await empaquesService.create(dto);
    } catch (e: unknown) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const updateEmpaque = createAsyncThunk(
  "empaques/update",
  async ({ id, dto }: { id: number; dto: EmpaqueUpdateDTO }, { rejectWithValue }) => {
    try {
      return await empaquesService.update(id, dto);
    } catch (e: unknown) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const archivarEmpaque = createAsyncThunk(
  "empaques/archivar",
  async (id: number, { rejectWithValue }) => {
    try {
      return await empaquesService.archivar(id);
    } catch (e: unknown) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const bulkUpsertEmpaques = createAsyncThunk(
  "empaques/bulkUpsert",
  async (dto: EmpaqueBulkUpsertDTO, { rejectWithValue }) => {
    try {
      return await empaquesService.bulkUpsert(dto);
    } catch (e: unknown) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

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
        state.error = String(action.payload ?? "Error al cargar empaques.");
      })

      // BY ID
      .addCase(fetchEmpaqueById.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchEmpaqueById.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(fetchEmpaqueById.rejected, (state, action) => {
        state.error = String(action.payload ?? "Error al cargar el empaque.");
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
        state.error = String(action.payload ?? "Error al crear el empaque.");
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
        state.error = String(action.payload ?? "Error al actualizar el empaque.");
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
        state.error = String(action.payload ?? "Error al archivar el empaque.");
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
        state.bulkError = String(action.payload ?? "Error en bulk upsert.");
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
