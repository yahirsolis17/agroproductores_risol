// src/modules/gestion_usuarios/services/authService.ts
import apiClient from '../../../global/api/apiClient';

/* ---------- Tipos ---------- */
export interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  must_change_password?: boolean; // ← 💥 agrega esto
}

export interface LoginResult {
  user: User;
  must_change_password: boolean;
}

interface LoginData {
  telefono: string;
  password: string;
}

export interface RegisterData {
  nombre:   string;
  apellido: string;
  telefono: string;
  role:     string;
  password?: string;           // opcional
}

/* ---------- Servicio ---------- */
const authService = {
  /* ---- LOGIN ---- */
  login: async (data: LoginData): Promise<LoginResult & { notification: any }> => {
    const response = await apiClient.post('/usuarios/login/', data);
  
    const rawUser = response.data?.data?.user ?? {};
    const isAdmin = rawUser.is_admin ?? response.data?.data?.is_admin ?? false;
  
    const user: User = {
      ...rawUser,
      role: isAdmin ? 'admin' : 'usuario',
    };
  
    const tokens = response.data?.data?.tokens;
    if (!tokens?.access || !tokens?.refresh) {
      throw new Error('Tokens faltantes en la respuesta');
    }
  
    /* Guardar sesión */
    localStorage.setItem('accessToken',  tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    localStorage.setItem('user',         JSON.stringify(user));
  
    return {
      user,
      must_change_password: response.data?.data?.must_change_password === true,
      notification: response.data.notification,
    };
  },
  

  /* ---- REGISTER ---- */
  register: async (data: RegisterData) => {
    const response = await apiClient.post('/usuarios/users/', data);
    return response.data;
  },

  /* ---- INFO USUARIO ---- */
  getMe: async () => {
    const response = await apiClient.get('/usuarios/me/');
    return response.data as User;
  },

  /* ---- LOGOUT ---- */
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  /* ---- Helpers ---- */
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  getUser: (): User | null => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
};

export default authService;
