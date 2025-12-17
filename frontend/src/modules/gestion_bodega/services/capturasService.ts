import api from "../../../global/api/apiClient";
import { handleBackendNotification } from "../../../global/utils/NotificationEngine";
import type {
  PaginationMeta,
  Captura,
  CapturaCreateDTO,
  CapturaUpdateDTO,
  CapturaPatchDTO,
  CapturasListResponse,
  CapturaSingleResponse,
  CapturaFilters,
} from "../types/capturasTypes";

const BASE = "/bodega/recepciones/";

// -------------------------------
// Normalizadores
// -------------------------------
function normalizeMeta(raw: any): PaginationMeta {
  if (!raw) {
    return {
      count: 0,
      next: null,
      previous: null,
      page: 1,
      page_size: 20,
      total_pages: 1,
    };
  }

  // Envelope con meta extendido (GenericPagination)
  if (
    typeof raw.page !== "undefined" ||
    typeof raw.page_size !== "undefined" ||
    typeof raw.total_pages !== "undefined"
  ) {
    return {
      count: raw.count ?? 0,
      next: raw.next ?? null,
      previous: raw.previous ?? null,
      page: raw.page ?? 1,
      page_size: raw.page_size ?? 20,
      total_pages: raw.total_pages ?? 1,
      semana_cerrada: raw.semana_cerrada ?? undefined,
      temporada_finalizada: raw.temporada_finalizada ?? undefined,
      semana_rango: raw.semana_rango ?? undefined,
    };
  }

  // DRF puro (count/next/previous/results)
  return {
    count: raw.count ?? 0,
    next: raw.next ?? null,
    previous: raw.previous ?? null,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };
}

/**
 * Devuelve la capa "usable" de data:
 * - NotificationHandler: { success, notification, data: {...}, [extra_data...] } -> data (+meta si vino en root)
 * - DRF puro: { results, count, next, previous } -> el root
 */
function getDataLayer(res: any): any {
  const root = res?.data ?? {};
  if (root?.data) {
    const merged = { ...(root.data ?? {}) };
    // Si alguien envía meta en el root (extra_data), no lo perdemos
    if (root.meta && !merged.meta) merged.meta = root.meta;
    return merged;
  }
  return root;
}

// Unifica envelope { data: { recepciones, meta } } o DRF { results, count, next, previous }
function normalizeListPayload(res: any): CapturasListResponse {
  handleBackendNotification(res?.data);

  const dataLayer = getDataLayer(res);

  const capturas: Captura[] =
    dataLayer.recepciones ??
    dataLayer.capturas ??
    dataLayer.results ??
    [];

  const metaRaw =
    dataLayer.meta ??
    (("count" in dataLayer || "next" in dataLayer || "previous" in dataLayer) ? dataLayer : undefined);

  return { capturas, meta: normalizeMeta(metaRaw) };
}

// Unifica envelope { data: { recepcion } } → FE { captura }
function normalizeSinglePayload(res: any): CapturaSingleResponse {
  handleBackendNotification(res?.data);

  const dataLayer = getDataLayer(res);

  const captura: Captura =
    dataLayer.recepcion ?? // backend actual
    dataLayer.captura ??   // alias futuro
    dataLayer.item ??      // fallback
    dataLayer;

  return { captura };
}

// -------------------------------
// Query builder
// -------------------------------
function buildQuery(params: CapturaFilters = {}): Record<string, any> {
  const q: Record<string, any> = {};

  if (params.page) q.page = params.page;
  if (params.page_size) q.page_size = params.page_size;
  if (params.bodega) q.bodega = params.bodega;
  if (params.temporada) q.temporada = params.temporada;
  if (params.semana) {
    q.semana = params.semana;
    q.week_id = params.semana; // alias para deep-link/backends que usen week_id
  }

  return q;
}

// -------------------------------
// Service API
// -------------------------------
export const capturasService = {
  async list(
    params: CapturaFilters = {},
    opts?: { signal?: AbortSignal }
  ): Promise<CapturasListResponse> {
    try {
      const res = await api.get(BASE, { params: buildQuery(params), signal: opts?.signal });
      return normalizeListPayload(res);
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },

  async retrieve(id: number): Promise<CapturaSingleResponse> {
    try {
      const res = await api.get(`${BASE}${id}/`);
      return normalizeSinglePayload(res);
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },

  async create(payload: CapturaCreateDTO): Promise<CapturaSingleResponse> {
    try {
      const res = await api.post(BASE, payload);
      return normalizeSinglePayload(res);
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },

  async update(id: number, payload: CapturaUpdateDTO): Promise<CapturaSingleResponse> {
    try {
      const res = await api.put(`${BASE}${id}/`, payload);
      return normalizeSinglePayload(res);
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },

  async patch(id: number, payload: CapturaPatchDTO): Promise<CapturaSingleResponse> {
    try {
      const res = await api.patch(`${BASE}${id}/`, payload);
      return normalizeSinglePayload(res);
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },

  async archivar(id: number): Promise<{ captura_id: number } & Partial<CapturaSingleResponse>> {
    try {
      const res = await api.post(`${BASE}${id}/archivar/`);
      handleBackendNotification(res?.data);

      const d = getDataLayer(res) ?? {};
      if (d.recepcion) return { captura_id: d.recepcion.id, captura: d.recepcion };
      if (d.captura) return { captura_id: d.captura.id, captura: d.captura };

      return { captura_id: d.recepcion_id ?? d.captura_id ?? id };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },

  async restaurar(id: number): Promise<CapturaSingleResponse> {
    try {
      const res = await api.post(`${BASE}${id}/restaurar/`);
      return normalizeSinglePayload(res);
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },

  async remove(id: number): Promise<{ deleted_id: number }> {
    try {
      const res = await api.delete(`${BASE}${id}/`);
      handleBackendNotification(res?.data);

      const d = getDataLayer(res) ?? {};
      return { deleted_id: d.deleted_id ?? id };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
      throw err;
    }
  },
};

export default capturasService;

// Named exports (comodidad para slices/thunks)
export const listCapturas = capturasService.list;
export const getCaptura = capturasService.retrieve;
export const createCaptura = capturasService.create;
export const updateCaptura = capturasService.update;
export const patchCaptura = capturasService.patch;
export const archivarCaptura = capturasService.archivar;
export const restaurarCaptura = capturasService.restaurar;
export const deleteCaptura = capturasService.remove;
