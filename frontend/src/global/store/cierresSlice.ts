// frontend/src/global/store/cierreSlice.ts
// Slice de UI para Cierres Semanales (Bodega):
// - Contexto: temporadaId, bodegaId
// - Filtros/paginación: iso_semana, page, page_size
// - Draft/Modal: creación rápida de semana (ABIERTA o cerrada)
// - Señal de refetch liviana

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

export type CierresUIState = {
  temporadaId: number | null;
  bodegaId: number | null;

  // Filtro principal: iso_semana (YYYY-Www) o null para ver todas
  iso_semana: string | null;

  // Paginación
  page: number;
  page_size: number;

  // Draft para modal de creación
  draft: {
    desde: string | null; // "YYYY-MM-DD"
    hasta: string | null; // "YYYY-MM-DD" | null
  };

  // Modal
  showCreateModal: boolean;

  // Señal de refetch sutil
  _refetchAt: number | null;

  // Meta
  lastVisitedAt: number | null;
};

const initialState: CierresUIState = {
  temporadaId: null,
  bodegaId: null,
  iso_semana: null,
  page: 1,
  page_size: 10,
  draft: { desde: null, hasta: null },
  showCreateModal: false,
  _refetchAt: null,
  lastVisitedAt: null,
};

const cierreSlice = createSlice({
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

    setPagination(state, action: PayloadAction<Partial<Pick<CierresUIState, "page" | "page_size">>>) {
      if (action.payload.page !== undefined) state.page = action.payload.page!;
      if (action.payload.page_size !== undefined) state.page_size = action.payload.page_size!;
    },

    openCreateModal(state) {
      state.showCreateModal = true;
    },
    closeCreateModal(state) {
      state.showCreateModal = false;
    },

    setDraftDates(
      state,
      action: PayloadAction<{ desde?: string | null; hasta?: string | null }>
    ) {
      if (action.payload.desde !== undefined) state.draft.desde = action.payload.desde ?? null;
      if (action.payload.hasta !== undefined) state.draft.hasta = action.payload.hasta ?? null;
    },

    markRefetch(state) {
      state._refetchAt = Date.now();
    },
    consumeRefetch(state) {
      state._refetchAt = null;
    },

    resetCierres() {
      return { ...initialState, lastVisitedAt: Date.now() };
    },
  },
});

export const {
  setContext,
  setIsoSemana,
  setPagination,
  openCreateModal,
  closeCreateModal,
  setDraftDates,
  markRefetch,
  consumeRefetch,
  resetCierres,
} = cierreSlice.actions;

export const selectCierres = (state: RootState) => state.cierres as CierresUIState;

export default cierreSlice.reducer;
