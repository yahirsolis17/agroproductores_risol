import apiClient from '../../../global/api/apiClient';
import {
  CategoriaInversion,
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../types/categoriaInversionTypes';

type PaginationMeta = { count: number; next: string | null; previous: string | null };

interface ListEnvelope {
  success: boolean;
  message_key: string;
  data: {
    categorias: CategoriaInversion[];
    meta: PaginationMeta;
  };
}

interface ItemEnvelope {
  success: boolean;
  message_key: string;
  data: { categoria: CategoriaInversion } | { categoria_inversion: CategoriaInversion };
}

interface InfoEnvelope {
  success: boolean;
  message_key: string;
  data: { info: string };
}

export const categoriaInversionService = {
  /* ------------ LIST ACTIVE ------------ */
  async listActive(
    page = 1,
    pageSize = 100,
    config: { signal?: AbortSignal } = {}
  ): Promise<{ categorias: CategoriaInversion[]; meta: PaginationMeta }> {
    const { data } = await apiClient.get<ListEnvelope>('/huerta/categorias-inversion/', {
      params: { page, page_size: pageSize },
      signal: config.signal,
    });
    return { categorias: data.data.categorias, meta: data.data.meta };
  },

  /* ------------ LIST ALL (activas + archivadas) ------------ */
  async listAll(
    page = 1,
    pageSize = 500,
    config: { signal?: AbortSignal } = {}
  ): Promise<{ categorias: CategoriaInversion[]; meta: PaginationMeta }> {
    const { data } = await apiClient.get<ListEnvelope>('/huerta/categorias-inversion/all/', {
      params: { page, page_size: pageSize },
      signal: config.signal,
    });
    return { categorias: data.data.categorias, meta: data.data.meta };
  },

  /* ------------ SEARCH (autocomplete) ------------ */
  async search(query: string, cfg: { signal?: AbortSignal } = {}) {
    if (!query.trim()) return [];
    const { data } = await apiClient.get<ListEnvelope>('/huerta/categorias-inversion/', {
      params: { search: query, page_size: 50 },
      signal: cfg.signal,
    });
    return data.data.categorias;
  },

  /* ------------ CRUD (devuelven ENVELOPE para notificación del backend) ------------ */
  async create(payload: CategoriaInversionCreateData): Promise<ItemEnvelope> {
    const { data } = await apiClient.post<ItemEnvelope>('/huerta/categorias-inversion/', payload);
    return data;
  },

  async update(id: number, payload: CategoriaInversionUpdateData): Promise<ItemEnvelope> {
    const { data } = await apiClient.patch<ItemEnvelope>(`/huerta/categorias-inversion/${id}/`, payload);
    return data;
  },

  async archive(id: number): Promise<ItemEnvelope> {
    const { data } = await apiClient.post<ItemEnvelope>(`/huerta/categorias-inversion/${id}/archivar/`);
    return data;
  },

  async restore(id: number): Promise<ItemEnvelope> {
    const { data } = await apiClient.post<ItemEnvelope>(`/huerta/categorias-inversion/${id}/restaurar/`);
    return data;
  },

  async remove(id: number): Promise<InfoEnvelope> {
    const { data } = await apiClient.delete<InfoEnvelope>(`/huerta/categorias-inversion/${id}/`);
    return data;
  },
};
