import { Propietario } from './propietarioTypes';

export interface HuertaRentada {
  id: number;
  nombre: string;
  ubicacion: string;
  variedades: string;
  historial?: string | null;
  hectareas: number;
  propietario: number;
  propietario_detalle?: Propietario;
  monto_renta: string;
  monto_renta_palabras?: string;
}

export interface HuertaRentadaCreateData {
  nombre: string;
  ubicacion: string;
  variedades: string;
  historial?: string;
  hectareas: number;
  propietario: number;
  monto_renta: string;
}

export interface HuertaRentadaUpdateData {
  nombre?: string;
  ubicacion?: string;
  variedades?: string;
  historial?: string;
  hectareas?: number;
  propietario?: number;
  monto_renta?: string;
}
