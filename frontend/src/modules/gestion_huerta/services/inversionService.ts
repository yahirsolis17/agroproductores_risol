// src/modules/gestion_huerta/services/inversionService.ts
import apiClient from '../../../global/api/apiClient';
import {
  InversionHuerta,
  InversionHuertaCreateData,
  InversionHuertaUpdateData,
} from '../types/inversionTypes';

export interface InversionFilters {
  categoria?: number;
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

export const inversionService = {
  async list(
    ctx: Ctx,
    page = 1,
    pageSize = 10,
    filters: InversionFilters = {},
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
    if (filters.categoria)   params['categoria'] = filters.categoria;
    if (filters.fechaDesde)  params['fecha_desde'] = filters.fechaDesde;
    if (filters.fechaHasta)  params['fecha_hasta'] = filters.fechaHasta;
    if (filters.estado)      params['estado'] = filters.estado;

    // Un solo GET (envelope del backend)
    const { data } = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { inversiones: InversionHuerta[]; meta: PaginationMeta };
    }>('/huerta/inversiones/', { params, signal: config.signal });

    return data;
  },

  async create(ctx: Ctx, payload: InversionHuertaCreateData) {
    const body: Record<string, any> = {
      fecha: payload.fecha,
      descripcion: payload.descripcion,
      gastos_insumos: payload.gastos_insumos,
      gastos_mano_obra: payload.gastos_mano_obra,
      categoria_id: payload.categoria,
      cosecha_id: ctx.cosechaId,
      temporada_id: ctx.temporadaId,
    };
    if (ctx.huertaId)        body['huerta_id'] = ctx.huertaId;
    if (ctx.huertaRentadaId) body['huerta_rentada_id'] = ctx.huertaRentadaId;

    const { data } = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { inversion: InversionHuerta };
    }>('/huerta/inversiones/', body);
    return data;
  },

  async update(id: number, payload: InversionHuertaUpdateData) {
    const body: any = { ...payload };
    if (typeof payload.categoria === 'number') {
      body.categoria = undefined;
      body.categoria_id = payload.categoria;
    }
    const { data } = await apiClient.patch<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { inversion: InversionHuerta };
    }>(`/huerta/inversiones/${id}/`, body);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { inversion: InversionHuerta };
    }>(`/huerta/inversiones/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { inversion: InversionHuerta };
    }>(`/huerta/inversiones/${id}/restaurar/`);
    return data;
  },

  async remove(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { info: string };
    }>(`/huerta/inversiones/${id}/`);
    return data;
  },
};
