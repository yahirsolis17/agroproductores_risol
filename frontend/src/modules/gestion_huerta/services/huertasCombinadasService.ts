/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { Estado, PaginationMeta } from '../types/shared';

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
  monto_renta?: number;
  monto_renta_palabras?: string;
}

export const huertasCombinadasService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HCFilters = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<{ huertas: RegistroCombinado[]; meta: PaginationMeta }> {
    const pageSize = config.pageSize ?? 10; // fuerza alineación con la tabla
    const params: Record<string, any> = { page, estado, page_size: pageSize };

    if (filters.tipo) params.tipo = filters.tipo;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean;
      notification: any;
      data: { huertas?: RegistroCombinado[]; results?: RegistroCombinado[]; meta: PaginationMeta };
    }>('/huerta/huertas-combinadas/combinadas/', { params, signal: config.signal });

    const raw = data.data;
    const list = raw.results ?? raw.huertas ?? [];
    return { huertas: list, meta: raw.meta };
  },
};
