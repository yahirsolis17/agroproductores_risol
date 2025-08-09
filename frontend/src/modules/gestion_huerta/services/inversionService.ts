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

export const inversionService = {
  async list(
    ctx: Ctx,
    page = 1,
    pageSize = 10,
    filters: InversionFilters = {},
    config: { signal?: AbortSignal } = {}
  ): Promise<ListEnvelope['data']> {
    const params: Record<string, any> = {
      temporada: ctx.temporadaId,
      cosecha: ctx.cosechaId,
      page,
      page_size: pageSize,
    };
    // solo uno de estos, según origen
    if (ctx.huertaId) params.huerta = ctx.huertaId;
    if (ctx.huertaRentadaId) params.huerta_rentada = ctx.huertaRentadaId;

    if (filters.categoria)  params.categoria    = filters.categoria;
    if (filters.fechaDesde) params.fecha_desde  = filters.fechaDesde;
    if (filters.fechaHasta) params.fecha_hasta  = filters.fechaHasta;
    if (filters.estado)     params.estado       = filters.estado;

    const { data } = await apiClient.get<ListEnvelope>('/huerta/inversiones/', {
      params, signal: config.signal
    });
    return data.data;
  },

  async create(
    ctx: Ctx,
    payload: InversionHuertaCreateData
  ): Promise<InversionHuerta> {
    const body: any = {
      // mapear correctamente al backend
      fecha: payload.fecha,
      descripcion: payload.descripcion,
      gastos_insumos: payload.gastos_insumos,
      gastos_mano_obra: payload.gastos_mano_obra,
      categoria_id: payload.categoria, // ← IMPORTANTE
      cosecha_id: ctx.cosechaId,
      temporada_id: ctx.temporadaId,
    };
    if (ctx.huertaId)        body.huerta_id = ctx.huertaId;
    if (ctx.huertaRentadaId) body.huerta_rentada_id = ctx.huertaRentadaId;

    const { data } = await apiClient.post<ItemEnvelope>('/huerta/inversiones/', body);
    return data.data.inversion;
  },

  async update(id: number, payload: InversionHuertaUpdateData): Promise<InversionHuerta> {
    const body: any = { ...payload };
    // si el caller manda categoria, mapear a categoria_id
    if (typeof payload.categoria === 'number') {
      body.categoria_id = payload.categoria;
      delete body.categoria;
    }
    const { data } = await apiClient.patch<ItemEnvelope>(`/huerta/inversiones/${id}/`, body);
    return data.data.inversion;
  },

  async archive(id: number): Promise<InversionHuerta> {
    // backend usa POST /archivar/
    const { data } = await apiClient.post<ItemEnvelope>(`/huerta/inversiones/${id}/archivar/`);
    return data.data.inversion;
  },

  async restore(id: number): Promise<InversionHuerta> {
    const { data } = await apiClient.post<ItemEnvelope>(`/huerta/inversiones/${id}/restaurar/`);
    return data.data.inversion;
  },

  async remove(id: number): Promise<string> {
    const { data } = await apiClient.delete<InfoEnvelope>(`/huerta/inversiones/${id}/`);
    return data.data.info;
  },
};
