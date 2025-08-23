import axios from 'axios';
import authService from '../../modules/gestion_usuarios/services/authService';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const REFRESH_URL = `${BASE_URL}/api/token/refresh/`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const forceLogout = () => {
  authService.logout();
  window.location.href = '/login';
};

apiClient.interceptors.request.use(config => {
  const token = authService.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = authService.getRefreshToken();
        if (!refresh) { forceLogout(); return Promise.reject(error); }

        const res = await axios.post(REFRESH_URL, { refresh });
        const newAccess = res.data.access;

        // Persistir y propagar
        localStorage.setItem('accessToken', newAccess);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
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
