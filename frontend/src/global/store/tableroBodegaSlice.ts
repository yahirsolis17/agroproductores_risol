// frontend/src/modules/gestion_bodega/global/store/tableroBodegaSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { QueueType, TableroUIState } from "../../modules/gestion_bodega/types/tableroBodegaTypes";
import type { RootState } from "./store"; // ← tu tipo raíz del store

const DEFAULT_FILTERS: TableroUIState["filters"] = {
  huerta_id: null,
  fecha_desde: null,
  fecha_hasta: null,
  estado_lote: null,
  calidad: null,
  madurez: null,
  solo_pendientes: true,
  page: 1,
  page_size: 10,
  order_by: "fecha_recepcion:asc,id:asc",
};

const initialState: TableroUIState = {
  temporadaId: null,
  filters: DEFAULT_FILTERS,
  activeQueue: "recepciones",

  refreshSummaryAt: null,
  refreshAlertsAt: null,
  refreshQueuesAt: {
    recepciones: null,
    ubicaciones: null,
    despachos: null,
  },

  lastVisitedAt: null,
};

const tableroBodegaSlice = createSlice({
  name: "tableroBodega",
  initialState,
  reducers: {
    setTemporadaId(state, action: PayloadAction<number>) {
      state.temporadaId = action.payload;
      state.lastVisitedAt = Date.now();
    },
    setActiveQueue(state, action: PayloadAction<QueueType>) {
      state.activeQueue = action.payload;
      // Ajusta order_by por cola si es el default genérico
      if (!state.filters.order_by || state.filters.order_by.includes("fecha_recepcion")) {
        if (action.payload === "ubicaciones") {
          state.filters.order_by = "prioridad:desc,recepcion__fecha_recepcion:desc";
        } else if (action.payload === "despachos") {
          state.filters.order_by = "fecha_programada:asc,id:asc";
        } else {
          state.filters.order_by = "fecha_recepcion:asc,id:asc";
        }
      }
    },
    setFilters(state, action: PayloadAction<Partial<TableroUIState["filters"]>>) {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Refetch sutil: marca qué actualizar, y applyRefetch “consume” las marcas
    scheduleRefetch(state, action: PayloadAction<"summary" | "alerts" | QueueType>) {
      const now = Date.now();
      const what = action.payload;
      if (what === "summary") state.refreshSummaryAt = now;
      else if (what === "alerts") state.refreshAlertsAt = now;
      else state.refreshQueuesAt[what] = now;
    },
    applyRefetch(state) {
      state.refreshSummaryAt = null;
      state.refreshAlertsAt = null;
      state.refreshQueuesAt = { recepciones: null, ubicaciones: null, despachos: null };
    },

    resetTablero(state) {
      state.filters = DEFAULT_FILTERS;
      state.activeQueue = "recepciones";
      state.refreshSummaryAt = null;
      state.refreshAlertsAt = null;
      state.refreshQueuesAt = { recepciones: null, ubicaciones: null, despachos: null };
      state.lastVisitedAt = Date.now();
    },
  },
});

export const {
  setTemporadaId,
  setActiveQueue,
  setFilters,
  scheduleRefetch,
  applyRefetch,
  resetTablero,
} = tableroBodegaSlice.actions;

export const selectTablero = (state: RootState) => state.tableroBodega as TableroUIState;

export default tableroBodegaSlice.reducer;
