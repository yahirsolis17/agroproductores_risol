import apiClient from '../../../global/api/apiClient';

export const pedidosService = {
  list: (params?: any) => apiClient.get('/bodega/pedidos/', { params }),
  retrieve: (id: number) => apiClient.get(`/bodega/pedidos/${id}/`),
  create: (payload: any) => apiClient.post('/bodega/pedidos/', payload),
  update: (id: number, payload: any) => apiClient.put(`/bodega/pedidos/${id}/`, payload),
  partialUpdate: (id: number, payload: any) => apiClient.patch(`/bodega/pedidos/${id}/`, payload),
  destroy: (id: number) => apiClient.delete(`/bodega/pedidos/${id}/`),
  surtir: (id: number, payload: any) => apiClient.post(`/bodega/pedidos/${id}/surtir/`, payload),
  cancelar: (id: number) => apiClient.post(`/bodega/pedidos/${id}/cancelar/`, {}),
};

export default pedidosService;
