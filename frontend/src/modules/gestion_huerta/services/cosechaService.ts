// src/modules/gestion_huerta/services/cosechaService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';
import { ApiEnvelope, ListEnvelope, PaginationMeta } from '../types/shared';

type CosechaMeta = PaginationMeta & { total_registradas?: number };
type RawCosecha = Record<string, unknown>;

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

const mapCosechaFromApi = (raw: RawCosecha): Cosecha => ({
  id: asNumber(raw.id),
  nombre: String(raw.nombre ?? ''),
  fecha_creacion: asStringOrNull(raw.fecha_creacion) ?? '',
  fecha_inicio: asStringOrNull(raw.fecha_inicio),
  fecha_fin: asStringOrNull(raw.fecha_fin),
  finalizada: Boolean(raw.finalizada),
  temporada:
    raw.temporada === null || raw.temporada === undefined
      ? (raw.temporada_id === null || raw.temporada_id === undefined ? null : asNumber(raw.temporada_id))
      : asNumber(raw.temporada),
  huerta: raw.huerta === null || raw.huerta === undefined ? null : asNumber(raw.huerta),
  huerta_rentada:
    raw.huerta_rentada === null || raw.huerta_rentada === undefined
      ? null
      : asNumber(raw.huerta_rentada),
  is_active: Boolean(raw.is_active),
  archivado_en: asStringOrNull(raw.archivado_en),
  ventas_totales: typeof raw.ventas_totales === 'number' ? raw.ventas_totales : undefined,
  gastos_totales: typeof raw.gastos_totales === 'number' ? raw.gastos_totales : undefined,
  margen_ganancia: typeof raw.margen_ganancia === 'number' ? raw.margen_ganancia : undefined,
});

const extractCosechaPayload = (payload: unknown): RawCosecha | null => {
  if (!payload || typeof payload !== 'object') return null;
  const payloadObj = payload as Record<string, unknown>;
  const dataObj = payloadObj.data;
  if (dataObj && typeof dataObj === 'object') {
    const dataRecord = dataObj as Record<string, unknown>;
    const cosecha = dataRecord.cosecha;
    if (cosecha && typeof cosecha === 'object') return cosecha as RawCosecha;
  }
  if (payloadObj.id !== undefined) return payloadObj as RawCosecha;
  return null;
};

export const cosechaService = {
  // LIST (una sola llamada, con fallback a DRF nativo o envelope)
  async list(
    page: number = 1,
    temporadaId: number,
    search?: string,
    estado?: 'activas' | 'archivadas' | 'todas',
    finalizada?: boolean,          // 👈 NUEVO: filtro opcional, igual que en Temporadas
  ) {
    const params: Record<string, any> = { page, page_size: 10, temporada: temporadaId };
    if (search) params['search'] = search;
    if (estado) params['estado'] = estado;
    if (finalizada !== undefined) params['finalizada'] = finalizada;
    const { data } = await apiClient.get<ListEnvelope<Cosecha, CosechaMeta>>('/huerta/cosechas/', { params });
    return data;
  },

  // CREATE
  async create(payload: CosechaCreateData) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>('/huerta/cosechas/', payload);
    return response.data;
  },

  // UPDATE (PATCH parcial)
  async update(id: number, payload: CosechaUpdateData) {
    const response = await apiClient.patch<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/`,
      payload
    );
    return response.data;
  },

  // DELETE
  async delete(id: number) {
    const response = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/cosechas/${id}/`);
    return response.data;
  },

  // ARCHIVAR
  async archivar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/archivar/`
    );
    return response.data;
  },

  // RESTAURAR
  async restaurar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/restaurar/`
    );
    return response.data;
  },

  // FINALIZAR
  async finalizar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/finalizar/`
    );
    return response.data;
  },

  // TOGGLE FINALIZADA
  async toggleFinalizada(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/toggle-finalizada/`
    );
    return response.data;
  },

  // REACTIVAR (alias de deshacer finalización)
  async reactivar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/reactivar/`
    );
    return response.data;
  },

  // GET BY ID (normalizado)
  getById: async (id: number): Promise<Cosecha> => {
    const { data } = await apiClient.get(`/huerta/cosechas/${id}/`);
    const raw = extractCosechaPayload(data);
    if (!raw) {
      throw new Error('cosecha_invalid_shape');
    }
    return mapCosechaFromApi(raw);
  },

};
