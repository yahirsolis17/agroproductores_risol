//src/modules/gestion_usuarios/hooks/useUsers.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchUsers, setPage } from '../../../global/store/userSlice';

export const useUsers = () => {
  const dispatch = useAppDispatch();
  const { list, loading, error, page, pageSize, meta } = useAppSelector(
    (state) => state.user
  );

  useEffect(() => {
    dispatch(fetchUsers(page));
  }, [dispatch, page]);

  const changePage = (newPage: number) => {
    dispatch(setPage(newPage));
  };

  return {
    users: list,
    loading,
    error,
    page,
    pageSize,
    meta,
    refetch: () => dispatch(fetchUsers(page)),
    changePage,
  };
};