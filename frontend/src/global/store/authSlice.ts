// global/store/authSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../global/api/apiClient';  // Ajusta ruta si hace falta
import { ensureSuccess } from '../utils/backendEnvelope';
import { handleBackendNotification } from '../utils/NotificationEngine';

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

const readStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const storedUser = readStoredUser();

const initialState: AuthState = {
  user: storedUser,
  token: localStorage.getItem('accessToken'),
  permissions: JSON.parse(localStorage.getItem('permissions') ?? '[]'),
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
    const res = await apiClient.post('/usuarios/change-password/', payload);
    handleBackendNotification(res.data);
    return;
  } catch (err: unknown) {
    const errorData = (err as { response?: { data?: unknown } })?.response?.data;
    handleBackendNotification(errorData);
    return rejectWithValue(errorData);
  }
});

export const logoutThunk = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      const refresh = localStorage.getItem('refreshToken');
      const res = await apiClient.post('/usuarios/logout/', { refresh_token: refresh });
      handleBackendNotification(res.data);
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      handleBackendNotification(errorData);
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
      localStorage.setItem('permissions', JSON.stringify(permissions));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.permissions = [];
      state.isAuthenticated = false;
      localStorage.removeItem('permissions');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
      localStorage.setItem('permissions', JSON.stringify(action.payload));
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
        localStorage.setItem('permissions', JSON.stringify(action.payload));
      })
      .addCase(fetchPermissionsThunk.rejected, (state) => {
        state.loadingPermissions = false;
      });
  },
});

export const { loginSuccess, logout, setPermissions } = authSlice.actions;
export default authSlice.reducer;
