// frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts

import apiClient from "../../../global/api/apiClient";
import type {
  DashboardSummaryResponse,
  DashboardQueueResponse,
  DashboardAlertResponse,
  QueueType,
  TableroFiltersDTO,
  WeeksNavResponse,
  WeekCurrentResponse,
  WeekStartRequest,
  WeekFinishRequest,
} from "../types/tableroBodegaTypes";

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

/**
 * Mapea filtros de UI a DTO de querystring (cliente → API).
 * Acepta también isoSemana (FE) → iso_semana (API), y bodegaId → bodega (API).
 */
function toQueryParams(
  temporadaId: number,
  filters?: Partial<TableroFiltersDTO> & { isoSemana?: string | null; bodegaId?: number | null; semanaId?: number | null }
) {
  const params: Record<string, any> = { temporada: temporadaId };
  if (!filters) return params;

  const {
    huerta_id,
    fecha_desde,
    fecha_hasta,
    estado_lote,
    calidad,
    madurez,
    solo_pendientes,
    page,
    page_size,
    order_by,
  } = filters;

  const isoSemana = filters.isoSemana;
  const bodegaId = filters.bodegaId;
  const semanaId = (filters as any).semanaId ?? null;

  if (bodegaId != null) params.bodega = bodegaId;
  if (huerta_id != null) params.huerta_id = huerta_id;
  if (fecha_desde) params.fecha_desde = fecha_desde; // yyyy-mm-dd
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;
  if (estado_lote) params.estado_lote = estado_lote;
  if (calidad) params.calidad = calidad;
  if (madurez) params.madurez = madurez;
  if (solo_pendientes != null) params.solo_pendientes = solo_pendientes;
  if (page != null) params.page = page;
  if (page_size != null) params.page_size = page_size;
  if (order_by) params.order_by = order_by;

  // ⚠️ Nunca mandamos iso_semana cuando es una semana MANUAL
  if (isoSemana && isoSemana !== "MANUAL") {
    params.iso_semana = isoSemana;
  }

  // Prioridad backend: semana_id > rango explícito > iso_semana > semana activa
  if (semanaId != null) {
    params.semana_id = semanaId;
  }

  return params;
}

/** Prefijo raíz correcto según urls del backend */
const BASE = "/bodega/tablero";

/** SUMMARY */
export async function getDashboardSummary(
  temporadaId: number,
  filters?: Partial<TableroFiltersDTO> & { isoSemana?: string | null; bodegaId?: number | null; semanaId?: number | null }
): Promise<DashboardSummaryResponse> {
  const params = toQueryParams(temporadaId, filters);
  const resp = await apiClient.get(`${BASE}/summary/`, { params });
  return ensureSuccess<DashboardSummaryResponse>(resp.data);
}

/** QUEUES */
export async function getDashboardQueues(
  temporadaId: number,
  type: QueueType,
  filters?: Partial<TableroFiltersDTO> & { isoSemana?: string | null; bodegaId?: number | null; semanaId?: number | null }
): Promise<DashboardQueueResponse> {
  const params = { ...toQueryParams(temporadaId, filters), type };
  const resp = await apiClient.get(`${BASE}/queues/`, { params });
  return ensureSuccess<DashboardQueueResponse>(resp.data);
}

/** ALERTS */
export async function getDashboardAlerts(
  temporadaId: number,
  filters?: { bodegaId?: number | null }
): Promise<DashboardAlertResponse> {
  const params = toQueryParams(temporadaId, { bodegaId: filters?.bodegaId ?? null });
  const resp = await apiClient.get(`${BASE}/alerts/`, { params });
  return ensureSuccess<DashboardAlertResponse>(resp.data);
}

/** WEEK: estado actual (activa/última) */
export async function getWeekCurrent(
  temporadaId: number,
  bodegaId: number
): Promise<WeekCurrentResponse> {
  const resp = await apiClient.get(`${BASE}/week/current/`, {
    params: { temporada: temporadaId, bodega: bodegaId },
  });
  return ensureSuccess<WeekCurrentResponse>(resp.data);
}

/** WEEK: iniciar */
export async function startWeek(body: WeekStartRequest): Promise<WeekCurrentResponse> {
  try {
    const resp = await apiClient.post(`${BASE}/week/start/`, body);
    return ensureSuccess<WeekCurrentResponse>(resp.data);
  } catch (err: any) {
    const data = err?.response?.data;
    const msg =
      data?.errors?.fecha_desde?.[0] ||
      data?.errors?.detail ||
      data?.detail ||
      data?.message ||
      data?.notification?.message ||
      err?.message ||
      "No se pudo iniciar la semana.";
    const e = new Error(msg);
    (e as any).payload = data;
    throw e;
  }
}

/** WEEK: finalizar */
export async function finishWeek(body: WeekFinishRequest): Promise<WeekCurrentResponse> {
  try {
    const resp = await apiClient.post(`${BASE}/week/finish/`, body);
    return ensureSuccess<WeekCurrentResponse>(resp.data);
  } catch (err: any) {
    const data = err?.response?.data;
    const msg =
      data?.errors?.fecha_hasta?.[0] ||
      data?.errors?.detail ||
      data?.detail ||
      data?.message ||
      data?.notification?.message ||
      err?.message ||
      "No se pudo finalizar la semana.";
    const e = new Error(msg);
    (e as any).payload = data;
    throw e;
  }
}

/**
 * WEEKS NAV (barra sticky de semanas: prev/next/total/actual)
 * Endpoint: GET /bodega/tablero/semanas/?bodega=:id&temporada=:id&iso_semana=YYYY-Www
 */
export async function getWeeksNav(
  temporadaId: number,
  bodegaId: number,
  opts?: { isoSemana?: string | null }
): Promise<WeeksNavResponse> {
  const params = toQueryParams(temporadaId, { bodegaId, isoSemana: opts?.isoSemana ?? null });
  const resp = await apiClient.get(`${BASE}/semanas/`, { params });
  return ensureSuccess<WeeksNavResponse>(resp.data);
}
