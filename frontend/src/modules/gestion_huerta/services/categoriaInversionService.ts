// src/modules/gestion_huerta/services/categoriaInversionService.ts
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
  data: { categoria: CategoriaInversion };
}

interface InfoResp {
  success: boolean;
  data: { info: string };
}

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
    // si el usuario todavía no escribe nada útil, devolvemos vacío
    if (!query || !query.trim()) return [];
    const { data } = await apiClient.get<ListResp>('/huerta/categorias-inversion/', {
      params: { search: query.trim(), page_size: 30 },
      signal: cfg.signal,
    });
    return data.data.categorias;
  },

  /* ------------ CRUD ------------ */
  async create(payload: CategoriaInversionCreateData) {
    const { data } = await apiClient.post<ItemResp>('/huerta/categorias-inversion/', payload);
    return data.data.categoria; // ← backend devuelve "categoria"
  },

  async update(id: number, payload: CategoriaInversionUpdateData) {
    const { data } = await apiClient.patch<ItemResp>(`/huerta/categorias-inversion/${id}/`, payload);
    return data.data.categoria; // ← backend devuelve "categoria"
  },

  async archive(id: number) {
    // backend usa POST (no PATCH) para acciones
    const { data } = await apiClient.post<ItemResp>(`/huerta/categorias-inversion/${id}/archivar/`);
    return data.data.categoria;
  },

  async restore(id: number) {
    const { data } = await apiClient.post<ItemResp>(`/huerta/categorias-inversion/${id}/restaurar/`);
    return data.data.categoria;
  },

  async remove(id: number) {
    const { data } = await apiClient.delete<InfoResp>(`/huerta/categorias-inversion/${id}/`);
    return data.data.info;
  },
};
