import apiClient from '../../../global/api/apiClient';

export const reportesBodegaService = {
  semanal: (params?: any) => apiClient.get('/bodega/reportes/semanal/', { params }),
  temporada: (params?: any) => apiClient.get('/bodega/reportes/temporada/', { params }),
};

export default reportesBodegaService;
