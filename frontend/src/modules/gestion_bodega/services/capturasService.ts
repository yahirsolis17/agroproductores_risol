// frontend/src/modules/gestion_bodega/services/capturasService.ts
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
  EmpaqueStatus,
} from "../types/capturasTypes";

const BASE = "/bodega/recepciones/";

function clampInt(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

function normalizeEmpaqueStatusRaw(raw: any): EmpaqueStatus | undefined {
  const val =
    raw?.empaque_status ??
    raw?.empaque_estado ??
    raw?.estado_empaque ??
    raw?.empaque ??
    undefined;

  if (!val) return undefined;
  const v = String(val).trim().toUpperCase();

  if (v === "SIN_EMPAQUE" || v === "NONE" || v === "NO" || v.includes("SIN")) return "SIN_EMPAQUE";
  if (v === "PARCIAL" || v.includes("PARC")) return "PARCIAL";
  if (v === "EMPACADO" || v === "DONE" || v === "COMPLETO" || v.includes("EMPAC")) return "EMPACADO";

  return undefined;
}

function normalizeCapturaRow(raw: any): Captura {
  const empaque_status = normalizeEmpaqueStatusRaw(raw);

  return {
    ...raw,
    id: Number(raw?.id),
    bodega: Number(raw?.bodega),
    temporada: Number(raw?.temporada),
    fecha: String(raw?.fecha ?? ""),
    huertero_nombre: String(raw?.huertero_nombre ?? ""),
    tipo_mango: String(raw?.tipo_mango ?? ""),
    cantidad_cajas: clampInt(raw?.cantidad_cajas),
    observaciones: raw?.observaciones ?? null,
    is_active: Boolean(raw?.is_active),

    empaque_status,
    cajas_empaquetadas: raw?.cajas_empaquetadas != null ? clampInt(raw?.cajas_empaquetadas) : undefined,
    cajas_disponibles: raw?.cajas_disponibles != null ? clampInt(raw?.cajas_disponibles) : undefined,
    cajas_merma: raw?.cajas_merma != null ? clampInt(raw?.cajas_merma) : undefined,
    empaque_id: raw?.empaque_id != null ? Number(raw?.empaque_id) : raw?.empaque_id ?? undefined,
  };
}

function normalizeMeta(raw: any): PaginationMeta {
  if (!raw) {
    return { count: 0, next: null, previous: null, page: 1, page_size: 20, total_pages: 1 };
  }

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

  return {
    count: raw.count ?? 0,
    next: raw.next ?? null,
    previous: raw.previous ?? null,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };
}

function getDataLayer(res: any): any {
  const root = res?.data ?? {};
  if (root?.data) {
    const merged = { ...(root.data ?? {}) };
    if (root.meta && !merged.meta) merged.meta = root.meta;
    return merged;
  }
  return root;
}

function normalizeListPayload(res: any): CapturasListResponse {
  handleBackendNotification(res?.data);

  const dataLayer = getDataLayer(res);

  const rawRows: any[] =
    dataLayer.recepciones ??
    dataLayer.capturas ??
    dataLayer.results ??
    [];

  const capturas: Captura[] = Array.isArray(rawRows) ? rawRows.map(normalizeCapturaRow) : [];

  const metaRaw =
    dataLayer.meta ??
    (("count" in dataLayer || "next" in dataLayer || "previous" in dataLayer) ? dataLayer : undefined);

  return { capturas, meta: normalizeMeta(metaRaw) };
}

function normalizeSinglePayload(res: any): CapturaSingleResponse {
  handleBackendNotification(res?.data);

  const dataLayer = getDataLayer(res);

  const raw =
    dataLayer.recepcion ??
    dataLayer.captura ??
    dataLayer.item ??
    dataLayer;

  return { captura: normalizeCapturaRow(raw) };
}

function buildQuery(params: CapturaFilters = {}): Record<string, any> {
  const q: Record<string, any> = {};
  if (params.page) q.page = params.page;
  if (params.page_size) q.page_size = params.page_size;
  if (params.bodega) q.bodega = params.bodega;
  if (params.temporada) q.temporada = params.temporada;
  if (params.semana) {
    q.semana = params.semana;
    q.week_id = params.semana;
  }
  return q;
}

export const capturasService = {
  async list(params: CapturaFilters = {}, opts?: { signal?: AbortSignal }): Promise<CapturasListResponse> {
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
      if (d.recepcion) return { captura_id: d.recepcion.id, captura: normalizeCapturaRow(d.recepcion) };
      if (d.captura) return { captura_id: d.captura.id, captura: normalizeCapturaRow(d.captura) };

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

export const listCapturas = capturasService.list;
export const getCaptura = capturasService.retrieve;
export const createCaptura = capturasService.create;
export const updateCaptura = capturasService.update;
export const patchCaptura = capturasService.patch;
export const archivarCaptura = capturasService.archivar;
export const restaurarCaptura = capturasService.restaurar;
export const deleteCaptura = capturasService.remove;
