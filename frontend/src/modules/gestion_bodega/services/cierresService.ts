// frontend/src/modules/gestion_bodega/services/cierresService.ts
import apiClient from "../../../global/api/apiClient";
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

const BASE = "/bodega/cierres";

export const cierresService = {
  /**
   * GET /bodega/cierres/?bodega=&temporada=&iso_semana=
   * Devuelve { data: { results, meta } }
   */
  async list(params?: Record<string, any>): Promise<CierreSemanalListResponse> {
    const resp = await apiClient.get(`${BASE}/`, { params });
    return ensureSuccess<CierreSemanalListResponse>(resp.data);
  },

  /**
   * GET /bodega/cierres/index/?temporada=:id
   * Devuelve mapping completo de semanas de la temporada.
   */
  async index(temporadaId: number): Promise<CierresIndexResponse> {
    const resp = await apiClient.get(`${BASE}/index/`, { params: { temporada: temporadaId } });
    return ensureSuccess<CierresIndexResponse>(resp.data);
  },

  /**
   * POST /bodega/cierres/semanal/
   * Body: { bodega, temporada, fecha_desde, (opcional) fecha_hasta, (opcional) iso_semana }
   * Retorna { cierre: CierreSemanal }
   */
  async semanal(payload: CierreSemanalCreatePayload): Promise<CierreSemanalCreateResponse> {
    const resp = await apiClient.post(`${BASE}/semanal/`, payload);
    return ensureSuccess<CierreSemanalCreateResponse>(resp.data);
  },

  /**
   * POST /bodega/cierres/temporada/
   * Body: { temporada }
   */
  async temporada(payload: CierreTemporadaPayload): Promise<CierreTemporadaResponse> {
    const resp = await apiClient.post(`${BASE}/temporada/`, payload);
    return ensureSuccess<CierreTemporadaResponse>(resp.data);
  },
};

export default cierresService;
