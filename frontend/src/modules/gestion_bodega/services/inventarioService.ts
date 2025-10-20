import apiClient from '../../../global/api/apiClient';

export const inventarioService = {
  listarPlastico: (params?: any) => apiClient.get('/bodega/inventario-plastico/', { params }),
  ajustarPlastico: (id: number, payload: any) => apiClient.post(`/bodega/inventario-plastico/${id}/ajustar/`, payload),
  movimientosPlastico: (params?: any) => apiClient.get('/bodega/inventario-plastico/movimientos/', { params }),
};

export default inventarioService;
