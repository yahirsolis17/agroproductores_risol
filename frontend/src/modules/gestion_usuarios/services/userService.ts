// src/modules/gestion_usuarios/services/userService.ts
import apiClient from '../../../global/api/apiClient';
import { User, PaginationMeta } from '../types/userTypes';

interface RawPagination<T> {
  success: boolean;
  notification: any;
  data: {
    results: T[];
    meta: PaginationMeta;
  };
}

export const userService = {
  list: async (
    page: number = 1,
    estado: 'activos' | 'archivados' | 'todos' = 'activos',
    filters?: { excludeRole?: string }
  ) => {
    const params: any = { page, estado };
    if (filters?.excludeRole) {
      params.exclude_role = filters.excludeRole;
    }
    const res = await apiClient.get<RawPagination<User>>(
      '/usuarios/users/',
      { params }
    );
    const { results, meta } = res.data.data;
    return { results, meta };
  },
  archivar: (id: number) => apiClient.patch(`/usuarios/users/${id}/archivar/`),
  restaurar: (id: number) => apiClient.patch(`/usuarios/users/${id}/restaurar/`),
  delete: (id: number) => apiClient.delete(`/usuarios/users/${id}/`),
};
