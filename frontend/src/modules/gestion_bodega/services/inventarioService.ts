import apiClient from '../../../global/api/apiClient';

export const inventarioService = {
  listarPlastico: (params?: any) => apiClient.get('/gestion_bodega/inventario-plastico/', { params }),
  ajustarPlastico: (id: number, payload: any) => apiClient.post(`/gestion_bodega/inventario-plastico/${id}/ajustar/`, payload),
  movimientosPlastico: (params?: any) => apiClient.get('/gestion_bodega/inventario-plastico/movimientos/', { params }),
};

export default inventarioService;

