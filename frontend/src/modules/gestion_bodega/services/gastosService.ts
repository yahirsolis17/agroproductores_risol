import apiClient from '../../../global/api/apiClient';

export const gastosService = {
  compras: {
    list: (params?: any) => apiClient.get('/bodega/compras-madera/', { params }),
    create: (payload: any) => apiClient.post('/bodega/compras-madera/', payload),
    update: (id: number, payload: any) => apiClient.put(`/bodega/compras-madera/${id}/`, payload),
    partialUpdate: (id: number, payload: any) => apiClient.patch(`/bodega/compras-madera/${id}/`, payload),
    destroy: (id: number) => apiClient.delete(`/bodega/compras-madera/${id}/`),
    abonos: (id: number, payload: any) => apiClient.post(`/bodega/compras-madera/${id}/abonos/`, payload),
  },
  consumibles: {
    list: (params?: any) => apiClient.get('/bodega/consumibles/', { params }),
    create: (payload: any) => apiClient.post('/bodega/consumibles/', payload),
    update: (id: number, payload: any) => apiClient.put(`/bodega/consumibles/${id}/`, payload),
    partialUpdate: (id: number, payload: any) => apiClient.patch(`/bodega/consumibles/${id}/`, payload),
    destroy: (id: number) => apiClient.delete(`/bodega/consumibles/${id}/`),
  },
};

export default gastosService;
