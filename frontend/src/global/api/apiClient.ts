import axios, { AxiosError } from 'axios';
import authService from '../../modules/gestion_usuarios/services/authService';
import { handleBackendNotification } from '../utils/NotificationEngine';

const LOCAL_DEV_API_ORIGIN = 'http://127.0.0.1:8000';

const normalizeBaseUrl = (rawUrl: string): string => {
  const fallback = rawUrl || LOCAL_DEV_API_ORIGIN;

  try {
    const parsed = new URL(fallback);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (import.meta.env.DEV && isLocalHost) {
      parsed.protocol = 'http:';
      parsed.hostname = '127.0.0.1';
      parsed.port = parsed.port || '8000';
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    if (import.meta.env.DEV) {
      return LOCAL_DEV_API_ORIGIN;
    }

    return fallback.replace(/\/$/, '');
  }
};

const BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || LOCAL_DEV_API_ORIGIN);
const REFRESH_URL = `${BASE_URL}/api/token/refresh/`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

const forceLogout = () => {
  authService.logout();
  window.location.href = '/login';
};

export const isApiClientTransportError = (err: unknown): err is AxiosError<unknown> => {
  if (!axios.isAxiosError(err)) return false;

  return !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED';
};

export const isApiClientConfirmedAuthError = (err: unknown): err is AxiosError<unknown> => {
  if (!axios.isAxiosError(err)) return false;

  return err.response?.status === 401 || err.response?.status === 403;
};

apiClient.interceptors.request.use(config => {
  const token = authService.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  response => {
    const method = response.config.method?.toLowerCase();
    if (method && method !== 'get' && response.data) {
      handleBackendNotification(response.data);
    }
    return response;
  },
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = authService.getRefreshToken();
        if (!refresh) { forceLogout(); return Promise.reject(error); }

        const res = await axios.post(REFRESH_URL, { refresh });
        const newAccess = res.data.access;

        if (!newAccess) {
          forceLogout();
          return Promise.reject(error);
        }

        // Persistir y propagar
        authService.setAccessToken(newAccess);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        if (isApiClientConfirmedAuthError(refreshError)) {
          forceLogout();
        }

        return Promise.reject(refreshError);
      }
    }
    
    // Si hay error pero tiene respuesta y no es de login/auth
    if (error.response && error.response.config.method?.toLowerCase() !== 'get') {
      if (error.response.data) {
         handleBackendNotification(error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export type ApiClientAxiosError = AxiosError<unknown>;

export const isApiClientAxiosError = (err: unknown): err is ApiClientAxiosError => {
  return axios.isAxiosError(err);
};

export const getApiClientErrorPayload = (err: unknown): unknown => {
  if (!axios.isAxiosError(err)) return null;
  return err.response?.data ?? null;
};
