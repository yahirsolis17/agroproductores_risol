// global/store/authSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../global/api/apiClient';  // Ajusta ruta si hace falta
import { ensureSuccess } from '../utils/backendEnvelope';
import authService from '../../modules/gestion_usuarios/services/authService';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  loadingPermissions: boolean;    // ← NUEVO: estado para el thunk
}

const storedUser = authService.getUser() as User | null;

const initialState: AuthState = {
  user: storedUser,
  token: authService.getAccessToken(),
  permissions: authService.getPermissions(),
  isAuthenticated: Boolean(storedUser),
  loadingPermissions: false,
};

// ─── Thunk para refetch de permisos ───
export const fetchPermissionsThunk = createAsyncThunk<string[]>(
  'auth/fetchPermissions',
  async () => {
    const res = await apiClient.get('/usuarios/me/permissions/');
    const env = ensureSuccess<{ permissions: string[] }>(res.data);
    return env.data.permissions;
  }
);

export const changePasswordThunk = createAsyncThunk<
  void,
  { new_password: string; confirm_password: string },
  { rejectValue: unknown }
>('auth/changePassword', async (payload, { rejectWithValue }) => {
  try {
    await apiClient.post('/usuarios/change-password/', payload);
    return;
  } catch (err: unknown) {
    const errorData = (err as { response?: { data?: unknown } })?.response?.data;
    return rejectWithValue(errorData);
  }
});

export const logoutThunk = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await apiClient.post('/usuarios/logout/', {});
    } catch {
      // Logout local must still proceed even if token revocation fails.
    } finally {
      dispatch(logout());
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{ user: User; token: string; permissions: string[] }>
    ) => {
      const { user, token, permissions } = action.payload;
      state.user = user;
      state.token = token;
      state.permissions = permissions;
      state.isAuthenticated = true;
      authService.setUser(user);
      authService.setAccessToken(token);
      authService.setPermissions(permissions);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.permissions = [];
      state.isAuthenticated = false;
      authService.logout();
    },
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
      authService.setPermissions(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissionsThunk.pending, (state) => {
        state.loadingPermissions = true;
      })
      .addCase(fetchPermissionsThunk.fulfilled, (state, action) => {
        state.permissions = action.payload;
        state.loadingPermissions = false;
        authService.setPermissions(action.payload);
      })
      .addCase(fetchPermissionsThunk.rejected, (state) => {
        state.loadingPermissions = false;
      });
  },
});

export const { loginSuccess, logout, setPermissions } = authSlice.actions;
export default authSlice.reducer;
