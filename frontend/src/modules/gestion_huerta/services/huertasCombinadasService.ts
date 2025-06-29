/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';

/** Estado para filtrar en servidor */
export type Estado = 'activos' | 'archivados' | 'todos';

/** Filtros para la vista combinada */
export interface HCFilters {
  tipo?: '' | 'propia' | 'rentada';
  nombre?: string;
  propietario?: number;
}

export interface PropietarioDetalle {
  id: number;
  nombre: string;
  apellidos: string;
  telefono: string;
  direccion: string;
  archivado_en: string | null;
  is_active: boolean;
}

export interface RegistroCombinado {
  id: number;
  nombre: string;
  ubicacion: string;
  variedades: string;
  historial: string | null;
  hectareas: number;
  propietario: number;
  propietario_detalle: PropietarioDetalle;
  propietario_archivado: boolean;
  is_active: boolean;
  archivado_en: string | null;
  tipo: 'propia' | 'rentada';
  monto_renta: number;
  monto_renta_palabras?: string;
}

interface ListResp {
  huertas: RegistroCombinado[];
  meta: { count: number; next: string | null; previous: string | null };
}

/** Servicio para consultar huertas propias + rentadas en un solo endpoint */
export const huertasCombinadasService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HCFilters = {}
  ): Promise<ListResp> {
    // 👉 enviamos `estado` directamente, no `archivado`
    const params: Record<string, any> = { page, page_size: 10, estado };

    if (filters.tipo)        params.tipo        = filters.tipo;
    if (filters.nombre)      params.nombre      = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean;
      notification: any;
      data: {
        huertas: RegistroCombinado[];
        meta:    { count: number; next: string | null; previous: string | null };
      };
    }>('/huerta/huertas-combinadas/combinadas/', { params });

    return {
      huertas: data.data.huertas,
      meta:    data.data.meta,
    };
  },
};