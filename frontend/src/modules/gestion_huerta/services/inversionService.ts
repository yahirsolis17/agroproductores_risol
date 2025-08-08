// src/modules/gestion_huerta/services/inversionService.ts

import apiClient from '../../../global/api/apiClient';
import {
  InversionHuerta,
  InversionHuertaCreateData,
  InversionHuertaUpdateData,
} from '../types/inversionTypes';

/** Filtros posibles para inversiones */
export interface InversionFilters {
  categoria?: number;
  fechaDesde?: string;  // 'YYYY-MM-DD'
  fechaHasta?: string;  // 'YYYY-MM-DD'
}

interface ListEnvelope {
  success: boolean;
  message_key: string;
  data: {
    inversiones: InversionHuerta[];
    meta: { count: number; next: string | null; previous: string | null };
  };
}
interface ItemEnvelope {
  success: boolean;
  message_key: string;
  data: { inversion: InversionHuerta };
}
interface InfoEnvelope {
  success: boolean;
  message_key: string;
  data: { info: string };
}

/** CRUD + archive/restore para InversionesHuerta */
export const inversionService = {
  async list(
    huertaId: number,
    temporadaId: number,
    cosechaId: number,
    page = 1,
    pageSize = 10,
    filters: InversionFilters = {},
    config: { signal?: AbortSignal } = {}
  ): Promise<ListEnvelope['data']> {
    const params: Record<string, any> = {
      huerta: huertaId,
      temporada: temporadaId,
      cosecha: cosechaId,
      page,
      page_size: pageSize,
    };
    if (filters.categoria) params.categoria = filters.categoria;
    if (filters.fechaDesde) params.fecha_desde = filters.fechaDesde;
    if (filters.fechaHasta) params.fecha_hasta = filters.fechaHasta;

    const { data } = await apiClient.get<ListEnvelope>(
      '/huerta/inversiones/',
      { params, signal: config.signal }
    );
    return data.data;
  },

  async create(
    huertaId: number,
    temporadaId: number,
    cosechaId: number,
    payload: InversionHuertaCreateData
  ): Promise<InversionHuerta> {
    const body = {
      ...payload,
      huerta_id: huertaId,
      temporada_id: temporadaId,
      cosecha_id: cosechaId,
    };
    const { data } = await apiClient.post<ItemEnvelope>(
      '/huerta/inversiones/',
      body
    );
    return data.data.inversion;
  },

  async update(
    id: number,
    payload: InversionHuertaUpdateData
  ): Promise<InversionHuerta> {
    const { data } = await apiClient.patch<ItemEnvelope>(
      `/huerta/inversiones/${id}/`,
      payload
    );
    return data.data.inversion;
  },

  async archive(id: number): Promise<InversionHuerta> {
    const { data } = await apiClient.patch<ItemEnvelope>(
      `/huerta/inversiones/${id}/archivar/`
    );
    return data.data.inversion;
  },

  async restore(id: number): Promise<InversionHuerta> {
    const { data } = await apiClient.patch<ItemEnvelope>(
      `/huerta/inversiones/${id}/restaurar/`
    );
    return data.data.inversion;
  },

  async remove(id: number): Promise<string> {
    const { data } = await apiClient.delete<InfoEnvelope>(
      `/huerta/inversiones/${id}/`
    );
    return data.data.info;
  },
};
