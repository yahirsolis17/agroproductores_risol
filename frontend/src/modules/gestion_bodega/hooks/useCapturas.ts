// frontend/src/modules/gestion_bodega/hooks/useCapturas.ts
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../global/store/store";
import {
  fetchCapturas,
  createCapturaThunk,
  updateCapturaThunk,
  archivarCapturaThunk,
  restaurarCapturaThunk,
  deleteCapturaThunk,

  setBodega,
  setTemporada,
  setSemana,
  setPage,
  setPageSize,
} from "../../../global/store/capturasSlice";
import type { CapturaCreatePayload, CapturaUpdatePayload } from "../types/capturasTypes";


export default function useCapturas() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.capturas);
  const { items, meta, filters, status, saving } = state;
  const loading = status === "loading";

  // fetch
  const refetch = useCallback(() => dispatch(fetchCapturas()).unwrap(), [dispatch]);

  // CRUD
  const create = useCallback(
    (payload: CapturaCreatePayload) => dispatch(createCapturaThunk(payload)).unwrap(),
    [dispatch]
  );

  const update = useCallback(
    (id: number, data: CapturaUpdatePayload) => dispatch(updateCapturaThunk({ id, data })).unwrap(),
    [dispatch]
  );

  const archivar = useCallback((id: number) => dispatch(archivarCapturaThunk({ id })).unwrap(), [dispatch]);

  const restaurar = useCallback((id: number) => dispatch(restaurarCapturaThunk({ id })).unwrap(), [dispatch]);

  const remove = useCallback((id: number) => dispatch(deleteCapturaThunk({ id })).unwrap(), [dispatch]);

  // setters
  const actions = {
    setBodega: (v?: number) => dispatch(setBodega(v)),
    setTemporada: (v?: number) => dispatch(setTemporada(v)),
    setSemana: (v?: number) => dispatch(setSemana(v)),
    setPage: (v: number) => dispatch(setPage(v)),
    setPageSize: (v: number) => dispatch(setPageSize(v)),
  };

  /**
   * Helper opcional (no rompe nada si no lo usas):
   * Sincroniza contexto y resetea page.
   */
  const setContext = useCallback(
    (params: { bodegaId?: number; temporadaId?: number; semanaId?: number; resetPage?: boolean } = {}) => {
      const { bodegaId, temporadaId, semanaId, resetPage = true } = params;

      if (typeof bodegaId !== "undefined") dispatch(setBodega(bodegaId));
      if (typeof temporadaId !== "undefined") dispatch(setTemporada(temporadaId));
      if (typeof semanaId !== "undefined") dispatch(setSemana(semanaId));

      if (resetPage) dispatch(setPage(1));
    },
    [dispatch]
  );

  // Helper opcional: sincroniza filtros desde el Tablero y (opcional) hace refetch
  const syncFromTablero = useCallback(
    (params: { bodegaId?: number; temporadaId?: number; semanaId?: number; refetchNow?: boolean }) => {
      let resetPage = false;

      if (typeof params.bodegaId !== "undefined") {
        dispatch(setBodega(params.bodegaId));
        resetPage = true;
      }

      if (typeof params.temporadaId !== "undefined") {
        dispatch(setTemporada(params.temporadaId));
        resetPage = true;
      }

      if (typeof params.semanaId !== "undefined") {
        dispatch(setSemana(params.semanaId));
        resetPage = true;
      }

      if (resetPage) dispatch(setPage(1));
      if (params?.refetchNow) void dispatch(fetchCapturas());
    },
    [dispatch]
  );

  return {
    items,
    meta,
    filters,
    loading,
    saving,

    refetch,
    create,
    update,
    archivar,
    restaurar,
    remove,

    ...actions,
    setContext,
    syncFromTablero,

    get canOperate() {
      // Operación depende de contexto mínimo + flags del backend (si vienen)
      if (!filters?.bodega || !filters?.temporada) return false;
      if (meta?.temporada_finalizada) return false;
      if (meta?.semana_cerrada) return false;
      return true;
    },

    get reasonDisabled() {
      if (!filters?.bodega || !filters?.temporada) return "Selecciona bodega y temporada.";
      if (meta?.temporada_finalizada) return "La temporada está finalizada.";
      if (meta?.semana_cerrada) return "La semana está cerrada.";
      return "";
    },
  };
}
