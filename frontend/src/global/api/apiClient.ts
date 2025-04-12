// src/global/api/apiClient.ts
import axios from 'axios';
import authService from '../../modules/gestion_usuarios/services/authService';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const forceLogout = () => {
  authService.logout();
  window.location.href = '/login';
};

// Agrega el token automáticamente
apiClient.interceptors.request.use(config => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intenta refrescar token si hay 401
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = authService.getRefreshToken();
        if (!refresh) {
          console.warn('No hay refresh token. Cerrando sesión.');
          forceLogout();
          return Promise.reject(error);
        }

        const res = await axios.post('http://localhost:8000/api/token/refresh/', {
          refresh,
        });

        const newAccess = res.data.access;
        localStorage.setItem('accessToken', newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        forceLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
