import apiClient from '../../../global/api/apiClient';

export const camionesService = {
  list: (params?: any) => apiClient.get('/gestion_bodega/camiones/', { params }),
  create: (payload: any) => apiClient.post('/gestion_bodega/camiones/', payload),
  update: (id: number, payload: any) => apiClient.put(`/gestion_bodega/camiones/${id}/`, payload),
  partialUpdate: (id: number, payload: any) => apiClient.patch(`/gestion_bodega/camiones/${id}/`, payload),
  destroy: (id: number) => apiClient.delete(`/gestion_bodega/camiones/${id}/`),
  confirmar: (id: number) => apiClient.post(`/gestion_bodega/camiones/${id}/confirmar/`, {}),
  addItem: (id: number, payload: any) => apiClient.post(`/gestion_bodega/camiones/${id}/items/add/`, payload),
  removeItem: (id: number, payload: any) => apiClient.post(`/gestion_bodega/camiones/${id}/items/remove/`, payload),
};

export default camionesService;

