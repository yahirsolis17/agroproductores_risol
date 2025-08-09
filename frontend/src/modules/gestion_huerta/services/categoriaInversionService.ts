// ============================================================================
// src/modules/gestion_huerta/services/categoriaInversionService.ts
// ============================================================================
import apiClient from '../../../global/api/apiClient';
import { CategoriaInversion, CategoriaInversionCreateData, CategoriaInversionUpdateData } from '../types/categoriaInversionTypes';

interface ListResp {
  success: boolean;
  notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
  data: { categorias: CategoriaInversion[]; meta: { count: number; next: string | null; previous: string | null } };
}
interface ItemResp {
  success: boolean;
  notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
  data: { categoria: CategoriaInversion };
}
interface InfoResp {
  success: boolean;
  notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
  data: { info: string };
}

export const categoriaInversionService = {
  async listActive(page = 1, pageSize = 100) {
    const { data } = await apiClient.get<ListResp>('/huerta/categorias-inversion/', { params: { page, page_size: pageSize } });
    return data;
  },
  async search(query: string, cfg: { signal?: AbortSignal } = {}) {
    if (!query.trim()) return [] as CategoriaInversion[];
    const { data } = await apiClient.get<ListResp>('/huerta/categorias-inversion/', { params: { search: query, page_size: 30 }, signal: cfg.signal });
    return data.data.categorias;
  },
  async create(payload: CategoriaInversionCreateData) {
    const { data } = await apiClient.post<ItemResp>('/huerta/categorias-inversion/', payload);
    return data;
  },
  async update(id: number, payload: CategoriaInversionUpdateData) {
    const { data } = await apiClient.patch<ItemResp>(`/huerta/categorias-inversion/${id}/`, payload);
    return data;
  },
  async archive(id: number) {
    const { data } = await apiClient.post<ItemResp>(`/huerta/categorias-inversion/${id}/archivar/`);
    return data;
  },
  async restore(id: number) {
    const { data } = await apiClient.post<ItemResp>(`/huerta/categorias-inversion/${id}/restaurar/`);
    return data;
  },
  async remove(id: number) {
    const { data } = await apiClient.delete<InfoResp>(`/huerta/categorias-inversion/${id}/`);
    return data;
  },
};
