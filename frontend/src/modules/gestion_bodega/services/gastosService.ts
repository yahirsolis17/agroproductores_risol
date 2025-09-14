import apiClient from '../../../global/api/apiClient';

export const gastosService = {
  compras: {
    list: (params?: any) => apiClient.get('/gestion_bodega/compras-madera/', { params }),
    create: (payload: any) => apiClient.post('/gestion_bodega/compras-madera/', payload),
    update: (id: number, payload: any) => apiClient.put(`/gestion_bodega/compras-madera/${id}/`, payload),
    partialUpdate: (id: number, payload: any) => apiClient.patch(`/gestion_bodega/compras-madera/${id}/`, payload),
    destroy: (id: number) => apiClient.delete(`/gestion_bodega/compras-madera/${id}/`),
    abonos: (id: number, payload: any) => apiClient.post(`/gestion_bodega/compras-madera/${id}/abonos/`, payload),
  },
  consumibles: {
    list: (params?: any) => apiClient.get('/gestion_bodega/consumibles/', { params }),
    create: (payload: any) => apiClient.post('/gestion_bodega/consumibles/', payload),
    update: (id: number, payload: any) => apiClient.put(`/gestion_bodega/consumibles/${id}/`, payload),
    partialUpdate: (id: number, payload: any) => apiClient.patch(`/gestion_bodega/consumibles/${id}/`, payload),
    destroy: (id: number) => apiClient.delete(`/gestion_bodega/consumibles/${id}/`),
  },
};

export default gastosService;

