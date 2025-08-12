import apiClient from '../../../global/api/apiClient';
import {
  VentaHuerta,
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../types/ventaTypes';

export interface VentaFilters {
  fechaDesde?: string;  // YYYY-MM-DD
  fechaHasta?: string;  // YYYY-MM-DD
  estado?: 'activas' | 'archivadas' | 'todas';
}

type Ctx = {
  huertaId?: number;
  huertaRentadaId?: number;
  temporadaId: number;
  cosechaId: number;
};

type PaginationMeta = { count: number; next: string | null; previous: string | null };

export const ventaService = {
  // LIST (con fallback a DRF nativo, igual que inversiones)
  async list(
    ctx: Ctx,
    page = 1,
    pageSize = 10,
    filters: VentaFilters = {},
    config: { signal?: AbortSignal } = {}
  ) {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
      temporada: ctx.temporadaId,
      cosecha: ctx.cosechaId,
    };
    if (ctx.huertaId)        params['huerta'] = ctx.huertaId;
    if (ctx.huertaRentadaId) params['huerta_rentada'] = ctx.huertaRentadaId;
    if (filters.fechaDesde)  params['fecha_desde'] = filters.fechaDesde;
    if (filters.fechaHasta)  params['fecha_hasta'] = filters.fechaHasta;
    if (filters.estado)      params['estado'] = filters.estado;

    // Intento 1: DRF nativo (count/results)
    const probe = await apiClient.get<any>('/huerta/ventas/', { params, signal: config.signal });
    if (probe?.data && typeof probe.data.count === 'number' && Array.isArray(probe.data.results)) {
      return {
        success: true,
        notification: { key: 'no_notification', message: '', type: 'info' as const },
        data: {
          ventas: probe.data.results as VentaHuerta[],
          meta: { count: probe.data.count, next: probe.data.next, previous: probe.data.previous } as PaginationMeta,
        },
      };
    }

    // Intento 2: envelope del backend
    const { data } = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { ventas: VentaHuerta[]; meta: PaginationMeta };
    }>('/huerta/ventas/', { params, signal: config.signal });

    return data;
  },

  // CREATE
  async create(ctx: Ctx, payload: VentaHuertaCreateData) {
    const body: Record<string, any> = {
      fecha_venta: payload.fecha_venta,
      tipo_mango: payload.tipo_mango,
      num_cajas: payload.num_cajas,
      precio_por_caja: payload.precio_por_caja,
      gasto: payload.gasto,
      descripcion: payload.descripcion,
      cosecha_id: ctx.cosechaId,
      temporada_id: ctx.temporadaId,
    };
    if (ctx.huertaId)        body['huerta_id'] = ctx.huertaId;
    if (ctx.huertaRentadaId) body['huerta_rentada_id'] = ctx.huertaRentadaId;

    const { data } = await apiClient.post('/huerta/ventas/', body);
    return data;
  },

  // UPDATE (PATCH parcial)
  async update(id: number, payload: VentaHuertaUpdateData) {
    const body: any = { ...payload };
    const { data } = await apiClient.patch<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { venta: VentaHuerta };
    }>(`/huerta/ventas/${id}/`, body);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { venta: VentaHuerta };
    }>(`/huerta/ventas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { venta: VentaHuerta };
    }>(`/huerta/ventas/${id}/restaurar/`);
    return data;
  },

  async remove(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { info: string };
    }>(`/huerta/ventas/${id}/`);
    return data;
  },
};
