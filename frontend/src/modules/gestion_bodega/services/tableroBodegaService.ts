// frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts

import apiClient from "../../../global/api/apiClient";
import { handleBackendNotification } from "../../../global/utils/NotificationEngine";
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
 * Backend real (NotificationHandler):
 * {
 *   success: boolean,
 *   notification: { key, message, type, action?, target? },
 *   data: T,
 *   ...extra_data
 * }
 *
 * Soporta fallback legacy:
 * - { message, message_key, data }
 * - DRF puro: { results, count, next, previous } (sin success)
 */
function unwrapEnvelope<T>(payload: any): T {
  const root = payload ?? {};

  // ⚠️ Notificación centralizada (si tu engine decide “silenciar” GET, perfecto)
  handleBackendNotification(root);

  const hasSuccess = typeof root?.success === "boolean";
  const success = hasSuccess ? Boolean(root.success) : true;

  if (!success) {
    const msg =
      root?.notification?.message ||
      root?.message ||
      root?.detail ||
      "Operación no exitosa";

    const err = new Error(msg);
    (err as any).message_key = root?.notification?.key || root?.message_key;
    (err as any).payload = root;
    throw err;
  }

  // NotificationHandler: root.data
  // DRF puro: root (no tiene .data)
  return (root?.data ?? root) as T;
}

function pickMsg(...values: any[]) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function fieldErr(payload: any, field: string) {
  return (
    payload?.errors?.[field]?.[0] ||
    payload?.data?.errors?.[field]?.[0] ||
    null
  );
}

/**
 * Mapea filtros de UI a DTO de querystring (cliente → API).
 * Fuente de verdad: semana_id (CierreSemanal). Sin ISO en cliente.
 */
function toQueryParams(
  temporadaId: number,
  filters?: Partial<TableroFiltersDTO> & {
    bodegaId?: number | null;
    semanaId?: number | null;
  }
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
    estado,
    solo_pendientes,
    page,
    page_size,
    order_by,
  } = filters;

  const bodegaId = filters.bodegaId ?? null;
  const semanaId = (filters as any).semanaId ?? null;

  if (bodegaId != null) params.bodega = bodegaId;

  if (huerta_id != null) params.huerta_id = huerta_id;
  if (fecha_desde) params.fecha_desde = fecha_desde; // yyyy-mm-dd
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;
  if (estado_lote) params.estado_lote = estado_lote;
  if (calidad) params.calidad = calidad;
  if (madurez) params.madurez = madurez;
  if (estado) params.estado = estado;
  if (solo_pendientes != null) params.solo_pendientes = solo_pendientes;
  if (page != null) params.page = page;
  if (page_size != null) params.page_size = page_size;
  if (order_by) params.order_by = order_by;

  // Prioridad backend: semana_id > rango explícito > semana activa
  if (semanaId != null) params.semana_id = semanaId;

  return params;
}

/** Prefijo raíz correcto según urls del backend */
const BASE = "/bodega/tablero";

/** SUMMARY */
export async function getDashboardSummary(
  temporadaId: number,
  filters?: Partial<TableroFiltersDTO> & {
    bodegaId?: number | null;
    semanaId?: number | null;
  }
): Promise<DashboardSummaryResponse> {
  const params = toQueryParams(temporadaId, filters);
  const resp = await apiClient.get(`${BASE}/summary/`, { params });
  return unwrapEnvelope<DashboardSummaryResponse>(resp.data);
}

/** QUEUES */
export async function getDashboardQueues(
  temporadaId: number,
  type: QueueType,
  filters?: Partial<TableroFiltersDTO> & {
    bodegaId?: number | null;
    semanaId?: number | null;
  }
): Promise<DashboardQueueResponse> {
  const params = { ...toQueryParams(temporadaId, filters), queue: type };
  const resp = await apiClient.get(`${BASE}/queues/`, { params });
  return unwrapEnvelope<DashboardQueueResponse>(resp.data);
}

/** ALERTS */
export async function getDashboardAlerts(
  temporadaId: number,
  filters?: { bodegaId?: number | null }
): Promise<DashboardAlertResponse> {
  const params = toQueryParams(temporadaId, {
    bodegaId: filters?.bodegaId ?? null,
  });
  const resp = await apiClient.get(`${BASE}/alerts/`, { params });
  return unwrapEnvelope<DashboardAlertResponse>(resp.data);
}

/** WEEK: estado actual (activa/última) */
export async function getWeekCurrent(
  temporadaId: number,
  bodegaId: number
): Promise<WeekCurrentResponse> {
  const resp = await apiClient.get(`${BASE}/week/current/`, {
    params: { temporada: temporadaId, bodega: bodegaId },
  });
  return unwrapEnvelope<WeekCurrentResponse>(resp.data);
}

/** WEEK: iniciar */
export async function startWeek(body: WeekStartRequest): Promise<WeekCurrentResponse> {
  try {
    const resp = await apiClient.post(`${BASE}/week/start/`, body);
    return unwrapEnvelope<WeekCurrentResponse>(resp.data);
  } catch (err: any) {
    const data = err?.response?.data ?? err?.payload ?? null;

    // ✅ Notificación backend en error
    handleBackendNotification(data);

    const msg =
      pickMsg(
        fieldErr(data, "fecha_desde"),
        data?.errors?.detail,
        data?.data?.errors?.detail,
        data?.detail,
        data?.message,
        data?.notification?.message,
        err?.message
      ) || "No se pudo iniciar la semana.";

    const e = new Error(msg);
    (e as any).payload = data;
    (e as any).message_key = data?.notification?.key || data?.message_key || err?.message_key;
    throw e;
  }
}

/** WEEK: finalizar */
export async function finishWeek(body: WeekFinishRequest): Promise<WeekCurrentResponse> {
  try {
    const resp = await apiClient.post(`${BASE}/week/finish/`, body);
    return unwrapEnvelope<WeekCurrentResponse>(resp.data);
  } catch (err: any) {
    const data = err?.response?.data ?? err?.payload ?? null;

    // ✅ Notificación backend en error
    handleBackendNotification(data);

    const msg =
      pickMsg(
        fieldErr(data, "fecha_hasta"),
        data?.errors?.detail,
        data?.data?.errors?.detail,
        data?.detail,
        data?.message,
        data?.notification?.message,
        err?.message
      ) || "No se pudo finalizar la semana.";

    const e = new Error(msg);
    (e as any).payload = data;
    (e as any).message_key = data?.notification?.key || data?.message_key || err?.message_key;
    throw e;
  }
}

/**
 * WEEKS NAV (barra sticky de semanas: prev/next/total/actual)
 * Endpoint: GET /bodega/tablero/semanas/?bodega=:id&temporada=:id
 */
export async function getWeeksNav(
  temporadaId: number,
  bodegaId: number
): Promise<WeeksNavResponse> {
  const params = toQueryParams(temporadaId, { bodegaId });
  const resp = await apiClient.get(`${BASE}/semanas/`, { params });
  return unwrapEnvelope<WeeksNavResponse>(resp.data);
}

/** REPORTE SEMANAL (Blob) */
export async function getDashboardReport(
  temporadaId: number,
  bodegaId: number,
  semanaId?: number
): Promise<Blob> {
  // Ajuste: endpoint en raíz /bodega/reportes/semanal/
  const url = "/bodega/reportes/semanal/";
  const params: any = { temporada: temporadaId, bodega: bodegaId };
  if (semanaId) params.semana_id = semanaId;

  const resp = await apiClient.get(url, {
    params,
    responseType: "blob",
  });
  // No hay unwrapEnvelope para blob directos
  return resp.data;
}
