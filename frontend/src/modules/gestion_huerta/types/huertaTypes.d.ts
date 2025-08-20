// src/modules/gestion_huerta/types/huertaTypes.d.ts
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
  propietario_archivado?: boolean; // ← reflejo del serializer

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

export interface HuertaUpdateData extends Partial<HuertaCreateData> {}
