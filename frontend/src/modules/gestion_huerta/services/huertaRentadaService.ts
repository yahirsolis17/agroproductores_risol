/* --------------------------------------------------------------------------
 *  src/modules/gestion_huerta/services/huertaRentadaService.ts
 *  Misma estructura que huertaService, pero para huertas rentadas.
 * -------------------------------------------------------------------------- */
import apiClient from '../../../global/api/apiClient';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../types/huertaRentadaTypes';

/* ───────── Tipos ───────── */
export type Estado = 'activos' | 'archivados' | 'todos';
export interface HRFilters { nombre?:string; propietario?:number; }

interface ListResp {
  huertas_rentadas: HuertaRentada[];
  meta: { count:number; next:string|null; previous:string|null };
}
interface ItemWrapper { huerta_rentada: HuertaRentada; }

/* helper → estado ➜ query param “archivado” */
const estadoToQuery = (estado:Estado) =>
  estado === 'todos' ? undefined : (estado === 'activos' ? 'false' : 'true');

/* --------------------------------------------------------------------------
 *  API
 * -------------------------------------------------------------------------- */
export const huertaRentadaService = {
  /* ------------ LIST ------------ */
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HRFilters = {}
  ) {
    const params: Record<string, any> = { page };
    const arch = estadoToQuery(estado);
    if (arch !== undefined) params.archivado = arch;

    if (filters.nombre)      params.nombre      = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success:boolean; message_key:string; data:ListResp;
    }>('/huerta/huertas-rentadas/', { params });

    return data.data;          // { huertas_rentadas, meta }
  },

  /* ------------ CREATE ------------ */
  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<{
      success:boolean; message_key:string; data:ItemWrapper;
    }>('/huerta/huertas-rentadas/', payload);
    return data;
  },

  /* ------------ UPDATE ------------ */
  async update(id:number, payload:HuertaRentadaUpdateData) {
    const { data } = await apiClient.put<{
      success:boolean; message_key:string; data:ItemWrapper;
    }>(`/huerta/huertas-rentadas/${id}/`, payload);
    return data;
  },

  /* ------------ DELETE ------------ */
  async delete(id:number) {
    const { data } = await apiClient.delete<{
      success:boolean; message_key:string; data:{info:string};
    }>(`/huerta/huertas-rentadas/${id}/`);
    return data;
  },

  /* ------------ ARCHIVAR / RESTAURAR ------------ */
  async archivar(id:number) {
    const { data } = await apiClient.post<{
      success:boolean; message_key:string; data:{huerta_rentada_id:number};
    }>(`/huerta/huertas-rentadas/${id}/archivar/`);
    return data;
  },
  async restaurar(id:number) {
    const { data } = await apiClient.post<{
      success:boolean; message_key:string; data:{huerta_rentada_id:number};
    }>(`/huerta/huertas-rentadas/${id}/restaurar/`);
    return data;
  },
};
// No cambios necesarios, el servicio ya recibe filtros y paginación y los envía al backend correctamente.
