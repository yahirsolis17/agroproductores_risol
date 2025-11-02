// frontend/src/global/store/tableroBodegaSlice.ts
// Slice de UI para Tablero de Bodega con soporte de isoSemana (YYYY-Www)
// - Mantiene compatibilidad con filtros actuales (fecha_desde/fecha_hasta)
// - Permite setFilters({ isoSemana }) y deriva el rango en el hook

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  QueueType,
  TableroUIState,
} from "../../modules/gestion_bodega/types/tableroBodegaTypes";
import type { RootState } from "./store";

// ───────────────────────────────────────────────────────────────────────────────
// Extensión local de filtros para incluir isoSemana sin romper tipos globales
type FiltersBase = TableroUIState["filters"];
export type FiltersExt = FiltersBase & {
  /** Semana ISO seleccionada (YYYY-Www). Opcional: si llega, el hook deriva from/to. */
  isoSemana?: string | null;
};

// Defaults (con isoSemana opcional). Se mantiene order_by por compatibilidad.
// ⚠️ Alias válidos según backend/_ordering_from_alias:
//   - recepciones: fecha_recepcion, id, huerta
//   - inventarios: fecha, id
//   - despachos:   fecha_programada, id
const DEFAULT_ORDER_BY: Record<QueueType, string> = {
  recepciones: "fecha_recepcion:desc,id:desc",
  inventarios: "fecha:desc,id:desc",
  despachos: "fecha_programada:desc,id:desc",
};

const DEFAULT_FILTERS: FiltersExt = {
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
  isoSemana: null,
};

// Estado extendido localmente (sin romper el tipo exportado aguas arriba)
type TableroStateExt = Omit<TableroUIState, "filters"> & { filters: FiltersExt };

const initialState: TableroStateExt = {
  temporadaId: null,
  filters: DEFAULT_FILTERS,
  activeQueue: "recepciones",

  refreshSummaryAt: null,
  refreshAlertsAt: null,
  refreshQueuesAt: {
    recepciones: null,
    inventarios: null,
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
      // Si no hay un order_by explícito del usuario o venimos del default anterior,
      // reasignamos al default correspondiente a la cola activa.
      state.filters.order_by = DEFAULT_ORDER_BY[action.payload];
      // Al cambiar de cola, volvemos a la primera página
      state.filters.page = 1;
    },

    // Permite parches parciales; acepta también isoSemana
    setFilters(state, action: PayloadAction<Partial<FiltersExt>>) {
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
      state.refreshQueuesAt = {
        recepciones: null,
        inventarios: null,
        despachos: null,
      };
    },

    resetTablero(state) {
      state.filters = DEFAULT_FILTERS;
      state.activeQueue = "recepciones";
      state.refreshSummaryAt = null;
      state.refreshAlertsAt = null;
      state.refreshQueuesAt = {
        recepciones: null,
        inventarios: null,
        despachos: null,
      };
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

// Nota: mantenemos la firma original para no romper imports existentes.
// A nivel de uso, el objeto real contiene filters: FiltersExt.
export const selectTablero = (state: RootState) =>
  state.tableroBodega as unknown as TableroStateExt;

export default tableroBodegaSlice.reducer;
