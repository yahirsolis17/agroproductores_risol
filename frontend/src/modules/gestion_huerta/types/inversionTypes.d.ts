/* ══════════════════════════════════════════════════════════════
   TYPES · Inversiones
   ══════════════════════════════════════════════════════════════ */

/** Registro que devuelve el backend */
export interface InversionHuerta {
  id:               number;
  fecha:            string;        // YYYY-MM-DD
  descripcion?:     string | null;
  gastos_insumos:   number;
  gastos_mano_obra: number;
  gastos_totales:   number;        // ← calculado

  categoria: number;               // FK
  cosecha:   number;               // FK (para URL)
  temporada: number;
  huerta:    number;

  is_active:   boolean;
  archivado_en?: string | null;
}

/** Payload para crear (POST) */
export interface InversionHuertaCreateData {
  fecha:            string;        // YYYY-MM-DD
  descripcion?:     string;
  gastos_insumos:   number;
  gastos_mano_obra: number;
  categoria:        number;        // FK
  cosecha:          number;        // FK
}

/** Payload para actualizar (PATCH) */
export interface InversionHuertaUpdateData
  extends Partial<InversionHuertaCreateData> {}

/* Aliases para no romper imports de los formularios */
export type InversionCreateData = InversionHuertaCreateData;
export type InversionUpdateData = InversionHuertaUpdateData;
