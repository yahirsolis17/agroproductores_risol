// src/modules/gestion_usuarios/hooks/useUsers.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchUsers, setPage, setEstado, setFilters } from '../../../global/store/userSlice';
import type { User, PaginationMeta } from '../types/userTypes';

export interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  meta: PaginationMeta;
  estado: 'activos' | 'archivados' | 'todos';
  filters: { excludeRole?: string };
  refetch: () => void;
  changePage: (newPage: number) => void;
  changeEstado: (nuevo: 'activos' | 'archivados' | 'todos') => void;
  setFilters: (filters: { excludeRole?: string }) => void;
}

export const useUsers = (): UseUsersReturn => {
  const dispatch = useAppDispatch();
  const { list, loading, error, page, pageSize, meta, estado, filters } = useAppSelector(
    (state) => state.user
  );

  // Evitar ciclos infinitos por referencia de objeto nuevo
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    dispatch(fetchUsers({ page, estado, filters }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, estado, filtersKey]);

  return {
    users: list,
    loading,
    error,
    page,
    pageSize,
    meta,
    estado,
    filters,
    refetch: () => dispatch(fetchUsers({ page, estado, filters })),
    changePage: (newPage) => dispatch(setPage(newPage)),
    changeEstado: (nuevo) => dispatch(setEstado(nuevo)),
    setFilters: (f) => dispatch(setFilters(f)),
  };
};
