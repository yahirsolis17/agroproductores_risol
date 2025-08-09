// ============================================================================
// src/modules/gestion_huerta/types/inversionTypes.ts
// ============================================================================

/** Registro que devuelve el backend */
export interface InversionHuerta {
  id:               number;
  fecha:            string;        // YYYY-MM-DD
  descripcion?:     string | null;
  gastos_insumos:   number;
  gastos_mano_obra: number;
  gastos_totales:   number;        // ← calculado

  categoria: number;               // FK (read-only en API)
  cosecha:   number;               // FK (read-only)
  temporada: number;               // FK (read-only)
  huerta?:          number | null; // FK (read-only; propia)
  huerta_rentada?:  number | null; // FK (read-only; rentada)

  is_active:   boolean;
  archivado_en?: string | null;
}

/** Payload para crear (POST) */
export interface InversionHuertaCreateData {
  fecha:            string;        // YYYY-MM-DD
  descripcion?:     string;
  gastos_insumos:   number;
  gastos_mano_obra: number;
  categoria:        number;        // ID de categoría
  cosecha?:         number;        // opcional (el service usa el contexto)
}

/** Payload para actualizar (PATCH) */
export interface InversionHuertaUpdateData extends Partial<InversionHuertaCreateData> {}

export type InversionCreateData = InversionHuertaCreateData;
export type InversionUpdateData = InversionHuertaUpdateData;