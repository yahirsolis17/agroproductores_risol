// src/global/store/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userService } from '../../modules/gestion_usuarios/services/userService';
import { User, PaginationMeta } from '../../modules/gestion_usuarios/types/userTypes';

interface UserState {
  list: User[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  page: number;
  pageSize: number;
  estado: 'activos' | 'archivados' | 'todos';
  meta: PaginationMeta;
}

const initialState: UserState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  pageSize: 10,
  estado: 'activos',
  meta: { count: 0, next: null, previous: null },
};

export const fetchUsers = createAsyncThunk(
  'user/fetchAll',
  async ({ page, estado }: { page: number; estado: 'activos' | 'archivados' | 'todos' }) => {
    const { results: users, meta } = await userService.list(page, estado);
    return { users, meta, page, estado };
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setEstado: (state, action: PayloadAction<'activos' | 'archivados' | 'todos'>) => {
      state.estado = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, { payload }) => {
        state.list = payload.users;
        state.meta = payload.meta;
        state.page = payload.page;
        state.estado = payload.estado;
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error al cargar usuarios';
        state.loaded = true;
      });
  },
});

export const { setPage, setEstado } = userSlice.actions;
export default userSlice.reducer;
