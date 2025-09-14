import apiClient from '../../../global/api/apiClient';

export const cierresService = {
  list: (params?: any) => apiClient.get('/gestion_bodega/cierres/', { params }),
  semanal: (payload: any) => apiClient.post('/gestion_bodega/cierres/semanal/', payload),
  temporada: (payload: any) => apiClient.post('/gestion_bodega/cierres/temporada/', payload),
};

export default cierresService;

