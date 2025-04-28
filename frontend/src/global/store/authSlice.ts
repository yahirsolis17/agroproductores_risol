import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  permissions: string[];     // ← NEW
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  permissions: JSON.parse(localStorage.getItem('permissions') ?? '[]'),
  isAuthenticated: false,
};

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
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
