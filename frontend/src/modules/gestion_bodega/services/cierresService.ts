import apiClient from '../../../global/api/apiClient';

export const cierresService = {
  list: (params?: any) => apiClient.get('/bodega/cierres/', { params }),
  semanal: (payload: any) => apiClient.post('/bodega/cierres/semanal/', payload),
  temporada: (payload: any) => apiClient.post('/bodega/cierres/temporada/', payload),
};

export default cierresService;
