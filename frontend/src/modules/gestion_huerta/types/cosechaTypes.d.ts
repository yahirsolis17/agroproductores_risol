// src/modules/gestion_huerta/types/cosechaTypes.d.ts

export interface Cosecha {
    id: number;
    nombre: string;
    fecha_creacion: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    finalizada: boolean;
    huerta: number | null;
    huerta_rentada: number | null;
    ventas_totales?: number;
    gastos_totales?: number;
    margen_ganancia?: number;
    is_rentada?: boolean;
  }
  
  export interface CosechaCreateData {
    nombre: string;
    huerta?: number; // si es huerta propia
    huerta_rentada?: number; // si es rentada
    fecha_inicio?: string;
    fecha_fin?: string;
    finalizada?: boolean;
  }
  
  export interface CosechaUpdateData {
    nombre?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    finalizada?: boolean;
  }
  