import apiClient from '../../../global/api/apiClient';

export const camionesService = {
  list: (params?: any) => apiClient.get('/bodega/camiones/', { params }),
  create: (payload: any) => apiClient.post('/bodega/camiones/', payload),
  update: (id: number, payload: any) => apiClient.put(`/bodega/camiones/${id}/`, payload),
  partialUpdate: (id: number, payload: any) => apiClient.patch(`/bodega/camiones/${id}/`, payload),
  destroy: (id: number) => apiClient.delete(`/bodega/camiones/${id}/`),
  confirmar: (id: number) => apiClient.post(`/bodega/camiones/${id}/confirmar/`, {}),
  addItem: (id: number, payload: any) => apiClient.post(`/bodega/camiones/${id}/items/add/`, payload),
  removeItem: (id: number, payload: any) => apiClient.post(`/bodega/camiones/${id}/items/remove/`, payload),
};

export default camionesService;
