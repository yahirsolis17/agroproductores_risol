/* ══════════════════════════════════════════════════════════════
   TYPES · Ventas
   ══════════════════════════════════════════════════════════════ */

export interface VentaHuerta {
  id:               number;
  fecha_venta:      string;        // YYYY-MM-DD
  num_cajas:        number;
  precio_por_caja:  number;
  tipo_mango:       string;
  descripcion?:     string | null;
  gasto:            number;

  total_venta:      number;        // ← calculado backend
  ganancia_neta:    number;        // ← calculado backend

  cosecha:   number;
  temporada: number;
  huerta:    number;

  is_active:  boolean;
  archivado_en?: string | null;
}

/** POST */
export interface VentaHuertaCreateData {
  fecha_venta:     string;
  num_cajas:       number;
  precio_por_caja: number;
  tipo_mango:      string;
  descripcion?:    string;
  gasto:           number;
  cosecha:         number;
}

/** PATCH */
export interface VentaHuertaUpdateData
  extends Partial<VentaHuertaCreateData> {}

/* Aliases para los formularios */
export type VentaCreateData = VentaHuertaCreateData;
export type VentaUpdateData = VentaHuertaUpdateData;
