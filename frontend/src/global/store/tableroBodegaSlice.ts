// frontend/src/global/store/tableroBodegaSlice.ts
// Slice completo para Tablero de Bodega - Redux Puro (sin React Query)
// - Estado UI: filters, activeQueue, temporadaId
// - Datos: summary, alerts, queues, weeksNav
// - Async thunks para todas las operaciones

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";


import {
  getDashboardSummary,
  getDashboardQueues,
  getDashboardAlerts,
  getWeeksNav,
  startWeek as apiStartWeek,
  finishWeek as apiFinishWeek,
} from "../../modules/gestion_bodega/services/tableroBodegaService";

import type {
  QueueType,
  DashboardSummaryResponse,
  DashboardQueueResponse,
  DashboardAlertResponse,
  WeeksNavResponse,
  WeekStartRequest,
  WeekFinishRequest,
  WeekCurrentResponse,
} from "../../modules/gestion_bodega/types/tableroBodegaTypes";

// --------------------------
// Filter Types
// --------------------------
export interface TableroFilters {
  huerta_id: number | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  estado_lote: string | null;
  calidad: string | null;
  madurez: string | null;
  solo_pendientes: boolean | undefined;
  page: number;
  page_size: number;
  order_by: string | null;
}

const DEFAULT_ORDER_BY: Record<QueueType, string> = {
  recepciones: "fecha_recepcion:desc,id:desc",
  inventarios: "fecha:desc,id:desc",
  despachos: "fecha_programada:desc,id:desc",
};

const DEFAULT_FILTERS: TableroFilters = {
  huerta_id: null,
  fecha_desde: null,
  fecha_hasta: null,
  estado_lote: null,
  calidad: null,
  madurez: null,
  solo_pendientes: true,
  page: 1,
  page_size: 10,
  order_by: DEFAULT_ORDER_BY.recepciones,
};

// --------------------------
// State Interface
// --------------------------
export interface TableroBodegaState {
  temporadaId: number | null;
  bodegaId: number | null;
  filters: TableroFilters;
  activeQueue: QueueType;

  // Data
  summary: DashboardSummaryResponse | null;
  alerts: DashboardAlertResponse | null;
  queues: {
    recepciones: DashboardQueueResponse | null;
    inventarios: DashboardQueueResponse | null;
    despachos: DashboardQueueResponse | null;
  };
  weeksNav: WeeksNavResponse | null;
  selectedWeekId: number | null;

  // Loading states
  loadingSummary: boolean;
  loadingAlerts: boolean;
  loadingQueues: Record<QueueType, boolean>;
  loadingWeeksNav: boolean;
  startingWeek: boolean;
  finishingWeek: boolean;

  // Errors
  errorSummary: string | null;
  errorAlerts: string | null;
  errorQueues: Record<QueueType, string | null>;
  errorWeeksNav: string | null;

  lastVisitedAt: number | null;
}

const initialState: TableroBodegaState = {
  temporadaId: null,
  bodegaId: null,
  filters: DEFAULT_FILTERS,
  activeQueue: "recepciones",
  summary: null,
  alerts: null,
  queues: {
    recepciones: null,
    inventarios: null,
    despachos: null,
  },
  weeksNav: null,
  selectedWeekId: null,
  loadingSummary: false,
  loadingAlerts: false,
  loadingQueues: { recepciones: false, inventarios: false, despachos: false },
  loadingWeeksNav: false,
  startingWeek: false,
  finishingWeek: false,
  errorSummary: null,
  errorAlerts: null,
  errorQueues: { recepciones: null, inventarios: null, despachos: null },
  errorWeeksNav: null,
  lastVisitedAt: null,
};

// --------------------------
// Async Thunks
// --------------------------
interface FetchParams {
  temporadaId: number;
  bodegaId: number;
  semanaId?: number | null;
  filters?: Partial<TableroFilters>;
}

export const fetchTableroSummary = createAsyncThunk<
  DashboardSummaryResponse,
  FetchParams,
  { rejectValue: string }
>("tableroBodega/fetchSummary", async ({ temporadaId, bodegaId, semanaId, filters }, { rejectWithValue }) => {
  try {
    return await getDashboardSummary(temporadaId, { ...filters, bodegaId, semanaId });
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al cargar resumen');
  }
});

export const fetchTableroAlerts = createAsyncThunk<
  DashboardAlertResponse,
  { temporadaId: number; bodegaId: number },
  { rejectValue: string }
>("tableroBodega/fetchAlerts", async ({ temporadaId, bodegaId }, { rejectWithValue }) => {
  try {
    return await getDashboardAlerts(temporadaId, { bodegaId });
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al cargar alertas');
  }
});

export const fetchTableroQueues = createAsyncThunk<
  { type: QueueType; data: DashboardQueueResponse },
  FetchParams & { queueType: QueueType },
  { rejectValue: string }
>("tableroBodega/fetchQueues", async ({ temporadaId, bodegaId, semanaId, filters, queueType }, { rejectWithValue }) => {
  try {
    const data = await getDashboardQueues(temporadaId, queueType, { ...filters, bodegaId, semanaId });
    return { type: queueType, data };
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al cargar cola');
  }
});

export const fetchTableroWeeksNav = createAsyncThunk<
  WeeksNavResponse,
  { temporadaId: number; bodegaId: number },
  { rejectValue: string }
>("tableroBodega/fetchWeeksNav", async ({ temporadaId, bodegaId }, { rejectWithValue }) => {
  try {
    return await getWeeksNav(temporadaId, bodegaId);
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al cargar navegación de semanas');
  }
});

export const tableroStartWeek = createAsyncThunk<
  WeekCurrentResponse,
  WeekStartRequest,
  { rejectValue: string }
>("tableroBodega/startWeek", async (body, { rejectWithValue }) => {
  try {
    return await apiStartWeek(body);
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al iniciar semana');
  }
});

export const tableroFinishWeek = createAsyncThunk<
  WeekCurrentResponse,
  WeekFinishRequest,
  { rejectValue: string }
>("tableroBodega/finishWeek", async (body, { rejectWithValue }) => {
  try {
    return await apiFinishWeek(body);
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al finalizar semana');
  }
});

// --------------------------
// Slice
// --------------------------
const tableroBodegaSlice = createSlice({
  name: "tableroBodega",
  initialState,
  reducers: {
    setTemporadaId(state, action: PayloadAction<number>) {
      state.temporadaId = action.payload;
      state.lastVisitedAt = Date.now();
    },

    setBodegaId(state, action: PayloadAction<number>) {
      state.bodegaId = action.payload;
    },

    setActiveQueue(state, action: PayloadAction<QueueType>) {
      state.activeQueue = action.payload;
      state.filters.order_by = DEFAULT_ORDER_BY[action.payload];
      state.filters.page = 1;
    },

    setFilters(state, action: PayloadAction<Partial<TableroFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },

    setSelectedWeekId(state, action: PayloadAction<number | null>) {
      state.selectedWeekId = action.payload;
    },

    resetTablero(state) {
      state.filters = DEFAULT_FILTERS;
      state.activeQueue = "recepciones";
      state.summary = null;
      state.alerts = null;
      state.queues = { recepciones: null, inventarios: null, despachos: null };
      state.weeksNav = null;
      state.selectedWeekId = null;
      state.lastVisitedAt = Date.now();
    },
  },
  extraReducers: (builder) => {
    // Summary
    builder.addCase(fetchTableroSummary.pending, (state) => {
      state.loadingSummary = true;
      state.errorSummary = null;
    });
    builder.addCase(fetchTableroSummary.fulfilled, (state, action) => {
      state.loadingSummary = false;
      state.summary = action.payload;
    });
    builder.addCase(fetchTableroSummary.rejected, (state, action) => {
      state.loadingSummary = false;
      state.errorSummary = action.payload ?? "Error";
    });

    // Alerts
    builder.addCase(fetchTableroAlerts.pending, (state) => {
      state.loadingAlerts = true;
      state.errorAlerts = null;
    });
    builder.addCase(fetchTableroAlerts.fulfilled, (state, action) => {
      state.loadingAlerts = false;
      state.alerts = action.payload;
    });
    builder.addCase(fetchTableroAlerts.rejected, (state, action) => {
      state.loadingAlerts = false;
      state.errorAlerts = action.payload ?? "Error";
    });

    // Queues
    builder.addCase(fetchTableroQueues.pending, (state, action) => {
      const queueType = action.meta.arg.queueType;
      state.loadingQueues[queueType] = true;
      state.errorQueues[queueType] = null;
    });
    builder.addCase(fetchTableroQueues.fulfilled, (state, action) => {
      const queueType = action.payload.type;
      state.loadingQueues[queueType] = false;
      state.queues[queueType] = action.payload.data;
    });
    builder.addCase(fetchTableroQueues.rejected, (state, action) => {
      const queueType = action.meta.arg.queueType;
      state.loadingQueues[queueType] = false;
      state.errorQueues[queueType] = action.payload ?? "Error";
    });

    // WeeksNav
    builder.addCase(fetchTableroWeeksNav.pending, (state) => {
      state.loadingWeeksNav = true;
      state.errorWeeksNav = null;
    });
    builder.addCase(fetchTableroWeeksNav.fulfilled, (state, action) => {
      state.loadingWeeksNav = false;
      state.weeksNav = action.payload;
    });
    builder.addCase(fetchTableroWeeksNav.rejected, (state, action) => {
      state.loadingWeeksNav = false;
      state.errorWeeksNav = action.payload ?? "Error";
    });

    // StartWeek
    builder.addCase(tableroStartWeek.pending, (state) => {
      state.startingWeek = true;
    });
    builder.addCase(tableroStartWeek.fulfilled, (state) => {
      state.startingWeek = false;
    });
    builder.addCase(tableroStartWeek.rejected, (state) => {
      state.startingWeek = false;
    });

    // FinishWeek
    builder.addCase(tableroFinishWeek.pending, (state) => {
      state.finishingWeek = true;
    });
    builder.addCase(tableroFinishWeek.fulfilled, (state) => {
      state.finishingWeek = false;
    });
    builder.addCase(tableroFinishWeek.rejected, (state) => {
      state.finishingWeek = false;
    });
  },
});

export const {
  setTemporadaId,
  setBodegaId,
  setActiveQueue,
  setFilters,
  setSelectedWeekId,
  resetTablero,
} = tableroBodegaSlice.actions;

export default tableroBodegaSlice.reducer;
