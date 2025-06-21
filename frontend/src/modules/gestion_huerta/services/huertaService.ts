/* --------------------------------------------------------------------------
 *  src/modules/gestion_huerta/services/huertaService.ts
 *  Misma filosofía que propietarioService:
 *    • page + estado + filtros backend (nombre, propietario)
 * -------------------------------------------------------------------------- */
import apiClient from '../../../global/api/apiClient';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../types/huertaTypes';

/* ───────── Tipos ───────── */
export type Estado = 'activos' | 'archivados' | 'todos';
export interface HuertaFilters { nombre?:string; propietario?:number; }

interface ListResp {
  huertas: Huerta[];
  meta: { count:number; next:string|null; previous:string|null };
}
interface ItemWrapper { huerta: Huerta; }

/* helper → estado ➜ query param “archivado” */
const estadoToQuery = (estado:Estado) =>
  estado === 'todos' ? undefined : (estado === 'activos' ? 'false' : 'true');

/* --------------------------------------------------------------------------
 *  API
 * -------------------------------------------------------------------------- */
export const huertaService = {
  /* ------------ LIST ------------ */
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HuertaFilters = {}
  ) {
    const params: Record<string, any> = { page };
    const arch = estadoToQuery(estado);
    if (arch !== undefined) params.archivado = arch;

    if (filters.nombre)      params.nombre      = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean; message_key: string; data: ListResp;
    }>('/huerta/huertas/', { params });

    return data.data;         // { huertas, meta }
  },

  /* ------------ CREATE ------------ */
  async create(payload: HuertaCreateData) {
    const { data } = await apiClient.post<{
      success:boolean; message_key:string; data:ItemWrapper;
    }>('/huerta/huertas/', payload);
    return data;
  },

  /* ------------ UPDATE ------------ */
  async update(id:number, payload:HuertaUpdateData) {
    const { data } = await apiClient.put<{
      success:boolean; message_key:string; data:ItemWrapper;
    }>(`/huerta/huertas/${id}/`, payload);
    return data;
  },

  /* ------------ DELETE ------------ */
  async delete(id:number) {
    const { data } = await apiClient.delete<{
      success:boolean; message_key:string; data:{info:string};
    }>(`/huerta/huertas/${id}/`);
    return data;
  },

  /* ------------ ARCHIVAR / RESTAURAR ------------ */
  async archivar(id:number) {
    const { data } = await apiClient.post<{
      success:boolean; message_key:string; data:{huerta_id:number};
    }>(`/huerta/huertas/${id}/archivar/`);
    return data;
  },
  async restaurar(id:number) {
    const { data } = await apiClient.post<{
      success:boolean; message_key:string; data:{huerta_id:number};
    }>(`/huerta/huertas/${id}/restaurar/`);
    return data;
  },
};
// No cambios necesarios, el servicio ya recibe filtros y paginación y los envía al backend correctamente.
