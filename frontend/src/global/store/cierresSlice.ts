// frontend/src/global/store/cierresSlice.ts
// Slice completo para Cierres Semanales (Bodega):
// - Contexto: temporadaId, bodegaId
// - Filtros/paginación: iso_semana, page, page_size
// - Datos: index (mapa de semanas), list (registros paginados)
// - CRUD async thunks
// - Draft/Modal: creación rápida de semana

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import cierresService from "../../modules/gestion_bodega/services/cierresService";
import { handleBackendNotification } from "../utils/NotificationEngine";
import type {
  CierresIndexResponse,
  CierreSemanalListResponse,
  CierreSemanalCreatePayload,
  CierreSemanalCreateResponse,
  CierreTemporadaResponse,
} from "../../modules/gestion_bodega/types/cierreTypes";

// --------------------------
// State Interface
// --------------------------
export interface CierresState {
  temporadaId: number | null;
  bodegaId: number | null;

  // Filtro principal
  iso_semana: string | null;

  // Paginación
  page: number;
  page_size: number;

  // Data
  index: CierresIndexResponse | null;
  list: CierreSemanalListResponse | null;

  // Loading states
  loadingIndex: boolean;
  loadingList: boolean;
  creating: boolean;
  closingSeason: boolean;

  // Errors
  errorIndex: string | null;
  errorList: string | null;

  // Draft para modal de creación
  draft: {
    desde: string | null;
    hasta: string | null;
  };

  // Modal
  showCreateModal: boolean;

  // Meta
  lastVisitedAt: number | null;
}

const initialState: CierresState = {
  temporadaId: null,
  bodegaId: null,
  iso_semana: null,
  page: 1,
  page_size: 10,
  index: null,
  list: null,
  loadingIndex: false,
  loadingList: false,
  creating: false,
  closingSeason: false,
  errorIndex: null,
  errorList: null,
  draft: { desde: null, hasta: null },
  showCreateModal: false,
  lastVisitedAt: null,
};

// --------------------------
// Async Thunks
// --------------------------
export const fetchCierresIndex = createAsyncThunk<
  CierresIndexResponse,
  number, // temporadaId
  { rejectValue: string }
>("cierres/fetchIndex", async (temporadaId, { rejectWithValue }) => {
  try {
    return await cierresService.index(temporadaId);
  } catch (err: unknown) {
    const errData = (err as { payload?: unknown; response?: { data?: unknown }; message?: string });
    handleBackendNotification(errData.payload || errData.response?.data);
    return rejectWithValue(errData.message || 'Error al cargar índice');
  }
});

export const fetchCierresList = createAsyncThunk<
  CierreSemanalListResponse,
  { temporada: number; bodega: number; iso_semana?: string | null; page?: number; page_size?: number },
  { rejectValue: string }
>("cierres/fetchList", async (params, { rejectWithValue }) => {
  try {
    return await cierresService.list({
      temporada: params.temporada,
      bodega: params.bodega,
      iso_semana: params.iso_semana || undefined,
      page: params.page || 1,
      page_size: params.page_size || 10,
    });
  } catch (err: unknown) {
    const errData = (err as { payload?: unknown; response?: { data?: unknown }; message?: string });
    handleBackendNotification(errData.payload || errData.response?.data);
    return rejectWithValue(errData.message || 'Error al cargar lista');
  }
});

export const createCierreSemanal = createAsyncThunk<
  CierreSemanalCreateResponse,
  CierreSemanalCreatePayload,
  { rejectValue: string }
>("cierres/createSemanal", async (payload, { rejectWithValue }) => {
  try {
    const result = await cierresService.semanal(payload);
    handleBackendNotification({ success: true, message: "Semana creada" });
    return result;
  } catch (err: unknown) {
    const errData = (err as { payload?: unknown; response?: { data?: unknown }; message?: string });
    handleBackendNotification(errData.payload || errData.response?.data);
    return rejectWithValue(errData.message || 'Error al crear semana');
  }
});

export const closeCierreTemporada = createAsyncThunk<
  CierreTemporadaResponse,
  { temporada: number },
  { rejectValue: string }
>("cierres/closeTemporada", async (payload, { rejectWithValue }) => {
  try {
    const result = await cierresService.temporada(payload);
    handleBackendNotification({ success: true, message: "Temporada cerrada" });
    return result;
  } catch (err: unknown) {
    const errData = (err as { payload?: unknown; response?: { data?: unknown }; message?: string });
    handleBackendNotification(errData.payload || errData.response?.data);
    return rejectWithValue(errData.message || 'Error al cerrar temporada');
  }
});

// --------------------------
// Slice
// --------------------------
const cierresSlice = createSlice({
  name: "cierres",
  initialState,
  reducers: {
    setContext(state, action: PayloadAction<{ temporadaId?: number | null; bodegaId?: number | null }>) {
      if (action.payload.temporadaId !== undefined) {
        state.temporadaId = action.payload.temporadaId ?? null;
      }
      if (action.payload.bodegaId !== undefined) {
        state.bodegaId = action.payload.bodegaId ?? null;
      }
      state.lastVisitedAt = Date.now();
    },

    setIsoSemana(state, action: PayloadAction<string | null>) {
      state.iso_semana = action.payload;
    },

    setPagination(state, action: PayloadAction<Partial<Pick<CierresState, "page" | "page_size">>>) {
      if (action.payload.page !== undefined) state.page = action.payload.page!;
      if (action.payload.page_size !== undefined) state.page_size = action.payload.page_size!;
    },

    openCreateModal(state) {
      state.showCreateModal = true;
    },
    closeCreateModal(state) {
      state.showCreateModal = false;
    },

    setDraftDates(state, action: PayloadAction<{ desde?: string | null; hasta?: string | null }>) {
      if (action.payload.desde !== undefined) state.draft.desde = action.payload.desde ?? null;
      if (action.payload.hasta !== undefined) state.draft.hasta = action.payload.hasta ?? null;
    },

    resetCierres() {
      return { ...initialState, lastVisitedAt: Date.now() };
    },
  },
  extraReducers: (builder) => {
    // fetchIndex
    builder.addCase(fetchCierresIndex.pending, (state) => {
      state.loadingIndex = true;
      state.errorIndex = null;
    });
    builder.addCase(fetchCierresIndex.fulfilled, (state, action) => {
      state.loadingIndex = false;
      state.index = action.payload;
    });
    builder.addCase(fetchCierresIndex.rejected, (state, action) => {
      state.loadingIndex = false;
      state.errorIndex = action.payload ?? "Error";
    });

    // fetchList
    builder.addCase(fetchCierresList.pending, (state) => {
      state.loadingList = true;
      state.errorList = null;
    });
    builder.addCase(fetchCierresList.fulfilled, (state, action) => {
      state.loadingList = false;
      state.list = action.payload;
    });
    builder.addCase(fetchCierresList.rejected, (state, action) => {
      state.loadingList = false;
      state.errorList = action.payload ?? "Error";
    });

    // createSemanal
    builder.addCase(createCierreSemanal.pending, (state) => {
      state.creating = true;
    });
    builder.addCase(createCierreSemanal.fulfilled, (state) => {
      state.creating = false;
      state.showCreateModal = false;
    });
    builder.addCase(createCierreSemanal.rejected, (state) => {
      state.creating = false;
    });

    // closeTemporada
    builder.addCase(closeCierreTemporada.pending, (state) => {
      state.closingSeason = true;
    });
    builder.addCase(closeCierreTemporada.fulfilled, (state) => {
      state.closingSeason = false;
    });
    builder.addCase(closeCierreTemporada.rejected, (state) => {
      state.closingSeason = false;
    });
  },
});

export const {
  setContext,
  setIsoSemana,
  setPagination,
  openCreateModal,
  closeCreateModal,
  setDraftDates,
  resetCierres,
} = cierresSlice.actions;

export default cierresSlice.reducer;
