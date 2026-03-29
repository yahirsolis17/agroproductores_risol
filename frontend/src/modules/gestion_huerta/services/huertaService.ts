import apiClient from '../../../global/api/apiClient';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';
import { Estado, AffectedCounts, ApiEnvelope, ListEnvelope } from '../types/shared';

export interface HuertaFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

type RawHuerta = Record<string, unknown>;

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

const mapHuertaFromApi = (raw: RawHuerta): Huerta => ({
  id: asNumber(raw.id),
  nombre: String(raw.nombre ?? ''),
  ubicacion: String(raw.ubicacion ?? ''),
  variedades: String(raw.variedades ?? ''),
  historial: asStringOrNull(raw.historial),
  hectareas: asNumber(raw.hectareas),
  propietario: asNumber(raw.propietario),
  propietario_detalle:
    raw.propietario_detalle && typeof raw.propietario_detalle === 'object'
      ? (raw.propietario_detalle as Huerta['propietario_detalle'])
      : undefined,
  propietario_archivado:
    raw.propietario_archivado === null || raw.propietario_archivado === undefined
      ? undefined
      : Boolean(raw.propietario_archivado),
  is_active: Boolean(raw.is_active),
  archivado_en: asStringOrNull(raw.archivado_en),
});

const extractHuertaPayload = (payload: unknown): RawHuerta | null => {
  if (!payload || typeof payload !== 'object') return null;

  const payloadObj = payload as Record<string, unknown>;
  const dataObj = payloadObj.data;
  if (dataObj && typeof dataObj === 'object') {
    const dataRecord = dataObj as Record<string, unknown>;
    const huerta = dataRecord.huerta;
    if (huerta && typeof huerta === 'object') return huerta as RawHuerta;
  }

  if (payloadObj.id !== undefined) return payloadObj as RawHuerta;
  return null;
};

export const huertaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HuertaFilters = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<ListEnvelope<Huerta>> {
    const pageSize = config.pageSize ?? 10;
    const params: Record<string, unknown> = { page, estado, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<ListEnvelope<Huerta>>('/huerta/huertas/', {
      params,
      signal: config.signal,
    });
    return data;
  },

  async create(payload: HuertaCreateData) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta: Huerta }>>('/huerta/huertas/', payload);
    return data;
  },

  async update(id: number, payload: HuertaUpdateData) {
    const { data } = await apiClient.put<ApiEnvelope<{ huerta: Huerta }>>(
      `/huerta/huertas/${id}/`,
      payload
    );
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/huertas/${id}/`);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas/${id}/archivar/`
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas/${id}/restaurar/`
    );
    return data;
  },

  async getById(id: number): Promise<Huerta> {
    const { data } = await apiClient.get(`/huerta/huertas/${id}/`);
    const raw = extractHuertaPayload(data);
    if (!raw) {
      throw new Error('huerta_invalid_shape');
    }
    return mapHuertaFromApi(raw);
  },
};
