export interface Venta {
  id: number;
  cosecha: number;      // id
  huerta: number;       // id
  temporada: number;    // id
  fecha_venta: string;  // ISO
  num_cajas: number;
  precio_por_caja: number;
  tipo_mango: string;
  descripcion?: string | null;
  gasto: number;

  // Estado
  is_active: boolean;
  archivado_en?: string | null;

  // Derivados (opcionales, si el BE los calcula):
  total_venta?: number;
  ganancia_neta?: number;
}

export interface VentaCreate {
  cosecha: number;        // id (el BE lo nombró "cosecha" en el serializer)
  huerta_id: number;      // requerido por BE
  temporada_id: number;   // requerido por BE
  fecha_venta: string;    // ISO
  num_cajas: number;
  precio_por_caja: number;
  tipo_mango: string;
  descripcion?: string | null;
  gasto: number;
}

export interface VentaUpdate {
  fecha_venta?: string;    
  num_cajas?: number;
  precio_por_caja?: number;
  tipo_mango?: string;
  descripcion?: string | null;
  gasto?: number;
}
