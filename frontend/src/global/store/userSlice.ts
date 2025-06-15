//src/global/store/userSlice.ts
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
  meta: PaginationMeta;
}

const initialState: UserState = {
  list: [],
  loading: false,
  error: null,
  loaded: false,
  page: 1,
  pageSize: 10,
  meta: { count: 0, next: null, previous: null },
};

export const fetchUsers = createAsyncThunk(
  'user/fetchAll',
  async (page: number) => {
    const response = await userService.list(page);
    return {
      users: response.data.results,
      meta: {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
      } as PaginationMeta,
      page,
    };
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
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

export const { setPage } = userSlice.actions;
export default userSlice.reducer;
