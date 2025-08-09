/* ══════════════════════════════════════════════════════════════
   TYPES · Inversiones
   ══════════════════════════════════════════════════════════════ */

export interface InversionHuerta {
  id:               number;
  fecha:            string;        // YYYY-MM-DD (local)
  descripcion?:     string | null;
  gastos_insumos:   number;
  gastos_mano_obra: number;
  gastos_totales:   number;        // calculado

  categoria: number;               // FK
  cosecha:   number;               // FK
  temporada: number;               // FK
  huerta?:   number | null;        // FK (según origen)
  huerta_rentada?: number | null;  // FK (según origen)

  is_active:   boolean;
  archivado_en?: string | null;
}

/** Payload para crear (POST) — el service inyecta *_id faltantes */
export interface InversionHuertaCreateData {
  fecha:            string;        // YYYY-MM-DD
  descripcion?:     string;
  gastos_insumos:   number;
  gastos_mano_obra: number;
  categoria:        number;        // FK
  cosecha:          number;        // FK (el form lo seta al abrir)
}

/** Payload para actualizar (PATCH) */
export interface InversionHuertaUpdateData
  extends Partial<InversionHuertaCreateData> {}

/* Aliases para no romper imports de los formularios */
export type InversionCreateData = InversionHuertaCreateData;
export type InversionUpdateData = InversionHuertaUpdateData;
