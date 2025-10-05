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
} from '../types/bodegaTypes';

/**
 * Endpoints (según router y views que ya montamos):
 *  - GET    /bodega/bodegas/?page=&estado=&search=&nombre=&ubicacion=
 *  - POST   /bodega/bodegas/
 *  - GET    /bodega/bodegas/:id/
 *  - PATCH  /bodega/bodegas/:id/
 *  - DELETE /bodega/bodegas/:id/
 *  - POST   /bodega/bodegas/:id/archivar/
 *  - POST   /bodega/bodegas/:id/restaurar/
 *
 * El backend responde con envelope { success, notification, data: {...} } en create/update/delete/acciones.
 * En list() damos soporte doble:
 *   - Envelope de nuestra notificación → data: { bodegas, meta }
 *   - DRF paginado nativo → { count,next,previous,results }
 */

const BASE_URL = '/bodega/bodegas/';

type Notif = { key: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info' };

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
  const page_size = Array.isArray(r?.results) ? r.results.length : Number(r?.page_size ?? 10);
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
  // Envelope propio: { success, notification, data: { bodegas, meta } }
  if (data?.data?.bodegas) {
    return {
      bodegas: data.data.bodegas as Bodega[],
      meta: toMeta(data.data, data?.data?.meta?.page ?? 1),
    };
  }

  // Envelope flexible (algunos list devuelven { bodegas, meta } en raíz)
  if (data?.bodegas && data?.meta) {
    return { bodegas: data.bodegas as Bodega[], meta: toMeta(data, data?.meta?.page ?? 1) };
  }

  // DRF puro (results + count/next/previous)
  if (Array.isArray(data?.results)) {
    return {
      bodegas: data.results as Bodega[],
      meta: toMeta(data, 1),
    };
  }

  // Fallback defensivo
  return {
    bodegas: (data?.bodegas as Bodega[]) ?? [],
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
      // filtros homogéneos con huerta:
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

  /**
   * Crea una bodega.
   * Respuesta esperada: { success, notification, data: { bodega } }
   */
  async create(payload: BodegaCreateData): Promise<{
    success: boolean;
    notification: Notif;
    data: { bodega: Bodega };
  }> {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { bodega: Bodega };
    }>(BASE_URL, payload);
    return data;
  },

  /**
   * Actualiza parcialmente una bodega.
   * Respuesta: { success, notification, data: { bodega } }
   */
  async update(id: number, payload: BodegaUpdateData): Promise<{
    success: boolean;
    notification: Notif;
    data: { bodega: Bodega };
  }> {
    const { data } = await apiClient.patch<{
      success: boolean;
      notification: Notif;
      data: { bodega: Bodega };
    }>(`${BASE_URL}${id}/`, payload);
    return data;
  },

  /**
   * Elimina (hard delete de fila en vista; el modelo soporta soft-delete a nivel de dominio).
   * Respuesta: { success, notification, data: { deleted_id } }
   */
  async delete(id: number): Promise<{
    success: boolean;
    notification: Notif;
    data: { deleted_id: number };
  }> {
    const { data } = await apiClient.delete<{
      success: boolean;
      notification: Notif;
      data: { deleted_id: number };
    }>(`${BASE_URL}${id}/`);
    return data;
  },

  /**
   * Archiva (soft-delete con cascada controlada por dominio).
   * Respuesta: { success, notification, data: { bodega_id, affected } }
   */
  async archivar(id: number): Promise<{
    success: boolean;
    notification: Notif;
    data: { bodega_id: number; affected?: Record<string, number> };
  }> {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { bodega_id: number; affected?: Record<string, number> };
    }>(`${BASE_URL}${id}/archivar/`);
    return data;
  },

  /**
   * Restaura (undo del archivado).
   * Respuesta: { success, notification, data: { bodega_id, affected } }
   */
  async restaurar(id: number): Promise<{
    success: boolean;
    notification: Notif;
    data: { bodega_id: number; affected?: Record<string, number> };
  }> {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { bodega_id: number; affected?: Record<string, number> };
    }>(`${BASE_URL}${id}/restaurar/`);
    return data;
  },

  /**
   * Obtiene una bodega por ID.
   * En retrieve del ViewSet usualmente responde el serializer plano (sin envelope),
   * y está OK: devolvemos el objeto `Bodega` directamente.
   */
  async getById(id: number): Promise<Bodega> {
    const { data } = await apiClient.get<Bodega>(`${BASE_URL}${id}/`);
    return data;
  },
};
