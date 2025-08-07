import apiClient from '../../../global/api/apiClient';
import type {
  CategoriaInversion,
  CategoriaInversionCreate,
  CategoriaInversionUpdate,
} from '../types/categoriaInversionTypes';

type ApiEnvelope<T> = {
  success: boolean;
  message_key: string;
  data: T;
};

type PaginationMeta = { count: number; next: string | null; previous: string | null };

type ListResp = {
  categorias: CategoriaInversion[];
  meta: PaginationMeta;
};

type ItemWrapper = { categoria: CategoriaInversion };

export const categoriaInversionService = {
  async list(page = 1, search?: string): Promise<ListResp> {
    const params: Record<string, any> = { page };
    if (search) params.search = search;

    const { data } = await apiClient.get<ApiEnvelope<ListResp>>('/huerta/categorias-inversion/', { params });
    return data.data;
  },

  async create(payload: CategoriaInversionCreate) {
    const { data } = await apiClient.post<ApiEnvelope<ItemWrapper>>('/huerta/categorias-inversion/', payload);
    return data;
  },

  async update(id: number, payload: CategoriaInversionUpdate) {
    const { data } = await apiClient.put<ApiEnvelope<ItemWrapper>>(`/huerta/categorias-inversion/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/categorias-inversion/${id}/`);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria_id: number }>>(
      `/huerta/categorias-inversion/${id}/archivar/`,
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria_id: number }>>(
      `/huerta/categorias-inversion/${id}/restaurar/`,
    );
    return data;
  },
};
