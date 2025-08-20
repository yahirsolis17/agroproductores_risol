// src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts
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
  propietario_archivado?: boolean; // ← reflejo del serializer

  monto_renta: number;
  monto_renta_palabras?: string;

  is_active: boolean;
  archivado_en?: string | null;
}

export interface HuertaRentadaCreateData {
  nombre: string;
  ubicacion: string;
  variedades: string;
  historial?: string;
  hectareas: number;
  propietario: number;
  monto_renta: number;
}

export interface HuertaRentadaUpdateData extends Partial<HuertaRentadaCreateData> {}
