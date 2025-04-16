// src/modules/gestion_huerta/types/ventaTypes.d.ts

export interface Venta {
    id: number;
    cosecha: number; // ID de la cosecha
    fecha_venta: string; // "2023-01-01"
    num_cajas: number;
    precio_por_caja: number;
    tipo_mango: string;
    descripcion?: string;
    gasto: number; // entero
    total_venta?: number; // calculado
    ganancia_neta?: number; // calculado
  }
  
  export interface VentaCreateData {
    cosecha: number;
    fecha_venta: string;
    num_cajas: number;
    precio_por_caja: number;
    tipo_mango: string;
    descripcion?: string;
    gasto: number;
  }
  
  export interface VentaUpdateData extends Partial<VentaCreateData> {
    // Todos opcionales
  }
  