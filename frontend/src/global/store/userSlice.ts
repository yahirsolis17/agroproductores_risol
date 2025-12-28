// src/global/store/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userService } from '../../modules/gestion_usuarios/services/userService';
import { User, PaginationMeta } from '../../modules/gestion_usuarios/types/userTypes';
import { ApiError, extractApiError, BackendResponse } from '../types/apiTypes';

interface UserState {
  list: User[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  page: number;
  pageSize: number;
  estado: 'activos' | 'archivados' | 'todos';
  filters: { excludeRole?: string };
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
  filters: {},
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 },
};

export const fetchUsers = createAsyncThunk(
  'user/fetchAll',
  async ({ page, estado, filters }: { page: number; estado: 'activos' | 'archivados' | 'todos'; filters?: { excludeRole?: string } }) => {
    const env = await userService.list(page, estado, filters);
    const users = env.data.results;
    const meta = env.data.meta;
    return { users, meta, page, estado, filters };
  }
);


export const archiveUser = createAsyncThunk<
  { user: User; envelope: BackendResponse<{ user: User }> },
  number,
  { rejectValue: ApiError }
>(
  'user/archive',
  async (id: number, { rejectWithValue }) => {
    try {
      const env = await userService.archivar(id);
      return { user: env.data.user, envelope: env };
    } catch (err: unknown) {
      return rejectWithValue(extractApiError(err));
    }
  }
);

export const restoreUser = createAsyncThunk<
  { user: User; envelope: BackendResponse<{ user: User }> },
  number,
  { rejectValue: ApiError }
>(
  'user/restore',
  async (id: number, { rejectWithValue }) => {
    try {
      const env = await userService.restaurar(id);
      return { user: env.data.user, envelope: env };
    } catch (err: unknown) {
      return rejectWithValue(extractApiError(err));
    }
  }
);

export const deleteUser = createAsyncThunk<
  { id: number; envelope: BackendResponse<{ info?: string }> },
  number,
  { rejectValue: ApiError }
>(
  'user/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const env = await userService.delete(id);
      return { id, envelope: env };
    } catch (err: unknown) {
      return rejectWithValue(extractApiError(err));
    }
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
    setFilters: (state, action: PayloadAction<{ excludeRole?: string }>) => {
      state.filters = action.payload;
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
      })
      // Archive
      .addCase(archiveUser.fulfilled, (state, { payload }) => {
        // Optimistic update or just trigger refetch in component?
        // Let's update the list locally for better UX
        const index = state.list.findIndex(u => u.id === payload.user.id);
        if (index !== -1) {
          if (state.estado === 'activos') {
            state.list.splice(index, 1);
            state.meta.count -= 1;
          } else {
            state.list[index] = payload.user;
          }
        }
      })
      // Restore
      .addCase(restoreUser.fulfilled, (state, { payload }) => {
        const index = state.list.findIndex(u => u.id === payload.user.id);
        if (index !== -1) {
          if (state.estado === 'archivados') {
            state.list.splice(index, 1);
            state.meta.count -= 1;
          } else {
            state.list[index] = payload.user;
          }
        }
      })
      // Delete
      .addCase(deleteUser.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(u => u.id !== payload.id);
        state.meta.count -= 1;
      });
  },
});

export const { setPage, setEstado, setFilters } = userSlice.actions;
export default userSlice.reducer;
