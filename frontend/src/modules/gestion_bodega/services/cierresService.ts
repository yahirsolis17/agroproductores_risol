// frontend/src/modules/gestion_bodega/services/cierresService.ts
import apiClient from "../../../global/api/apiClient";
import { handleBackendNotification } from "../../../global/utils/NotificationEngine";
import type {
  CierreSemanalListResponse,
  CierreSemanalCreatePayload,
  CierreSemanalCreateResponse,
  CierreTemporadaPayload,
  CierreTemporadaResponse,
  CierresIndexResponse,
} from "../types/cierreTypes";

/**
 * Enforce backend envelope and throw on !success.
 * Backend schema esperado:
 * { success: boolean, message: string, message_key: string, data: T }
 * (Soporta fallback legacy con { notification: { message, key } })
 */
function ensureSuccess<T>(resp: any): T {
  const { success, data, message, message_key, notification } = resp || {};
  if (!success) {
    const msg = message || notification?.message || "Operación no exitosa";
    const error = new Error(msg);
    (error as any).message_key = message_key || notification?.key;
    (error as any).payload = resp;
    throw error;
  }
  return data as T;
}

function notifyAndUnwrap<T>(resp: any): T {
  handleBackendNotification(resp);
  return ensureSuccess<T>(resp);
}

const BASE = "/bodega/cierres";

export const cierresService = {
  /**
   * GET /bodega/cierres/?bodega=&temporada=&iso_semana=
   * Devuelve { data: { results, meta } }
   */
  async list(params?: Record<string, any>): Promise<CierreSemanalListResponse> {
    try {
      const resp = await apiClient.get(`${BASE}/`, { params });
      return notifyAndUnwrap<CierreSemanalListResponse>(resp.data);
    } catch (err: unknown) {
      const payload = (err as { payload?: unknown; response?: { data?: unknown } })?.payload
        ?? (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(payload);
      throw err;
    }
  },

  /**
   * GET /bodega/cierres/index/?temporada=:id
   * Devuelve mapping completo de semanas de la temporada.
   */
  async index(temporadaId: number): Promise<CierresIndexResponse> {
    try {
      const resp = await apiClient.get(`${BASE}/index/`, { params: { temporada: temporadaId } });
      return notifyAndUnwrap<CierresIndexResponse>(resp.data);
    } catch (err: unknown) {
      const payload = (err as { payload?: unknown; response?: { data?: unknown } })?.payload
        ?? (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(payload);
      throw err;
    }
  },

  /**
   * POST /bodega/cierres/semanal/
   * Body: { bodega, temporada, fecha_desde, (opcional) fecha_hasta, (opcional) iso_semana }
   * Retorna { cierre: CierreSemanal }
   */
  async semanal(payload: CierreSemanalCreatePayload): Promise<CierreSemanalCreateResponse> {
    try {
      const resp = await apiClient.post(`${BASE}/semanal/`, payload);
      return notifyAndUnwrap<CierreSemanalCreateResponse>(resp.data);
    } catch (err: unknown) {
      const payload = (err as { payload?: unknown; response?: { data?: unknown } })?.payload
        ?? (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(payload);
      throw err;
    }
  },

  /**
   * POST /bodega/cierres/temporada/
   * Body: { temporada }
   */
  async temporada(payload: CierreTemporadaPayload): Promise<CierreTemporadaResponse> {
    try {
      const resp = await apiClient.post(`${BASE}/temporada/`, payload);
      return notifyAndUnwrap<CierreTemporadaResponse>(resp.data);
    } catch (err: unknown) {
      const payload = (err as { payload?: unknown; response?: { data?: unknown } })?.payload
        ?? (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(payload);
      throw err;
    }
  },
};

export default cierresService;
