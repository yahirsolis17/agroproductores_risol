import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';
import type { BackendResponse } from '../../../global/types/apiTypes';

export const inventarioService = {
  listarPlastico: async (params?: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.get('/bodega/inventario-plastico/', { params });
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  ajustarPlastico: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/inventario-plastico/${id}/ajustar/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  movimientosPlastico: async (params?: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.get('/bodega/inventario-plastico/movimientos/', { params });
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
};

export default inventarioService;
