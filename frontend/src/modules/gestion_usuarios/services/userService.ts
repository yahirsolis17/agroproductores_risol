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
    estado: 'activos' | 'archivados' | 'todos' = 'activos'
  ) => {
    const res = await apiClient.get<RawPagination<User>>(
      '/usuarios/users/',
      { params: { page, estado } }
    );
    const { results, meta } = res.data.data;
    return { results, meta };
  },
};
