// src/modules/gestion_huerta/types/inversionTypes.d.ts

export interface InversionHuerta {
    id: number;
    nombre: string;
    fecha: string; // "2023-01-01"
    descripcion?: string;
    gastos_insumos: string; // decimal en string
    gastos_mano_obra: string; // decimal en string
    categoria_id: number;
    cosecha_id: number;
    huerta_id: number;
    monto_total?: number;
    categoria?: { id: number; nombre: string };
  }
  
  export interface InversionCreateData {
    nombre: string;
    fecha: string;
    descripcion?: string;
    gastos_insumos: string;
    gastos_mano_obra: string;
    categoria_id: number;
    cosecha_id: number;
    huerta_id: number;
  }
  
  export interface InversionUpdateData extends Partial<InversionCreateData> {
    // Todos opcionales
  }
  