import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const PERMISSIONS_KEY = 'permissions';

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  is_active: boolean;
  must_change_password?: boolean;
}

export interface LoginResult {
  user: User;
  must_change_password: boolean;
  tokens: { access: string; refresh: string };
}

interface LoginData {
  telefono: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  apellido: string;
  telefono: string;
  role: string;
  password: string;
}

const parseStoredJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const setStoredJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const authService = {
  login: async (data: LoginData): Promise<LoginResult> => {
    const response = await apiClient.post('/usuarios/login/', data);
    const env = ensureSuccess<{
      user: User & { is_admin?: boolean };
      must_change_password: boolean;
      tokens: { access: string; refresh: string };
    }>(response.data);

    const rawUser = env.data.user ?? ({} as User & { is_admin?: boolean });
    const isAdmin = rawUser.is_admin ?? false;
    const mustChangePassword = env.data.must_change_password === true;
    const tokens = env.data.tokens;

    if (!tokens?.access || !tokens?.refresh) {
      throw new Error('Tokens faltantes en la respuesta');
    }

    const persistedUser: User = {
      ...rawUser,
      role: isAdmin ? 'admin' : 'usuario',
      is_active: rawUser.is_active ?? true,
      must_change_password: mustChangePassword,
    };

    authService.persistSession(tokens, persistedUser);

    return {
      user: persistedUser,
      must_change_password: mustChangePassword,
      tokens,
    };
  },

  register: async (data: RegisterData) => {
    const response = await apiClient.post('/usuarios/users/', data);
    return ensureSuccess(response.data);
  },

  getMe: async () => {
    const response = await apiClient.get('/usuarios/me/');
    const env = ensureSuccess<{ user: User }>(response.data);
    return env.data.user;
  },

  persistSession: (tokens: { access: string; refresh: string }, user: User) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    setStoredJson(USER_KEY, user);
  },

  setAccessToken: (token: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  setUser: (user: User | null) => {
    if (!user) {
      localStorage.removeItem(USER_KEY);
      return;
    }
    setStoredJson(USER_KEY, user);
  },

  setPermissions: (permissions: string[]) => {
    setStoredJson(PERMISSIONS_KEY, permissions);
  },

  clearPermissions: () => {
    localStorage.removeItem(PERMISSIONS_KEY);
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
  },

  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: (): User | null => parseStoredJson<User | null>(USER_KEY, null),
  getPermissions: (): string[] => parseStoredJson<string[]>(PERMISSIONS_KEY, []),
};

export default authService;
