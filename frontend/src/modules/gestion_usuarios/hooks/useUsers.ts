//src/modules/gestion_usuarios/hooks/useUsers.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchUsers, setPage, setEstado } from '../../../global/store/userSlice';

export const useUsers = () => {
  const dispatch = useAppDispatch();
  const { list, loading, error, page, pageSize, meta, estado } = useAppSelector(
    (state) => state.user
  );

  useEffect(() => {
    dispatch(fetchUsers({ page, estado }));
  }, [dispatch, page, estado]);

  const changePage = (newPage: number) => dispatch(setPage(newPage));
  const changeEstado = (nuevo: 'activos' | 'archivados' | 'todos') => dispatch(setEstado(nuevo));

  return {
    users: list,
    loading,
    error,
    page,
    pageSize,
    meta,
    estado,
    refetch: () => dispatch(fetchUsers({ page, estado })),
    changePage,
    changeEstado,
  };
};
