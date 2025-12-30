// src/modules/gestion_huerta/services/temporadaService.ts
import apiClient from '../../../global/api/apiClient';
import { Temporada, TemporadaCreateData, EstadoTemporada } from '../types/temporadaTypes';
import { ApiEnvelope, ListEnvelope } from '../types/shared';

type RawTemporada = Record<string, unknown>;

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const asStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return String(value);
};

const mapTemporadaFromApi = (raw: RawTemporada): Temporada => {
  const rawYear = raw['año'] ?? raw['anio'];
  return {
    id: asNumber(raw.id),
    año: asNumber(rawYear),
    fecha_inicio: asStringOrNull(raw.fecha_inicio) ?? '',
    fecha_fin: asStringOrNull(raw.fecha_fin),
    finalizada: Boolean(raw.finalizada),
    is_active: Boolean(raw.is_active),
    archivado_en: asStringOrNull(raw.archivado_en),
    huerta: raw.huerta === null || raw.huerta === undefined ? null : asNumber(raw.huerta),
    huerta_rentada:
      raw.huerta_rentada === null || raw.huerta_rentada === undefined
        ? null
        : asNumber(raw.huerta_rentada),
    is_rentada: Boolean(raw.is_rentada),
    huerta_nombre: asStringOrNull(raw.huerta_nombre),
    huerta_id: raw.huerta_id === null || raw.huerta_id === undefined ? null : asNumber(raw.huerta_id),
  };
};

const extractTemporadaPayload = (payload: unknown): RawTemporada | null => {
  if (!payload || typeof payload !== 'object') return null;

  const payloadObj = payload as Record<string, unknown>;
  const dataObj = payloadObj.data;
  if (dataObj && typeof dataObj === 'object') {
    const dataRecord = dataObj as Record<string, unknown>;
    const temporada = dataRecord.temporada;
    if (temporada && typeof temporada === 'object') return temporada as RawTemporada;

    const results = dataRecord.results;
    if (Array.isArray(results) && results.length > 0 && typeof results[0] === 'object') {
      return results[0] as RawTemporada;
    }
  }

  if (payloadObj.id !== undefined) return payloadObj as RawTemporada;
  return null;
};

export const temporadaService = {
  async list(
    page: number = 1,
    año?: number,
    huertaId?: number,
    huertaRentadaId?: number,
    estado?: EstadoTemporada,                // 👈 clave: usar EstadoTemporada aquí
    finalizada?: boolean,
    search?: string
  ) {
    const params: Record<string, any> = { page, page_size: 10 };
    if (año) params['año'] = año;
    if (huertaId) params['huerta'] = huertaId;
    if (huertaRentadaId) params['huerta_rentada'] = huertaRentadaId;
    if (estado) params['estado'] = estado;
    if (finalizada !== undefined) params['finalizada'] = finalizada;
    if (search) params['search'] = search;

    const { data } = await apiClient.get<ListEnvelope<Temporada>>('/huerta/temporadas/', { params });
    if (Array.isArray(data?.data?.results)) {
      return {
        ...data,
        data: {
          ...data.data,
          results: data.data.results.map(mapTemporadaFromApi),
        },
      };
    }
    return data;
  },

  async create(payload: TemporadaCreateData) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>('/huerta/temporadas/', payload);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/temporadas/${id}/`);
    return response.data;
  },

  async finalizar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>(
      `/huerta/temporadas/${id}/finalizar/`
    );
    return response.data;
  },

  async archivar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>(
      `/huerta/temporadas/${id}/archivar/`
    );
    return response.data;
  },

  async restaurar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>(
      `/huerta/temporadas/${id}/restaurar/`
    );
    return response.data;
  },

  async getById(id: number): Promise<Temporada> {
    const response = await apiClient.get(`/huerta/temporadas/${id}/`);
    const raw = extractTemporadaPayload(response.data);
    if (!raw) {
      throw new Error('temporada_invalid_shape');
    }
    return mapTemporadaFromApi(raw);
  },
};
