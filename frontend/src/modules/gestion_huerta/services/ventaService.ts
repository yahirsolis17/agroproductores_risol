// src/modules/gestion_huerta/services/ventaService.ts

import apiClient from '../../../global/api/apiClient';
import {
  VentaHuerta,
  VentaHuertaCreateData,
  VentaHuertaUpdateData,
} from '../types/ventaTypes';

/** Filtros posibles para ventas */
export interface VentaFilters {
  tipoMango?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

interface ListEnvelope {
  success: boolean;
  message_key: string;
  data: {
    ventas: VentaHuerta[];
    meta: { count: number; next: string | null; previous: string | null };
  };
}
interface ItemEnvelope {
  success: boolean;
  message_key: string;
  data: { venta: VentaHuerta };
}
interface InfoEnvelope {
  success: boolean;
  message_key: string;
  data: { info: string };
}

/** CRUD + archive/restore para Ventas */
export const ventaService = {
  async list(
    huertaId: number,
    temporadaId: number,
    cosechaId: number,
    page = 1,
    pageSize = 10,
    filters: VentaFilters = {},
    config: { signal?: AbortSignal } = {}
  ): Promise<ListEnvelope['data']> {
    const params: Record<string, any> = {
      huerta: huertaId,
      temporada: temporadaId,
      cosecha: cosechaId,
      page,
      page_size: pageSize,
    };
    if (filters.tipoMango) params.tipo_mango = filters.tipoMango;
    if (filters.fechaDesde) params.fecha_desde = filters.fechaDesde;
    if (filters.fechaHasta) params.fecha_hasta = filters.fechaHasta;

    const { data } = await apiClient.get<ListEnvelope>(
      '/gestion_huerta/ventas/',
      { params, signal: config.signal }
    );
    return data.data;
  },

  async create(
    huertaId: number,
    temporadaId: number,
    cosechaId: number,
    payload: VentaHuertaCreateData
  ): Promise<VentaHuerta> {
    const body = {
      ...payload,
      huerta_id: huertaId,
      temporada_id: temporadaId,
      cosecha_id: cosechaId,
    };
    const { data } = await apiClient.post<ItemEnvelope>(
      '/huerta/ventas/',
      body
    );
    return data.data.venta;
  },

  async update(
    id: number,
    payload: VentaHuertaUpdateData
  ): Promise<VentaHuerta> {
    const { data } = await apiClient.patch<ItemEnvelope>(
      `/huerta/ventas/${id}/`,
      payload
    );
    return data.data.venta;
  },

  async archive(id: number): Promise<VentaHuerta> {
    const { data } = await apiClient.patch<ItemEnvelope>(
      `/huerta/ventas/${id}/archivar/`
    );
    return data.data.venta;
  },

  async restore(id: number): Promise<VentaHuerta> {
    const { data } = await apiClient.patch<ItemEnvelope>(
      `/huerta/ventas/${id}/restaurar/`
    );
    return data.data.venta;
  },

  async remove(id: number): Promise<string> {
    const { data } = await apiClient.delete<InfoEnvelope>(
      `/huerta/ventas/${id}/`
    );
    return data.data.info;
  },
};
