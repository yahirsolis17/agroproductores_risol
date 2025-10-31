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
  const { success, data, notification } = resp || {};
  if (!success) {
    const message = notification?.message || "Operación no exitosa";
    const error = new Error(message);
    (error as any).message_key = notification?.key;
    (error as any).payload = resp;
    throw error;
  }
  return data as T;
}

/** DTO de navegación de semanas (propuesto por backend) */
export type WeeksNavResponse = {
  /** Semana ISO actual (YYYY-Www) */
  actual: string;
  /** Total de semanas abiertas/definidas en la temporada */
  total: number;
  /** Flags navegación */
  has_prev: boolean;
  has_next: boolean;
  /** Claves ISO adyacentes (si aplican) */
  prev?: string;
  next?: string;
  /** Índice opcional de la semana (1-based o 0-based según backend) */
  indice?: number;
  /** Rango de fechas opcional (yyyy-mm-dd) */
  inicio?: string;
  fin?: string;
};

/**
 * Mapea filtros de UI a DTO de querystring (cliente → API).
 * Acepta también isoSemana (FE) y la envía como iso_semana (API).
 */
function toQueryParams(temporadaId: number, filters?: Partial<TableroFiltersDTO> & { isoSemana?: string | null }) {
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

  const isoSemana = (filters as any).isoSemana as string | null | undefined;

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

  // Soporte opcional de iso_semana en API (no rompe si el backend lo ignora)
  if (isoSemana) params.iso_semana = isoSemana;

  return params;
}

/** SUMMARY */
export async function getDashboardSummary(
  temporadaId: number,
  filters?: Partial<TableroFiltersDTO> & { isoSemana?: string | null }
): Promise<DashboardSummaryResponse> {
  const params = toQueryParams(temporadaId, filters);
  const resp = await apiClient.get("/bodega/tablero/summary/", { params });
  return ensureSuccess<DashboardSummaryResponse>(resp.data);
}

/** QUEUES */
export async function getDashboardQueues(
  temporadaId: number,
  type: QueueType,
  filters?: Partial<TableroFiltersDTO> & { isoSemana?: string | null }
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

/** WEEKS NAV (barra sticky de semanas: prev/next/total/actual) */
export async function getWeeksNav(
  temporadaId: number,
  opts?: { isoSemana?: string | null }
): Promise<WeeksNavResponse> {
  const params = toQueryParams(temporadaId, { isoSemana: opts?.isoSemana ?? null });
  const resp = await apiClient.get("/bodega/tablero/semanas/", { params });
  return ensureSuccess<WeeksNavResponse>(resp.data);
}
