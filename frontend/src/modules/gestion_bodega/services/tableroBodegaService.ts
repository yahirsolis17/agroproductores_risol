// frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts

import apiClient from '../../../global/api/apiClient';
import type {
  DashboardSummaryResponse,
  DashboardQueueResponse,
  DashboardAlertResponse,
  QueueType,
  TableroFiltersDTO,
} from "../types/tableroBodegaTypes";

/**
 * Enforce backend envelope and throw on !success.
 */
function ensureSuccess<T>(resp: any): T {
  const { success, data, message, message_key } = resp || {};
  if (!success) {
    const error = new Error(message || "Operación no exitosa");
    (error as any).message_key = message_key;
    (error as any).payload = resp;
    throw error;
  }
  return data as T;
}

/**
 * Mapea filtros de UI a DTO de querystring (cliente → API).
 */
function toQueryParams(temporadaId: number, filters?: Partial<TableroFiltersDTO>) {
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

  return params;
}

/** SUMMARY */
export async function getDashboardSummary(
  temporadaId: number,
  filters?: Partial<TableroFiltersDTO>
): Promise<DashboardSummaryResponse> {
  const params = toQueryParams(temporadaId, filters);
  const resp = await apiClient.get("/bodega/tablero/summary/", { params });
  return ensureSuccess<DashboardSummaryResponse>(resp.data);
}

/** QUEUES */
export async function getDashboardQueues(
  temporadaId: number,
  type: QueueType,
  filters?: Partial<TableroFiltersDTO>
): Promise<DashboardQueueResponse> {
  const params = { ...toQueryParams(temporadaId, filters), type };
  const resp = await apiClient.get("/bodega/tablero/queues/", { params });
  return ensureSuccess<DashboardQueueResponse>(resp.data);
}

/** ALERTS */
export async function getDashboardAlerts(
  temporadaId: number
): Promise<DashboardAlertResponse> {
  const params = toQueryParams(temporadaId);
  const resp = await apiClient.get("/bodega/tablero/alerts/", { params });
  return ensureSuccess<DashboardAlertResponse>(resp.data);
}
