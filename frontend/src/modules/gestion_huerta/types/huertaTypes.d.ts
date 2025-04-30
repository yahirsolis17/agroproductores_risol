import { Propietario } from './propietarioTypes';

export interface Huerta {
  id: number;
  nombre: string;
  ubicacion: string;
  variedades: string;
  historial?: string | null;
  hectareas: number;
  propietario: number;
  propietario_detalle?: Propietario;
  is_active: boolean;              // true = activa, false = archivada
  archivado_en?: string | null;
}

export interface HuertaCreateData {
  nombre: string;
  ubicacion: string;
  variedades: string;
  historial?: string;
  hectareas: number;
  propietario: number;
}

export interface HuertaUpdateData {
  nombre?: string;
  ubicacion?: string;
  variedades?: string;
  historial?: string;
  hectareas?: number;
  propietario?: number;
}
