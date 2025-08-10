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
  // LIST (con fallback a DRF nativo, igual que temporadas/cosechas)
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

    // Intento 1: DRF nativo (count/results)
    const probe = await apiClient.get<any>('/huerta/inversiones/', { params, signal: config.signal });
    if (probe?.data && typeof probe.data.count === 'number' && Array.isArray(probe.data.results)) {
      return {
        success: true,
        notification: { key: 'no_notification', message: '', type: 'info' as const },
        data: {
          inversiones: probe.data.results as InversionHuerta[],
          meta: { count: probe.data.count, next: probe.data.next, previous: probe.data.previous } as PaginationMeta,
        },
      };
    }

    // Intento 2: envelope del backend
    const { data } = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { inversiones: InversionHuerta[]; meta: PaginationMeta };
    }>('/huerta/inversiones/', { params, signal: config.signal });

    return data;
  },

  // CREATE (envuelve como temporadas/cosechas: retorna envelope completo)
  async create(ctx: Ctx, payload: InversionHuertaCreateData) {
    const body: Record<string, any> = {
      fecha: payload.fecha,
      descripcion: payload.descripcion,
      gastos_insumos: payload.gastos_insumos,
      gastos_mano_obra: payload.gastos_mano_obra,
      categoria_id: payload.categoria,   // ← mapping requerido por backend
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

  // UPDATE (PATCH parcial; mapeo de categoria -> categoria_id si viene)
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
