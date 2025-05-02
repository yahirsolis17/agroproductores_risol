// src/modules/gestion_huerta/types/huertaRentadaTypes.ts
import { Propietario } from './propietarioTypes';

/* ══════════════════════════════════════════════════════════════
   Modelo base para Huerta Rentada (idéntico a Huerta + campo renta)
   ══════════════════════════════════════════════════════════════ */
export interface HuertaRentada {
  id: number;
  nombre: string;
  ubicacion: string;
  variedades: string;
  historial?: string | null;
  hectareas: number;
  propietario: number;
  propietario_detalle?: Propietario;

  monto_renta: number;
  monto_renta_palabras?: string;

  is_active: boolean;
  archivado_en?: string | null;
}

/* ══════════════════════════════════════════════════════════════
   Payloads para operaciones CRUD (exactamente como en huertaTypes)
   ══════════════════════════════════════════════════════════════ */
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
