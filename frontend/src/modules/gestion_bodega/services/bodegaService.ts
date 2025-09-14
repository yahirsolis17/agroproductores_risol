import apiClient from '../../../global/api/apiClient';

export const bodegaService = {
  list: (params?: any) => apiClient.get('/gestion_bodega/bodegas/', { params }),
  retrieve: (id: number) => apiClient.get(`/gestion_bodega/bodegas/${id}/`),
};

export default bodegaService;

