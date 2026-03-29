import apiClient from '../../../global/api/apiClient';
import { ApiEnvelope, ListEnvelope } from '../types/shared';
import {
  CategoriaPreCosecha,
  CategoriaPreCosechaCreateData,
  CategoriaPreCosechaUpdateData,
} from '../types/categoriaPreCosechaTypes';

type RawCategoria = Record<string, unknown>;

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return String(value);
};

const mapCategoria = (raw: RawCategoria): CategoriaPreCosecha => ({
  id: asNumber(raw.id),
  nombre: asStringOrNull(raw.nombre) ?? '',
  is_active: Boolean(raw.is_active),
  archivado_en: asStringOrNull(raw.archivado_en),
  uso_count: raw.uso_count === undefined ? undefined : asNumber(raw.uso_count),
});

export const categoriaPreCosechaService = {
  async list(page = 1, estado: 'activas' | 'archivadas' | 'todas' = 'activas', search?: string) {
    const params: Record<string, unknown> = { page, page_size: 1000, estado };
    if (search) params.search = search;
    const { data } = await apiClient.get<ListEnvelope<CategoriaPreCosecha>>('/huerta/categorias-precosecha/', { params });
    if (Array.isArray(data?.data?.results)) {
      return {
        ...data,
        data: {
          ...data.data,
          results: data.data.results.map((raw: any) => mapCategoria(raw)),
        },
      };
    }
    return data;
  },

  async listAll(page = 1, pageSize = 1000) {
    const { data } = await apiClient.get<ListEnvelope<CategoriaPreCosecha>>('/huerta/categorias-precosecha/all/', {
      params: { page, page_size: pageSize },
    });
    if (Array.isArray(data?.data?.results)) {
      return {
        ...data,
        data: {
          ...data.data,
          results: data.data.results.map((raw: any) => mapCategoria(raw)),
        },
      };
    }
    return data;
  },

  async create(payload: CategoriaPreCosechaCreateData) {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria: CategoriaPreCosecha }>>(
      '/huerta/categorias-precosecha/',
      payload
    );
    if (data?.data?.categoria) data.data.categoria = mapCategoria(data.data.categoria as unknown as RawCategoria);
    return data;
  },

  async update(id: number, payload: CategoriaPreCosechaUpdateData) {
    const { data } = await apiClient.put<ApiEnvelope<{ categoria: CategoriaPreCosecha }>>(
      `/huerta/categorias-precosecha/${id}/`,
      payload
    );
    if (data?.data?.categoria) data.data.categoria = mapCategoria(data.data.categoria as unknown as RawCategoria);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria: CategoriaPreCosecha }>>(
      `/huerta/categorias-precosecha/${id}/archivar/`
    );
    if (data?.data?.categoria) data.data.categoria = mapCategoria(data.data.categoria as unknown as RawCategoria);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria: CategoriaPreCosecha }>>(
      `/huerta/categorias-precosecha/${id}/restaurar/`
    );
    if (data?.data?.categoria) data.data.categoria = mapCategoria(data.data.categoria as unknown as RawCategoria);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/categorias-precosecha/${id}/`);
    return data;
  },
};
