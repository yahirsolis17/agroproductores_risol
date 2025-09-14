import apiClient from '../../../global/api/apiClient';

export const pedidosService = {
  list: (params?: any) => apiClient.get('/gestion_bodega/pedidos/', { params }),
  retrieve: (id: number) => apiClient.get(`/gestion_bodega/pedidos/${id}/`),
  create: (payload: any) => apiClient.post('/gestion_bodega/pedidos/', payload),
  update: (id: number, payload: any) => apiClient.put(`/gestion_bodega/pedidos/${id}/`, payload),
  partialUpdate: (id: number, payload: any) => apiClient.patch(`/gestion_bodega/pedidos/${id}/`, payload),
  destroy: (id: number) => apiClient.delete(`/gestion_bodega/pedidos/${id}/`),
  surtir: (id: number, payload: any) => apiClient.post(`/gestion_bodega/pedidos/${id}/surtir/`, payload),
  cancelar: (id: number) => apiClient.post(`/gestion_bodega/pedidos/${id}/cancelar/`, {}),
};

export default pedidosService;

