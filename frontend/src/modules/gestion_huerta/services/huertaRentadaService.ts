/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { HuertaRentada, HuertaRentadaCreateData, HuertaRentadaUpdateData } from '../types/huertaRentadaTypes';
import { Estado, AffectedCounts, ApiEnvelope, ListEnvelope } from '../types/shared';

export interface HRFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

type RawHuertaRentada = Record<string, unknown>;

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

const mapHuertaRentadaFromApi = (raw: RawHuertaRentada): HuertaRentada => ({
  id: asNumber(raw.id),
  nombre: String(raw.nombre ?? ''),
  ubicacion: String(raw.ubicacion ?? ''),
  variedades: String(raw.variedades ?? ''),
  historial: asStringOrNull(raw.historial),
  hectareas: asNumber(raw.hectareas),
  propietario: asNumber(raw.propietario),
  propietario_detalle:
    raw.propietario_detalle && typeof raw.propietario_detalle === 'object'
      ? (raw.propietario_detalle as HuertaRentada['propietario_detalle'])
      : undefined,
  propietario_archivado:
    raw.propietario_archivado === null || raw.propietario_archivado === undefined
      ? undefined
      : Boolean(raw.propietario_archivado),
  monto_renta: asNumber(raw.monto_renta),
  monto_renta_palabras: asStringOrNull(raw.monto_renta_palabras) ?? undefined,
  is_active: Boolean(raw.is_active),
  archivado_en: asStringOrNull(raw.archivado_en),
});

const extractHuertaRentadaPayload = (payload: unknown): RawHuertaRentada | null => {
  if (!payload || typeof payload !== 'object') return null;

  const payloadObj = payload as Record<string, unknown>;
  const dataObj = payloadObj.data;
  if (dataObj && typeof dataObj === 'object') {
    const dataRecord = dataObj as Record<string, unknown>;
    const huerta = dataRecord.huerta_rentada;
    if (huerta && typeof huerta === 'object') return huerta as RawHuertaRentada;
  }

  if (payloadObj.id !== undefined) return payloadObj as RawHuertaRentada;
  return null;
};

export const huertaRentadaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HRFilters = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<ListEnvelope<HuertaRentada>> {
    const pageSize = config.pageSize ?? 10;
    const params: Record<string, unknown> = { page, estado, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<ListEnvelope<HuertaRentada>>('/huerta/huertas-rentadas/', {
      params,
      signal: config.signal,
    });
    return data;
  },

  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_rentada: HuertaRentada }>>(
      '/huerta/huertas-rentadas/',
      payload
    );
    return data;
  },

  async update(id: number, payload: HuertaRentadaUpdateData) {
    const { data } = await apiClient.put<ApiEnvelope<{ huerta_rentada: HuertaRentada }>>(
      `/huerta/huertas-rentadas/${id}/`,
      payload
    );
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(
      `/huerta/huertas-rentadas/${id}/`
    );
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_rentada_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas-rentadas/${id}/archivar/`
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_rentada_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas-rentadas/${id}/restaurar/`
    );
    return data;
  },

  async getById(id: number): Promise<HuertaRentada> {
    const { data } = await apiClient.get(`/huerta/huertas-rentadas/${id}/`);
    const raw = extractHuertaRentadaPayload(data);
    if (!raw) {
      throw new Error('huerta_rentada_invalid_shape');
    }
    return mapHuertaRentadaFromApi(raw);
  },
};
