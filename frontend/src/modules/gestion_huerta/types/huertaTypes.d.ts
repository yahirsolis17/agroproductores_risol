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
