import apiClient from '../../../global/api/apiClient';
import {
  CategoriaInversion,
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../types/categoriaInversionTypes';

interface ListResp {
  success: boolean;
  data: {
    categorias: CategoriaInversion[];
    meta: { count: number; next: string | null; previous: string | null };
  };
}

interface ItemResp {
  success: boolean;
  data: { categoria_inversion: CategoriaInversion };
}

interface InfoResp { success: boolean; data: { info: string } }

export const categoriaInversionService = {
  /* ------------ LIST ACTIVE ------------ */
  async listActive(page = 1, pageSize = 100) {
    const { data } = await apiClient.get<ListResp>('/huerta/categorias-inversion/', {
      params: { page, page_size: pageSize },
    });
    return { categorias: data.data.categorias, meta: data.data.meta };
  },

  /* ------------ SEARCH (autocomplete) ------------ */
  async search(query: string, cfg: { signal?: AbortSignal } = {}) {
    if (!query.trim()) return [];
    const { data } = await apiClient.get<ListResp>('/huerta/categorias-inversion/', {
      params: { search: query, page_size: 30 },
      signal: cfg.signal,
    });
    return data.data.categorias;
  },

  /* ------------ CRUD ------------ */
  create(payload: CategoriaInversionCreateData) {
    return apiClient.post<ItemResp>('/huerta/categorias-inversion/', payload)
                    .then(r => r.data.data.categoria_inversion);
  },
  update(id: number, payload: CategoriaInversionUpdateData) {
    return apiClient.patch<ItemResp>(`/huerta/categorias-inversion/${id}/`, payload)
                    .then(r => r.data.data.categoria_inversion);
  },
  archive(id: number) {
    return apiClient.patch<ItemResp>(`/huerta/categorias-inversion/${id}/archivar/`)
                    .then(r => r.data.data.categoria_inversion);
  },
  restore(id: number) {
    return apiClient.patch<ItemResp>(`/huerta/categorias-inversion/${id}/restaurar/`)
                    .then(r => r.data.data.categoria_inversion);
  },
  remove(id: number) {
    return apiClient.delete<InfoResp>(`/huerta/categorias-inversion/${id}/`)
                    .then(r => r.data);
  },
};
