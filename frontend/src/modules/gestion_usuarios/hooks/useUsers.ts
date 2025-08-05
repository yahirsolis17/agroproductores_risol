// src/modules/gestion_usuarios/hooks/useUsers.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchUsers, setPage, setEstado } from '../../../global/store/userSlice';
import type { User, PaginationMeta } from '../types/userTypes';

export interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  meta: PaginationMeta;
  estado: 'activos' | 'archivados' | 'todos';
  refetch: () => void;
  changePage: (newPage: number) => void;
  changeEstado: (nuevo: 'activos' | 'archivados' | 'todos') => void;
}

export const useUsers = (): UseUsersReturn => {
  const dispatch = useAppDispatch();
  const { list, loading, error, page, pageSize, meta, estado } = useAppSelector(
    (state) => state.user
  );

  useEffect(() => {
    dispatch(fetchUsers({ page, estado }));
  }, [dispatch, page, estado]);

  return {
    users: list,
    loading,
    error,
    page,
    pageSize,
    meta,
    estado,
    refetch: () => dispatch(fetchUsers({ page, estado })),
    changePage: (newPage) => dispatch(setPage(newPage)),
    changeEstado: (nuevo) => dispatch(setEstado(nuevo)),
  };
};
