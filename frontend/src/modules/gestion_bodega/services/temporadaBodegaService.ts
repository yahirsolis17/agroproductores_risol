import apiClient from '../../../global/api/apiClient';

export const temporadaBodegaService = {
  list: (params?: any) => apiClient.get('/gestion_bodega/temporadas/', { params }),
  retrieve: (id: number) => apiClient.get(`/gestion_bodega/temporadas/${id}/`),
  close: (payload: any) => apiClient.post('/gestion_bodega/cierres/temporada/', payload),
};

export default temporadaBodegaService;

