// src/modules/gestion_bodega/services/bodegaService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import type {
  Bodega,
  BodegaCreateData,
  BodegaUpdateData,
  BodegaFilters,
  EstadoBodega,
  PaginationMeta,
  NotificationPayload,
} from '../types/bodegaTypes';

/**
 * Endpoints (según router y views):
 *  - GET    /bodega/bodegas/?page=&estado=&search=&nombre=&ubicacion=
 *  - POST   /bodega/bodegas/
 *  - GET    /bodega/bodegas/:id/
 *  - PATCH  /bodega/bodegas/:id/
 *  - DELETE /bodega/bodegas/:id/
 *  - POST   /bodega/bodegas/:id/archivar/
 *  - POST   /bodega/bodegas/:id/restaurar/
 *
 * El backend responde con envelope { success, notification, data: {...} } en create/update/delete/acciones.
 * En list() usamos el contrato canónico:
 *   - Envelope → data: { results, meta }
 *   - DRF paginado → { count,next,previous,results }
 */

const BASE_URL = '/bodega/bodegas/';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de normalización (DRF <-> Envelope con meta uniforme)
// ──────────────────────────────────────────────────────────────────────────────

/** Unifica el meta aunque venga de DRF o de nuestro envelope. */
function toMeta(r: any, pageFallback = 1): PaginationMeta {
  // Envelope con meta (nuestro backend)
  if (r?.meta) {
    const m = r.meta;
    const page = Number(m?.page ?? pageFallback ?? 1);
    const page_size = Number(m?.page_size ?? 10);
    const count = Number(m?.count ?? 0);
    const total_pages = Number(m?.total_pages ?? Math.max(1, Math.ceil(count / Math.max(1, page_size))));
    return {
      count,
      next: m?.next ?? null,
      previous: m?.previous ?? null,
      page,
      page_size,
      total_pages,
    };
  }

  // DRF paginado plano (count/next/previous/results) — inferimos page/page_size
  const count = Number(r?.count ?? 0);
  const page_size = Array.isArray(r?.results) ? (r.page_size ?? 10) : Number(r?.page_size ?? 10);
  const page = Number(r?.page ?? pageFallback ?? 1);
  const total_pages = Number(r?.total_pages ?? Math.max(1, Math.ceil(count / Math.max(1, page_size))));
  return {
    count,
    next: r?.next ?? null,
    previous: r?.previous ?? null,
    page,
    page_size,
    total_pages,
  };
}

function pickListPayload(data: any): { bodegas: Bodega[]; meta: PaginationMeta } {
  // Envelope canónico: { success, notification, data: { results, meta } }
  if (Array.isArray(data?.data?.results)) {
    return {
      bodegas: data.data.results as Bodega[],
      meta: toMeta(data.data, data?.data?.meta?.page ?? 1),
    };
  }

  // DRF puro (results + count/next/previous)
  if (Array.isArray(data?.results)) {
    return {
      bodegas: data.results as Bodega[],
      meta: toMeta(data, 1),
    };
  }

  // Fallback defensivo (lista vacía con meta seguro)
  return {
    bodegas: [],
    meta: toMeta(data, 1),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────
export const bodegaService = {
  /**
   * Lista de bodegas con filtros y estado (activos|archivados|todos).
   * Devuelve payload unificado: { bodegas, meta }.
   */
  async list(
    page: number = 1,
    estado: EstadoBodega = 'activos',
    filters: BodegaFilters = {},
    opts?: { signal?: AbortSignal; pageSize?: number }
  ): Promise<{ bodegas: Bodega[]; meta: PaginationMeta }> {
    const params: Record<string, any> = {
      page,
      estado,
      page_size: opts?.pageSize ?? 10,
      search: filters.search || undefined,
      nombre: filters.nombre || undefined,
      ubicacion: filters.ubicacion || undefined,
    };

    const { data } = await apiClient.get(BASE_URL, {
      params,
      signal: opts?.signal,
    });

    return pickListPayload(data);
  },

  /** Crea una bodega. */
  async create(payload: BodegaCreateData): Promise<{
    success: boolean;
    notification: NotificationPayload;
    data: { bodega: Bodega };
  }> {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: NotificationPayload;
      data: { bodega: Bodega };
    }>(BASE_URL, payload);
    return data;
  },

  /** Actualiza parcialmente una bodega. */
  async update(id: number, payload: BodegaUpdateData): Promise<{
    success: boolean;
    notification: NotificationPayload;
    data: { bodega: Bodega };
  }> {
    const { data } = await apiClient.patch<{
      success: boolean;
      notification: NotificationPayload;
      data: { bodega: Bodega };
    }>(`${BASE_URL}${id}/`, payload);
    return data;
  },

  /** Elimina (hard delete de fila en vista). */
  async delete(id: number): Promise<{
    success: boolean;
    notification: NotificationPayload;
    data: { deleted_id: number };
  }> {
    const { data } = await apiClient.delete<{
      success: boolean;
      notification: NotificationPayload;
      data: { deleted_id: number };
    }>(`${BASE_URL}${id}/`);
    return data;
  },

  /** Archiva (soft-delete). */
  async archivar(id: number): Promise<{
    success: boolean;
    notification: NotificationPayload;
    data: { bodega_id: number; affected?: Record<string, number> };
  }> {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: NotificationPayload;
      data: { bodega_id: number; affected?: Record<string, number> };
    }>(`${BASE_URL}${id}/archivar/`);
    return data;
  },

  /** Restaura. */
  async restaurar(id: number): Promise<{
    success: boolean;
    notification: NotificationPayload;
    data: { bodega_id: number; affected?: Record<string, number> };
  }> {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: NotificationPayload;
      data: { bodega_id: number; affected?: Record<string, number> };
    }>(`${BASE_URL}${id}/restaurar/`);
    return data;
  },

  /** Obtiene una bodega por ID (serializer plano). */
  async getById(id: number): Promise<Bodega> {
    const { data } = await apiClient.get<Bodega>(`${BASE_URL}${id}/`);
    return data;
  },
};
