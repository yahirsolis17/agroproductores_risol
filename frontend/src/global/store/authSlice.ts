// global/store/authSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../global/api/apiClient';  // Ajusta ruta si hace falta

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

const initialState: AuthState = {
  user: null,
  token: null,
  permissions: JSON.parse(localStorage.getItem('permissions') ?? '[]'),
  isAuthenticated: false,
  loadingPermissions: false,
};

// ─── Thunk para refetch de permisos ───
export const fetchPermissionsThunk = createAsyncThunk<string[]>(
  'auth/fetchPermissions',
  async () => {
    const res = await apiClient.get('/usuarios/me/permissions/');
    // La ruta devuelve { permissions: string[] }
    return res.data.permissions;
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
