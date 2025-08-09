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
  data: { categoria: CategoriaInversion } | { categoria_inversion: CategoriaInversion };
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

  /* ------------ LIST ALL (activas + archivadas) ------------ */
  async listAll(page = 1, pageSize = 500) {
    const { data } = await apiClient.get<ListResp>('/huerta/categorias-inversion/all', {
      params: { page, page_size: pageSize },
    });
    return { categorias: data.data.categorias, meta: data.data.meta };
  },

  /* ------------ SEARCH (autocomplete) ------------ */
  async search(query: string, cfg: { signal?: AbortSignal } = {}) {
    if (!query.trim()) return [];
    const { data } = await apiClient.get<ListResp>('/huerta/categorias-inversion/', {
      params: { search: query, page_size: 50 },
      signal: cfg.signal,
    });
    return data.data.categorias;
  },

  /* ------------ CRUD ------------ */
  async create(payload: CategoriaInversionCreateData) {
    const { data } = await apiClient.post<ItemResp>('/huerta/categorias-inversion/', payload);
    // backend a veces usa 'categoria' y a veces 'categoria_inversion'
    return (data.data as any).categoria ?? (data.data as any).categoria_inversion;
  },
  async update(id: number, payload: CategoriaInversionUpdateData) {
    const { data } = await apiClient.patch<ItemResp>(`/huerta/categorias-inversion/${id}/`, payload);
    return (data.data as any).categoria ?? (data.data as any).categoria_inversion;
  },
  async archive(id: number) {
    const { data } = await apiClient.post<ItemResp>(`/huerta/categorias-inversion/${id}/archivar/`);
    return (data.data as any).categoria ?? (data.data as any).categoria_inversion;
  },
  async restore(id: number) {
    const { data } = await apiClient.post<ItemResp>(`/huerta/categorias-inversion/${id}/restaurar/`);
    return (data.data as any).categoria ?? (data.data as any).categoria_inversion;
  },
  async remove(id: number) {
    const { data } = await apiClient.delete<InfoResp>(`/huerta/categorias-inversion/${id}/`);
    return data;
  },
};
