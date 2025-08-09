// ============================================================================
// src/modules/gestion_huerta/services/inversionService.ts
// ============================================================================
import apiClient from "../../../global/api/apiClient";
import { InversionHuerta, InversionHuertaCreateData, InversionHuertaUpdateData } from "../types/inversionTypes";

export interface InversionFilters {
  categoria?: number;
  fechaDesde?: string;  // 'YYYY-MM-DD'
  fechaHasta?: string;  // 'YYYY-MM-DD'
  estado?: 'activas' | 'archivadas' | 'todas';
}

interface ListEnvelope {
  success: boolean;
  notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
  data: {
    inversiones: InversionHuerta[];
    meta: { count: number; next: string | null; previous: string | null };
  };
}
interface ItemEnvelope {
  success: boolean;
  notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
  data: { inversion: InversionHuerta };
}
interface InfoEnvelope {
  success: boolean;
  notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
  data: { info: string };
}

export const inversionService = {
  async list(
    args: {
      huertaId?: number | null;
      huertaRentadaId?: number | null;
      temporadaId: number;
      cosechaId: number;
      page?: number;
      pageSize?: number;
      filters?: InversionFilters;
      signal?: AbortSignal;
    }
  ): Promise<ListEnvelope> {
    const { huertaId, huertaRentadaId, temporadaId, cosechaId, page = 1, pageSize = 10, filters = {}, signal } = args;

    const params: Record<string, any> = {
      temporada: temporadaId,
      cosecha: cosechaId,
      page,
      page_size: pageSize,
    };
    if (huertaId) params.huerta = huertaId;
    if (huertaRentadaId) params.huerta_rentada = huertaRentadaId;
    if (filters.categoria)  params.categoria   = filters.categoria;
    if (filters.fechaDesde) params.fecha_desde = filters.fechaDesde;
    if (filters.fechaHasta) params.fecha_hasta = filters.fechaHasta;
    if (filters.estado)     params.estado      = filters.estado;

    const { data } = await apiClient.get<ListEnvelope>("/huerta/inversiones/", { params, signal });
    return data;
  },

  async create(
    args: {
      huertaId?: number | null;
      huertaRentadaId?: number | null;
      temporadaId: number;
      cosechaId: number;
      payload: InversionHuertaCreateData;
    }
  ): Promise<ItemEnvelope> {
    const { huertaId, huertaRentadaId, temporadaId, cosechaId, payload } = args;
    const body: Record<string, any> = {
      fecha: payload.fecha,
      descripcion: payload.descripcion,
      gastos_insumos: payload.gastos_insumos,
      gastos_mano_obra: payload.gastos_mano_obra,
      categoria_id: payload.categoria,
      temporada_id: temporadaId,
      cosecha_id: cosechaId,
    };
    if (huertaId) body.huerta_id = huertaId;
    if (huertaRentadaId) body.huerta_rentada_id = huertaRentadaId;

    const { data } = await apiClient.post<ItemEnvelope>("/huerta/inversiones/", body);
    return data;
  },

  async update(id: number, payload: InversionHuertaUpdateData): Promise<ItemEnvelope> {
    const { data } = await apiClient.patch<ItemEnvelope>(`/huerta/inversiones/${id}/`, payload);
    return data;
  },

  async archive(id: number): Promise<ItemEnvelope> {
    const { data } = await apiClient.post<ItemEnvelope>(`/huerta/inversiones/${id}/archivar/`);
    return data;
  },

  async restore(id: number): Promise<ItemEnvelope> {
    const { data } = await apiClient.post<ItemEnvelope>(`/huerta/inversiones/${id}/restaurar/`);
    return data;
  },

  async remove(id: number): Promise<InfoEnvelope> {
    const { data } = await apiClient.delete<InfoEnvelope>(`/huerta/inversiones/${id}/`);
    return data;
  },
};