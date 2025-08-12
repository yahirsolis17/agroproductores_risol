/* ══════════════════════════════════════════════════════════════
   TYPES · Ventas
   ══════════════════════════════════════════════════════════════ */

export interface VentaHuerta {
  id:              number;
  fecha_venta:     string;        // YYYY-MM-DD (local)
  tipo_mango:      string;
  descripcion?:    string | null;

  num_cajas:       number;        // entero
  precio_por_caja: number;        // entero (sin decimales)
  gasto:           number;        // entero (sin decimales, puede ser 0)

  total_venta:     number;        // calculado
  ganancia_neta:   number;        // calculado

  cosecha:   number;              // FK
  temporada: number;              // FK
  huerta?:   number | null;       // FK (según origen)
  huerta_rentada?: number | null; // FK (según origen)

  is_active:    boolean;
  archivado_en?: string | null;
}

/** Payload para crear (POST) — el service inyecta *_id vía contexto */
export interface VentaCreateData {
  fecha_venta:     string;        // YYYY-MM-DD
  tipo_mango:      string;
  descripcion?:    string;
  num_cajas:       number;
  precio_por_caja: number;
  gasto:           number;
}

/** Payload para actualizar (PATCH) */
export interface VentaUpdateData extends Partial<VentaCreateData> {}

/* Aliases por consistencia en imports */
export type VentaHuertaCreateData = VentaCreateData;
export type VentaHuertaUpdateData = VentaUpdateData;
