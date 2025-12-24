// src/modules/gestion_huerta/services/ventaService.ts
import apiClient from '../../../global/api/apiClient';
import {
  VentaHuerta,
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../types/ventaTypes';
import { ApiEnvelope, ListEnvelope } from '../types/shared';

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

export const ventaService = {
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

    const { data } = await apiClient.get<ListEnvelope<VentaHuerta>>('/huerta/ventas/', {
      params,
      signal: config.signal,
    });
    return data;
  },

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

    const { data } = await apiClient.post<ApiEnvelope<{ venta: VentaHuerta }>>('/huerta/ventas/', body);
    return data;
  },

  async update(id: number, payload: VentaHuertaUpdateData) {
    const body: any = { ...payload };
    const { data } = await apiClient.patch<ApiEnvelope<{ venta: VentaHuerta }>>(
      `/huerta/ventas/${id}/`,
      body
    );
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ venta: VentaHuerta }>>(
      `/huerta/ventas/${id}/archivar/`
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ venta: VentaHuerta }>>(
      `/huerta/ventas/${id}/restaurar/`
    );
    return data;
  },

  async remove(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/ventas/${id}/`);
    return data;
  },
};
