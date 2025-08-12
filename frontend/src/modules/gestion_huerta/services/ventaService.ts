// src/modules/gestion_huerta/services/ventaService.ts (actualizado)

import apiClient from '../../../global/api/apiClient';
import {
  VentaHuerta,
  VentaCreateData,
  VentaUpdateData,
  VentaFilters,
} from '../types/ventaTypes';

// Context interface for listing and creating ventas.  A venta pertenece
// a una temporada y una cosecha, y opcionalmente a una huerta propia o una
// huerta rentada.  Solo uno de huertaId o huertaRentadaId debe estar
// definido; el otro debe ser undefined.
export interface VentaContext {
  huertaId?: number;
  huertaRentadaId?: number;
  temporadaId: number;
  cosechaId: number;
}

// `VentaFilters` se importa desde los types.  El filtro `estado` se maneja de forma
// independiente en el slice y el hook; aquí solo se incluyen tipoMango y fechas.

interface ListEnvelope {
  success: boolean;
  message_key: string;
  data: {
    ventas: VentaHuerta[];
    meta: { count: number; next: string | null; previous: string | null };
  };
}


/**
 * CRUD + archive/restore para Ventas.
 * Ahora incluye el parámetro `estado` en `list` para filtrar entre activas, archivadas o todas.
 */
export const ventaService = {
  /**
   * Obtiene una lista paginada de ventas.  La lista se filtra por contexto
   * (huerta propia o rentada, temporada y cosecha), por estado (activas,
   * archivadas o todas) y por filtros opcionales (tipo de mango y rangos de
   * fechas).  Devuelve el envelope completo, que incluye notificación y
   * metadatos, para que el slice pueda despachar notificaciones si
   * corresponde.
   */
  async list(
    ctx: VentaContext,
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
    // Contexto: usar huerta o huerta_rentada según esté definido
    if (ctx.huertaId) params.huerta = ctx.huertaId;
    if (ctx.huertaRentadaId) params.huerta_rentada = ctx.huertaRentadaId;
    // Estado: si se especifica, se envía; de lo contrario el backend asume 'activas'
    if (filters.estado) params.estado = filters.estado;
    // Filtros opcionales: tipo de mango y rango de fechas
    if (filters.tipoMango) params.tipo_mango = filters.tipoMango;
    if (filters.fechaDesde) params.fecha_desde = filters.fechaDesde;
    if (filters.fechaHasta) params.fecha_hasta = filters.fechaHasta;

    // El backend retorna un envelope con keys: success, notification y data
    const { data } = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: ListEnvelope['data'];
    }>('/huerta/ventas/', { params, signal: config.signal });
    return data;
  },

  /**
   * Crea una nueva venta.  El contexto determina si se asocia a una
   * huerta propia (huerta_id) o rentada (huerta_rentada_id).  La cosecha y
   * temporada se infieren del contexto.  Devuelve el envelope completo.
   */
  async create(
    ctx: VentaContext,
    payload: VentaCreateData
  ) {
    const body: Record<string, any> = {
      ...payload,
      cosecha_id: ctx.cosechaId,
      temporada_id: ctx.temporadaId,
    };
    if (ctx.huertaId) body.huerta_id = ctx.huertaId;
    if (ctx.huertaRentadaId) body.huerta_rentada_id = ctx.huertaRentadaId;
    const { data } = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { venta: VentaHuerta };
    }>('/huerta/ventas/', body);
    return data;
  },

  /**
   * Actualiza parcialmente una venta.  Devuelve el envelope con la venta
   * actualizada.
   */
  async update(
    id: number,
    payload: VentaUpdateData
  ) {
    const { data } = await apiClient.patch<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { venta: VentaHuerta };
    }>(`/huerta/ventas/${id}/`, payload);
    return data;
  },

  async archive(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { venta: VentaHuerta };
    }>(`/huerta/ventas/${id}/archivar/`);
    return data;
  },

  async restore(id: number) {
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